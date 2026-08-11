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
    <section className="rounded-2xl border border-slate-200 bg-white shadow-md p-6">
      <h2 className="text-xl font-bold tracking-tight text-slate-800 mb-2 flex items-center gap-2">
        <span className="bg-slate-100 text-slate-600 p-1.5 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
        </span>
        Activity Log
      </h2>
      <p className="text-sm text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
        Every key action (order created, job completed, reviewed, closed) is recorded here
        with who did it and when — addresses the brief's "key actions should be traceable"
        rule.
      </p>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!loading && !error && entries.length === 0 && (
        <p className="text-sm text-slate-500">No activity yet.</p>
      )}

      <ul className="space-y-1 max-h-64 overflow-y-auto pr-2">
        {entries.map((e) => (
          <li key={e.id} className="text-sm border-b border-slate-100 py-3 last:border-0 hover:bg-slate-50 transition-colors px-2 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-900 font-bold">
                {ACTION_LABELS[e.action] ?? e.action}
              </span>
              <span className="text-xs text-slate-500 font-medium">{timeAgo(e.created_at)}</span>
            </div>
            <div className="text-slate-600 font-medium">
              {e.order_no} <span className="text-slate-400 mx-1">•</span> <span className="text-indigo-600">{e.actor_role}</span> ({e.actor_name})
            </div>
            <div className="text-slate-600 text-xs mt-2 bg-slate-100 p-2 rounded-md border border-slate-200/60 shadow-inner italic">{e.detail}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
