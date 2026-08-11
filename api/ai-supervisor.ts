import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = 'gemini-3.5-flash-lite';

interface FlagInput {
  orderId: string;
  orderNo: string;
  type: 'amount_variance' | 'missing_photos';
  detail: string;
}

/**
 * Rule-based detection already happened client-side (workflowSupervisor.ts).
 * This endpoint's only job is to turn structured flags into a short, readable
 * summary a manager can scan quickly — it does not decide what counts as
 * anomalous, and it never sees raw order data beyond what's in the flags.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { flags } = req.body as { flags?: FlagInput[] };
  if (!flags || !Array.isArray(flags)) {
    return res.status(400).json({ error: 'flags array is required' });
  }

  if (flags.length === 0) {
    return res.status(200).json({ summary: 'No issues detected.' });
  }

  try {
    const interaction = await ai.interactions.create({
      model: MODEL,
      system_instruction:
        'You summarize flagged order-review issues for an operations manager. ' +
        'Given a JSON list of flags, write one short line per flag, grouped naturally. ' +
        'Be direct and factual — no speculation about cause, just state what was detected. ' +
        'Do not invent flags beyond what is given. ' +
        'Format as plain text only — no Markdown (no **, no bullet asterisks). Use line breaks and dashes ("-") for lists instead.',
      input: JSON.stringify(flags),
    });

    return res.status(200).json({ summary: interaction.output_text ?? '' });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err instanceof Error ? err.message : 'Something went wrong.' });
  }
}
