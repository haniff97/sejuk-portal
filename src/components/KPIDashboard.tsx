import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Order } from '../types/order';
import { computeTechnicianStats, startOfWeek } from '../lib/kpi';

type Range = 'week' | 'all';

export default function KPIDashboard({ orders }: { orders: Order[] }) {
  const [range, setRange] = useState<Range>('week');

  const stats = useMemo(
    () => computeTechnicianStats(orders, range === 'week' ? startOfWeek() : undefined),
    [orders, range],
  );

  const totalJobs = stats.reduce((sum, s) => sum + s.jobsCompleted, 0);
  const totalAmount = stats.reduce((sum, s) => sum + s.totalAmount, 0);
  const topTechnician = stats[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">KPI Dashboard</h1>
        <div className="flex rounded-md border border-slate-700 overflow-hidden text-sm">
          <button
            onClick={() => setRange('week')}
            className={`px-3 py-1.5 ${range === 'week' ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400'}`}
          >
            This Week
          </button>
          <button
            onClick={() => setRange('all')}
            className={`px-3 py-1.5 ${range === 'all' ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400'}`}
          >
            All Time
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500 -mt-4">
        Metrics: Jobs Completed and Total Amount, per the brief. "Postpone/Reschedule" is
        omitted — not a concept this system's order lifecycle currently tracks.
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-800 p-4">
          <div className="text-xs text-slate-500 mb-1">Total Jobs Completed</div>
          <div className="text-2xl font-semibold">{totalJobs}</div>
        </div>
        <div className="rounded-lg border border-slate-800 p-4">
          <div className="text-xs text-slate-500 mb-1">Total Amount</div>
          <div className="text-2xl font-semibold">RM {totalAmount.toFixed(2)}</div>
        </div>
        <div className="rounded-lg border border-slate-800 p-4">
          <div className="text-xs text-slate-500 mb-1">Top Technician</div>
          <div className="text-2xl font-semibold">{topTechnician?.technician ?? '—'}</div>
        </div>
      </div>

      {/* Chart */}
      {stats.length > 0 && (
        <div className="rounded-lg border border-slate-800 p-4">
          <h2 className="text-sm font-medium text-slate-400 mb-3">Jobs Completed by Technician</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="technician" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="jobsCompleted" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Leaderboard */}
      <div className="rounded-lg border border-slate-800 p-4">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Leaderboard</h2>
        {stats.length === 0 && (
          <p className="text-sm text-slate-500">No completed jobs in this range yet.</p>
        )}
        <ul className="space-y-2">
          {stats.map((s, i) => (
            <li
              key={s.technician}
              className="flex items-center justify-between rounded-md border border-slate-800 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-slate-500 text-sm w-5">#{i + 1}</span>
                <span className="font-medium">{s.technician}</span>
              </div>
              <div className="text-sm text-slate-400">
                {s.jobsCompleted} job{s.jobsCompleted !== 1 ? 's' : ''} · RM {s.totalAmount.toFixed(2)}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
