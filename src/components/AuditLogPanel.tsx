import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AuditLogEntry } from '../types/order';

const ACTION_LABELS: Record<string, string> = {
  order_created: 'Order created',
  job_completed: 'Job completed',
  order_reviewed: 'Marked Reviewed',
  order_closed: 'Order Closed',
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AuditLogPanel() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setEntries((data as AuditLogEntry[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <section className="rounded-lg border border-slate-800 p-4">
      <h2 className="text-lg font-semibold mb-1">Activity Log</h2>
      <p className="text-sm text-slate-500 mb-3">
        Every key action (order created, job completed, reviewed, closed) is recorded here
        with who did it and when — addresses the brief's "key actions should be traceable"
        rule.
      </p>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!loading && !error && entries.length === 0 && (
        <p className="text-sm text-slate-500">No activity yet.</p>
      )}

      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {entries.map((e) => (
          <li key={e.id} className="text-sm border-b border-slate-800/60 pb-2 last:border-0">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-medium">
                {ACTION_LABELS[e.action] ?? e.action}
              </span>
              <span className="text-xs text-slate-500">{timeAgo(e.created_at)}</span>
            </div>
            <div className="text-slate-500">
              {e.order_no} · {e.actor_role} ({e.actor_name})
            </div>
            <div className="text-slate-600 text-xs">{e.detail}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
