import { useEffect, useState } from 'react';
import type { Order } from '../types/order';
import { detectAnomalies, type Flag } from '../lib/workflowSupervisor';
import { stripMarkdown } from '../lib/formatAnswer';
import Spinner from './Spinner';

export default function WorkflowSupervisorPanel({ orders }: { orders: Order[] }) {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detected = detectAnomalies(orders);
    setFlags(detected);
    setSummary(null);

    if (detected.length === 0) return;

    setLoading(true);
    setError(null);
    fetch('/api/ai-supervisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flags: detected }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Request failed');
        setSummary(stripMarkdown(data.summary));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to summarize flags'))
      .finally(() => setLoading(false));
  }, [orders]);

  if (flags.length === 0) return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-md p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200 rounded-full blur-3xl opacity-40 -mr-16 -mt-16 pointer-events-none"></div>
      <h2 className="text-xl font-bold text-amber-800 mb-2 flex items-center gap-2 relative">
        <span className="bg-amber-200 text-amber-700 p-1.5 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </span>
        Flagged ({flags.length})
      </h2>
      <p className="text-sm text-amber-800 mb-4 bg-amber-100/50 p-3 rounded-xl border border-amber-200/50 relative">
        <span className="font-semibold">Rule-based checks</span> (amount variance ≥30% over quote, or no photos on a completed job) —
        AI is used only to phrase the summary below, not to decide what's flagged.
      </p>

      {loading && (
        <div className="flex items-center gap-3 text-sm text-amber-700 font-medium mb-3 bg-white/50 p-3 rounded-xl">
          <Spinner className="text-amber-500" />
          <span>Summarizing flags…</span>
        </div>
      )}
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}
      {summary && (
        <div className="text-sm text-amber-900 font-medium whitespace-pre-wrap mb-4 bg-white/60 p-4 rounded-xl border border-amber-200/50 shadow-sm relative">
          <div className="flex items-center gap-2 mb-2 text-amber-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span className="font-bold">AI Summary</span>
          </div>
          <div className="max-h-40 overflow-y-auto pr-1">
            {summary}
          </div>
        </div>
      )}

      <ul className="space-y-2 text-sm text-amber-800 font-medium relative max-h-64 overflow-y-auto pr-2">
        {flags.map((f, i) => (
          <li key={i} className="flex items-start gap-2 bg-white/40 p-2.5 rounded-lg border border-amber-200/30">
            <span className="text-amber-500 mt-0.5">•</span>
            <span><strong className="text-amber-900">{f.orderNo}</strong> — {f.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
