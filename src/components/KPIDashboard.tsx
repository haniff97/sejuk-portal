import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import type { Order } from '../types/order';
import { computeTechnicianStats, computeDailyStats, startOfWeek, startOfMonth } from '../lib/kpi';

type Range = 'week' | 'month' | 'all';

const RANGE_LABELS: Record<Range, string> = {
  week: 'This Week',
  month: 'This Month',
  all: 'All Time',
};

function StatCard({
  label,
  value,
  subValue,
  colorFrom,
  colorTo,
  glowColor,
  icon,
}: {
  label: string;
  value: string;
  subValue?: string;
  colorFrom: string;
  colorTo: string;
  glowColor: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-20 h-20 ${glowColor} rounded-full blur-2xl opacity-40 -mr-6 -mt-6 pointer-events-none group-hover:opacity-60 transition-opacity`} />
      <div className="flex items-start justify-between mb-3 relative">
        <div className="text-xs font-bold tracking-wider uppercase text-slate-500">{label}</div>
        <div className="text-slate-400">{icon}</div>
      </div>
      <div className={`text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${colorFrom} ${colorTo} relative`}>
        {value}
      </div>
      {subValue && <div className="text-xs text-slate-400 mt-1 font-medium relative">{subValue}</div>}
    </div>
  );
}

export default function KPIDashboard({ orders }: { orders: Order[] }) {
  const [range, setRange] = useState<Range>('week');

  const since = useMemo(() => {
    if (range === 'week') return startOfWeek();
    if (range === 'month') return startOfMonth();
    return undefined;
  }, [range]);

  const stats = useMemo(() => computeTechnicianStats(orders, since), [orders, since]);
  const dailyStats = useMemo(() => computeDailyStats(orders, 7), [orders]);

  const totalJobs = stats.reduce((sum, s) => sum + s.jobsCompleted, 0);
  const totalAmount = stats.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalInProgress = stats.reduce((sum, s) => sum + s.inProgress, 0);
  const totalPending = orders.filter((o) => o.status === 'New').length;
  const totalPaymentCollected = stats.reduce((sum, s) => sum + s.paymentCollected, 0);
  const topTechnician = stats[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
          <span className="bg-sky-100 text-sky-600 p-2 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          </span>
          KPI Dashboard
        </h1>
        <div className="flex rounded-xl bg-slate-100 p-1 gap-1 text-sm shadow-inner border border-slate-200">
          {(['week', 'month', 'all'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${range === r ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Jobs Completed"
          value={String(totalJobs)}
          subValue={`${RANGE_LABELS[range]}`}
          colorFrom="from-sky-600"
          colorTo="to-indigo-600"
          glowColor="bg-sky-200"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          }
        />
        <StatCard
          label="Total Revenue"
          value={`RM ${totalAmount.toFixed(2)}`}
          subValue={`Avg RM ${totalJobs > 0 ? (totalAmount / totalJobs).toFixed(2) : '0.00'}/job`}
          colorFrom="from-emerald-500"
          colorTo="to-teal-500"
          glowColor="bg-emerald-200"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          }
        />
        <StatCard
          label="In Progress"
          value={String(totalInProgress)}
          subValue="Active jobs"
          colorFrom="from-amber-500"
          colorTo="to-orange-500"
          glowColor="bg-amber-200"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          }
        />
        <StatCard
          label="Pending / Postponed"
          value={String(totalPending)}
          subValue="New orders, not started"
          colorFrom="from-violet-600"
          colorTo="to-fuchsia-600"
          glowColor="bg-violet-200"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          }
        />
      </div>

      {/* Payment Collected card (if any) */}
      {totalPaymentCollected > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 p-5 text-white shadow-lg shadow-violet-300/30 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold tracking-wider uppercase text-violet-200 mb-1">Cash Collected by Technicians</div>
            <div className="text-3xl font-extrabold">RM {totalPaymentCollected.toFixed(2)}</div>
            <div className="text-xs text-violet-200 mt-1">Sum of on-site payments recorded</div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-200"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs per Technician bar chart */}
        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-6">Jobs Completed by Technician</h2>
          {stats.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm italic">No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats} barSize={40}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="technician" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={8} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} dx={-6} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)' }}
                  labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                  itemStyle={{ color: '#4f46e5' }}
                  formatter={(v: number) => [`${v} jobs`, 'Completed']}
                />
                <Bar dataKey="jobsCompleted" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 7-day trend line chart */}
        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-6">7-Day Completion Trend</h2>
          {dailyStats.every((d) => d.jobsCompleted === 0) ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm italic">No completions in the last 7 days.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyStats}>
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} dx={-6} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)' }}
                  labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                  formatter={(v: number, name: string) => [
                    name === 'jobsCompleted' ? `${v} jobs` : `RM ${v.toFixed(2)}`,
                    name === 'jobsCompleted' ? 'Jobs Done' : 'Revenue',
                  ]}
                />
                <Legend formatter={(v) => v === 'jobsCompleted' ? 'Jobs Done' : 'Revenue (RM)'} />
                <Line type="monotone" dataKey="jobsCompleted" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="totalAmount" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Revenue by Technician bar chart */}
      {stats.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-6">Revenue by Technician (RM)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats} barSize={40}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="technician" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={8} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-6} tickFormatter={(v) => `RM${v}`} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)' }}
                labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                formatter={(v: number) => [`RM ${v.toFixed(2)}`, 'Revenue']}
              />
              <Bar dataKey="totalAmount" fill="url(#revGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Technician Leaderboard</h2>
        </div>
        {stats.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm italic">No completed jobs in this range yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold tracking-wider uppercase text-slate-500">
                  <th className="px-6 py-3 text-left">Rank</th>
                  <th className="px-6 py-3 text-left">Technician</th>
                  <th className="px-6 py-3 text-right">Jobs Done</th>
                  <th className="px-6 py-3 text-right">In Progress</th>
                  <th className="px-6 py-3 text-right">Pending</th>
                  <th className="px-6 py-3 text-right">Total Revenue</th>
                  <th className="px-6 py-3 text-right">Avg/Job</th>
                  {totalPaymentCollected > 0 && <th className="px-6 py-3 text-right">Cash Collected</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.map((s, i) => (
                  <tr key={s.technician} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        i === 0 ? 'bg-amber-100 text-amber-700' :
                        i === 1 ? 'bg-slate-200 text-slate-700' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 text-base">{s.technician}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="bg-sky-100 text-sky-700 px-2.5 py-1 rounded-lg font-semibold">{s.jobsCompleted}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2.5 py-1 rounded-lg font-semibold ${s.inProgress > 0 ? 'bg-amber-100 text-amber-700' : 'text-slate-400'}`}>
                        {s.inProgress}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2.5 py-1 rounded-lg font-semibold ${s.pending > 0 ? 'bg-violet-100 text-violet-700' : 'text-slate-400'}`}>
                        {s.pending}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-700">RM {s.totalAmount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-slate-600">RM {s.avgAmount.toFixed(2)}</td>
                    {totalPaymentCollected > 0 && (
                      <td className="px-6 py-4 text-right text-violet-700 font-semibold">
                        {s.paymentCollected > 0 ? `RM ${s.paymentCollected.toFixed(2)}` : '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-800">
                  <td className="px-6 py-3" colSpan={2}>Total</td>
                  <td className="px-6 py-3 text-right text-sky-700">{totalJobs}</td>
                  <td className="px-6 py-3 text-right text-amber-700">{totalInProgress}</td>
                  <td className="px-6 py-3 text-right text-violet-700">{totalPending}</td>
                  <td className="px-6 py-3 text-right text-emerald-700">RM {totalAmount.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right text-slate-500">RM {totalJobs > 0 ? (totalAmount / totalJobs).toFixed(2) : '0.00'}</td>
                  {totalPaymentCollected > 0 && (
                    <td className="px-6 py-3 text-right text-violet-700">RM {totalPaymentCollected.toFixed(2)}</td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Top Performer callout */}
      {topTechnician && topTechnician.jobsCompleted > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 p-5 text-white shadow-lg shadow-amber-300/30 flex items-center gap-4">
          <span className="text-4xl">🏆</span>
          <div>
            <div className="text-xs font-bold tracking-wider uppercase text-amber-100 mb-0.5">Top Performer — {RANGE_LABELS[range]}</div>
            <div className="text-2xl font-extrabold">{topTechnician.technician}</div>
            <div className="text-sm text-amber-100 mt-0.5">{topTechnician.jobsCompleted} jobs · RM {topTechnician.totalAmount.toFixed(2)} revenue</div>
          </div>
        </div>
      )}
    </div>
  );
}
