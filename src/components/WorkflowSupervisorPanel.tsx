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
    <section className="rounded-lg border border-amber-800 bg-amber-950/30 p-4">
      <h2 className="text-lg font-semibold text-amber-200 mb-1">
        ⚠ Flagged ({flags.length})
      </h2>
      <p className="text-xs text-amber-400/70 mb-3">
        Rule-based checks (amount variance ≥30% over quote, or no photos on a completed job) —
        AI is used only to phrase the summary below, not to decide what's flagged.
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-amber-300/70 mb-2">
          <Spinner className="text-amber-400" />
          <span>Summarizing flags…</span>
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {summary && (
        <p className="text-sm text-amber-100 whitespace-pre-wrap mb-3">{summary}</p>
      )}

      <ul className="space-y-1 text-xs text-amber-400/80">
        {flags.map((f, i) => (
          <li key={i}>
            {f.orderNo} — {f.detail}
          </li>
        ))}
      </ul>
    </section>
  );
}
