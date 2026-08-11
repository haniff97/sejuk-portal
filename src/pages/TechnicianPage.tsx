import { useEffect, useState } from 'react';
import { useRole } from '../context/RoleContext';
import { supabase } from '../lib/supabase';
import type { Order } from '../types/order';
import StatusBadge from '../components/StatusBadge';
import JobCompletionForm from '../components/JobCompletionForm';
import WhatsAppButton from '../components/WhatsAppButton';

export default function TechnicianPage() {
  const { technicianName } = useRole();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [justCompleted, setJustCompleted] = useState<Order | null>(null);

  async function loadJobs() {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('assigned_technician', technicianName)
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setOrders((data as Order[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadJobs();
    setActiveOrder(null);
    setJustCompleted(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technicianName]);

  function handleCompleted(updated: Order) {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setActiveOrder(null);
    setJustCompleted(updated);
  }

  const openJobs = orders.filter((o) => o.status === 'Assigned' || o.status === 'In Progress');
  const doneJobs = orders.filter((o) => o.status !== 'Assigned' && o.status !== 'In Progress');

  if (justCompleted) {
    return (
      <div className="max-w-xl mx-auto p-4 text-slate-900">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 space-y-5 shadow-sm text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Job {justCompleted.order_no} marked Job Done</h1>
          <p className="text-sm text-slate-600">
            Notify the customer via WhatsApp, or skip and come back to it later — the link is
            also available next to the job in your Completed list.
          </p>
          <div className="flex justify-center py-2">
            <WhatsAppButton order={justCompleted} />
          </div>
          <div className="pt-2 border-t border-emerald-200/50">
            <button
              onClick={() => setJustCompleted(null)}
              className="text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors"
            >
              ← Back to my jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeOrder) {
    return (
      <div className="max-w-xl mx-auto p-4 text-slate-900">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setActiveOrder(null)} className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Complete Job</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <JobCompletionForm
            order={activeOrder}
            technicianName={technicianName}
            onCompleted={handleCompleted}
            onCancel={() => setActiveOrder(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 text-slate-900 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 mb-6">My Jobs — {technicianName}</h1>

      {loading && <p className="text-slate-500">Loading…</p>}
      {error && <p className="text-red-600 bg-red-50 p-4 rounded-xl border border-red-200 text-sm">{error}</p>}

      {!loading && !error && (
        <>
          <section>
            <h2 className="text-sm font-bold tracking-wider uppercase text-slate-500 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              To Do ({openJobs.length})
            </h2>
            <ul className="space-y-3 mb-8">
              {openJobs.length === 0 && (
                <li className="text-slate-500 text-sm italic bg-slate-50 p-6 rounded-xl border border-slate-100 text-center">No open jobs assigned to you.</li>
              )}
              {openJobs.map((o) => (
                <li
                  key={o.id}
                  onClick={() => setActiveOrder(o)}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 active:bg-emerald-50 transition-all p-4 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-lg text-slate-900">{o.order_no}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="text-sm text-slate-500 flex items-center gap-2">
                    <span className="font-medium text-slate-700">{o.customer_name}</span>
                    <span className="text-slate-300">•</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded">{o.service_type}</span>
                  </div>
                  <div className="text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 mt-3 flex items-start gap-2">
                    <svg className="shrink-0 mt-0.5 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    {o.address}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {doneJobs.length > 0 && (
            <section>
              <h2 className="text-sm font-bold tracking-wider uppercase text-slate-500 mb-3">Completed ({doneJobs.length})</h2>
              <ul className="space-y-3">
                {doneJobs.map((o) => (
                  <li key={o.id} className="bg-white/80 rounded-xl border border-slate-200 shadow-sm p-4 opacity-80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-lg text-slate-900">{o.order_no}</span>
                        <StatusBadge status={o.status} />
                      </div>
                      <div className="text-sm text-slate-600 font-medium">{o.customer_name}</div>
                    </div>
                    {o.status === 'Job Done' && (
                      <div className="shrink-0">
                        <WhatsAppButton order={o} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
