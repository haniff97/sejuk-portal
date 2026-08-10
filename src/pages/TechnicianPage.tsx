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
      <div className="max-w-lg mx-auto p-4 text-slate-100">
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-5 space-y-4">
          <h1 className="text-lg font-semibold">Job {justCompleted.order_no} marked Job Done</h1>
          <p className="text-sm text-slate-400">
            Notify the customer via WhatsApp, or skip and come back to it later — the link is
            also available next to the job in your Completed list.
          </p>
          <WhatsAppButton order={justCompleted} />
          <div>
            <button
              onClick={() => setJustCompleted(null)}
              className="text-sm text-slate-400 underline"
            >
              Back to my jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeOrder) {
    return (
      <div className="max-w-lg mx-auto p-4 text-slate-100">
        <h1 className="text-lg font-semibold mb-4">Complete Job</h1>
        <JobCompletionForm
          order={activeOrder}
          technicianName={technicianName}
          onCompleted={handleCompleted}
          onCancel={() => setActiveOrder(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 text-slate-100">
      <h1 className="text-lg font-semibold mb-4">My Jobs — {technicianName}</h1>

      {loading && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && (
        <>
          <h2 className="text-sm font-medium text-slate-400 mb-2">To Do ({openJobs.length})</h2>
          <ul className="space-y-2 mb-6">
            {openJobs.length === 0 && (
              <li className="text-slate-500 text-sm">No open jobs assigned to you.</li>
            )}
            {openJobs.map((o) => (
              <li
                key={o.id}
                onClick={() => setActiveOrder(o)}
                className="rounded-md border border-slate-800 p-3 active:bg-slate-800"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{o.order_no}</span>
                  <StatusBadge status={o.status} />
                </div>
                <div className="text-sm text-slate-500">{o.customer_name} · {o.service_type}</div>
                <div className="text-xs text-slate-600 mt-1">{o.address}</div>
              </li>
            ))}
          </ul>

          {doneJobs.length > 0 && (
            <>
              <h2 className="text-sm font-medium text-slate-400 mb-2">Completed ({doneJobs.length})</h2>
              <ul className="space-y-2">
                {doneJobs.map((o) => (
                  <li key={o.id} className="rounded-md border border-slate-800 p-3 opacity-90">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{o.order_no}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="text-sm text-slate-500 mb-2">{o.customer_name}</div>
                    {o.status === 'Job Done' && <WhatsAppButton order={o} />}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
