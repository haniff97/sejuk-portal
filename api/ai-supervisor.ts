import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

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

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing in the environment variables.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                `Write a plain-text summary of the following flagged order issues for the manager. ` +
                `Output the summary immediately with no preamble:\n\n${JSON.stringify(flags, null, 2)}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction:
          'You are a report formatter for an aircon service operations manager. ' +
          'Your ONLY job is to immediately write a short plain-text summary of the flagged issues provided. ' +
          'Do NOT ask questions. Do NOT offer options. Do NOT explain what you could do. ' +
          'Just write the summary directly — one short sentence per flag, grouped by order. ' +
          'Be factual and direct. Do not invent anything beyond the flags given. ' +
          'Format as plain text only — no Markdown, no **, no #, no bullet asterisks. ' +
          'Use dashes ("-") and line breaks for lists.',
      },
    });

    const summary = response.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim() ?? '';
    return res.status(200).json({ summary });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err instanceof Error ? err.message : 'Something went wrong.' });
  }
}
