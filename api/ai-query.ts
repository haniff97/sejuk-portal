import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_ANON_KEY as string,
);

// gemini-3.5-flash-lite: cheapest tier that still handles function calling
// reliably. Swap to gemini-2.5-flash for stronger reasoning at a higher cost.
const MODEL = 'gemini-3.5-flash-lite';

// Fixed, controlled query surface. The model can only call these — it never
// gets raw SQL or direct table access.
const tools = [
  {
    functionDeclarations: [
      {
        name: 'query_jobs',
        description:
          'List jobs matching optional filters: technician name, status, and/or a date range (based on updated_at). Use this for questions asking "what jobs" or "which orders".',
        parameters: {
          type: Type.OBJECT,
          properties: {
            technician: { type: Type.STRING, description: 'e.g. Ali, John, Bala, Yusoff' },
            status: {
              type: Type.STRING,
              enum: ['New', 'Assigned', 'In Progress', 'Job Done', 'Reviewed', 'Closed'],
            },
            since: { type: Type.STRING, description: 'ISO date, inclusive lower bound on updated_at' },
            until: { type: Type.STRING, description: 'ISO date, inclusive upper bound on updated_at' },
          },
        },
      },
      {
        name: 'count_jobs_by_technician',
        description:
          'Count jobs per technician within an optional date range and status. Use this for "who completed the most" or "how many jobs" style questions.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            status: {
              type: Type.STRING,
              enum: ['New', 'Assigned', 'In Progress', 'Job Done', 'Reviewed', 'Closed'],
            },
            since: { type: Type.STRING, description: 'ISO date, inclusive lower bound on updated_at' },
            until: { type: Type.STRING, description: 'ISO date, inclusive upper bound on updated_at' },
          },
        },
      },
    ],
  },
];

async function runQueryJobs(input: {
  technician?: string;
  status?: string;
  since?: string;
  until?: string;
}) {
  let query = supabase
    .from('orders')
    .select('order_no, customer_name, service_type, status, assigned_technician, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (input.technician) query = query.eq('assigned_technician', input.technician);
  if (input.status) query = query.eq('status', input.status);
  if (input.since) query = query.gte('updated_at', input.since);
  if (input.until) query = query.lte('updated_at', input.until);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

async function runCountJobsByTechnician(input: {
  status?: string;
  since?: string;
  until?: string;
}) {
  let query = supabase.from('orders').select('assigned_technician, status, updated_at');
  if (input.status) query = query.eq('status', input.status);
  if (input.since) query = query.gte('updated_at', input.since);
  if (input.until) query = query.lte('updated_at', input.until);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const tech = row.assigned_technician ?? 'Unassigned';
    counts[tech] = (counts[tech] ?? 0) + 1;
  }
  return counts;
}

async function executeTool(name: string, args: Record<string, unknown>) {
  if (name === 'query_jobs') return runQueryJobs(args as Parameters<typeof runQueryJobs>[0]);
  if (name === 'count_jobs_by_technician') return runCountJobsByTechnician(args as Parameters<typeof runCountJobsByTechnician>[0]);
  throw new Error(`Unknown tool: ${name}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question } = req.body as { question?: string };
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing in the environment variables.' });
  }

  const today = new Date().toISOString().slice(0, 10);
  const systemInstruction = `You are an operations assistant for an aircon service company.
Today's date is ${today}. "This week" means the last 7 days; "today" means the current calendar date.
Answer questions using ONLY the query_jobs and count_jobs_by_technician tools — never invent data.
If the tools return no matching data, say so plainly rather than guessing.
Keep answers concise and concrete (list order numbers/services where relevant, per the brief's example output format).
Format your answer as plain text only — no Markdown (no **, no #, no bullet asterisks). Use line breaks and dashes ("-") for lists instead, since the UI displays raw text.`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Build the conversation history for multi-turn tool use
    const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [
      { role: 'user', parts: [{ text: question }] },
    ];

    let rounds = 0;
    let finalAnswer = '';

    // Tool-use loop: keep executing controlled queries until the model responds
    // in plain text. Bounded to avoid runaway calls.
    while (rounds < 5) {
      const response = await ai.models.generateContent({
        model: MODEL,
        systemInstruction,
        contents,
        tools,
      });

      const candidate = response.candidates?.[0];
      if (!candidate) break;

      const parts = candidate.content?.parts ?? [];
      const functionCallParts = parts.filter((p) => p.functionCall);

      // No tool calls — model gave a text answer
      if (functionCallParts.length === 0) {
        finalAnswer = parts.map((p) => p.text ?? '').join('').trim();
        break;
      }

      rounds++;

      // Add model's tool-call turn to history
      contents.push({ role: 'model', parts: parts as Array<Record<string, unknown>> });

      // Execute all tool calls and collect results
      const toolResponseParts: Array<Record<string, unknown>> = [];
      for (const part of functionCallParts) {
        const { name, args } = part.functionCall as { name: string; args: Record<string, unknown> };
        try {
          const result = await executeTool(name, args ?? {});
          toolResponseParts.push({
            functionResponse: {
              name,
              response: { output: JSON.stringify(result) },
            },
          });
        } catch (err) {
          toolResponseParts.push({
            functionResponse: {
              name,
              response: { error: err instanceof Error ? err.message : 'query failed' },
            },
          });
        }
      }

      // Add tool results to history for next turn
      contents.push({ role: 'user', parts: toolResponseParts });
    }

    return res.status(200).json({ answer: finalAnswer || "I couldn't find an answer to that." });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err instanceof Error ? err.message : 'Something went wrong.' });
  }
}
