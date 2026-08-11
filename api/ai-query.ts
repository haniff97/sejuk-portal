import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_ANON_KEY as string,
);

// gemini-2.5-flash-lite: cheapest tier that still handles function calling
// reliably. Swap to gemini-2.5-flash (or a gemini-3.x flash variant) for
// stronger reasoning at a higher cost per call.
const MODEL = 'gemini-3.5-flash-lite';

// Fixed, controlled query surface. The model can only call these — it never
// gets raw SQL or direct table access. This is what "AI responses based on
// structured data retrieved through controlled queries" (per the brief)
// means in practice: the model picks *which* pre-defined query fits the
// question and *what parameters* to use, but not the query shape itself.
const tools = [
  {
    type: 'function' as const,
    name: 'query_jobs',
    description:
      'List jobs matching optional filters: technician name, status, and/or a date range (based on updated_at). Use this for questions asking "what jobs" or "which orders".',
    parameters: {
      type: 'object',
      properties: {
        technician: { type: 'string', description: 'e.g. Ali, John, Bala, Yusoff' },
        status: {
          type: 'string',
          enum: ['New', 'Assigned', 'In Progress', 'Job Done', 'Reviewed', 'Closed'],
        },
        since: { type: 'string', description: 'ISO date, inclusive lower bound on updated_at' },
        until: { type: 'string', description: 'ISO date, inclusive upper bound on updated_at' },
      },
    },
  },
  {
    type: 'function' as const,
    name: 'count_jobs_by_technician',
    description:
      'Count jobs per technician within an optional date range and status. Use this for "who completed the most" or "how many jobs" style questions.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['New', 'Assigned', 'In Progress', 'Job Done', 'Reviewed', 'Closed'],
        },
        since: { type: 'string', description: 'ISO date, inclusive lower bound on updated_at' },
        until: { type: 'string', description: 'ISO date, inclusive upper bound on updated_at' },
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

async function executeTool(name: string, input: Record<string, unknown>) {
  if (name === 'query_jobs') return runQueryJobs(input);
  if (name === 'count_jobs_by_technician') return runCountJobsByTechnician(input);
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

  const today = new Date().toISOString().slice(0, 10);
  const systemInstruction = `You are an operations assistant for an aircon service company.
Today's date is ${today}. "This week" means the last 7 days; "today" means the current calendar date.
Answer questions using ONLY the query_jobs and count_jobs_by_technician tools — never invent data.
If the tools return no matching data, say so plainly rather than guessing.
Keep answers concise and concrete (list order numbers/services where relevant, per the brief's example output format).
Format your answer as plain text only — no Markdown (no **, no #, no bullet asterisks). Use line breaks and dashes ("-") for lists instead, since the UI displays raw text.`;

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is missing in the environment variables.');
    }
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let interaction = await ai.interactions.create({
      model: MODEL,
      input: question,
      system_instruction: systemInstruction,
      tools,
    });

    // Tool-use loop: keep executing controlled queries until the model has
    // enough to answer in plain text. Bounded to a few rounds to avoid
    // runaway calls.
    let rounds = 0;
    while (rounds < 4) {
      const functionCallSteps = interaction.steps.filter(
        (s): s is Extract<typeof s, { type: 'function_call' }> => s.type === 'function_call',
      );
      if (functionCallSteps.length === 0) break;
      rounds++;

      const functionResults = [];
      for (const step of functionCallSteps) {
        try {
          const result = await executeTool(step.name, step.arguments as Record<string, unknown>);
          functionResults.push({
            type: 'function_result' as const,
            name: step.name,
            call_id: step.id,
            result: JSON.stringify(result),
          });
        } catch (err) {
          functionResults.push({
            type: 'function_result' as const,
            name: step.name,
            call_id: step.id,
            result: `Error: ${err instanceof Error ? err.message : 'query failed'}`,
            is_error: true,
          });
        }
      }

      interaction = await ai.interactions.create({
        model: MODEL,
        previous_interaction_id: interaction.id,
        input: functionResults,
        tools,
      });
    }

    return res
      .status(200)
      .json({ answer: interaction.output_text || "I couldn't find an answer to that." });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err instanceof Error ? err.message : 'Something went wrong.' });
  }
}
