import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, FunctionCallingConfigMode, Type } from '@google/genai';

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_ANON_KEY as string,
);

const MODEL = 'gemini-3.5-flash-lite';

// Fixed, controlled query surface — the model can only call these.
const functionDeclarations = [
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
  if (name === 'count_jobs_by_technician')
    return runCountJobsByTechnician(args as Parameters<typeof runCountJobsByTechnician>[0]);
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
    return res
      .status(500)
      .json({ error: 'GEMINI_API_KEY is missing in the environment variables.' });
  }

  const today = new Date().toISOString().slice(0, 10);
  const systemInstruction = `You are an operations data assistant for an aircon service company.
Today's date is ${today}. "This week" means the last 7 days; "today" means the current calendar date.
You have access to two database query tools: query_jobs and count_jobs_by_technician.
You MUST always call a tool first to fetch live data before answering — never answer from memory or training data.
Do NOT ask for more context. Just call the appropriate tool with whatever parameters fit the question.
After receiving tool results, answer concisely in plain text.
If the tool returns no data, say "No matching jobs found." rather than guessing.
Format your final answer as plain text only — no Markdown, no **, no #, no bullet asterisks. Use dashes ("-") and line breaks for lists.`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Conversation history for multi-turn tool use
    const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [
      { role: 'user', parts: [{ text: question }] },
    ];

    let rounds = 0;
    let finalAnswer = '';

    // Tool-use loop — bounded to avoid runaway calls
    while (rounds < 5) {
      // First round: force a tool call (ANY mode) so the model fetches live data.
      // Subsequent rounds: AUTO so it can produce a plain-text final answer.
      const toolConfig =
        rounds === 0
          ? { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } }
          : { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } };

      const response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations }],
          toolConfig,
        },
      });

      const candidate = response.candidates?.[0];
      if (!candidate) break;

      const parts = candidate.content?.parts ?? [];
      const functionCallParts = parts.filter((p) => p.functionCall);

      // No tool calls — model gave a text answer
      if (functionCallParts.length === 0) {
        finalAnswer = parts
          .map((p) => p.text ?? '')
          .join('')
          .trim();
        break;
      }

      rounds++;

      // Add model's tool-call turn to history
      contents.push({ role: 'model', parts: parts as Array<Record<string, unknown>> });

      // Execute all tool calls and collect results
      const toolResponseParts: Array<Record<string, unknown>> = [];
      for (const part of functionCallParts) {
        const { name, args } = part.functionCall as {
          name: string;
          args: Record<string, unknown>;
        };
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

    return res
      .status(200)
      .json({ answer: finalAnswer || "I couldn't find an answer to that." });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err instanceof Error ? err.message : 'Something went wrong.' });
  }
}
