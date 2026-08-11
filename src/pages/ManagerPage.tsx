import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { logAudit } from '../lib/audit';
import type { Order, OrderStatus } from '../types/order';
import StatusBadge from '../components/StatusBadge';
import AIQueryPanel from '../components/AIQueryPanel';
import WorkflowSupervisorPanel from '../components/WorkflowSupervisorPanel';
import AuditLogPanel from '../components/AuditLogPanel';
import KPIDashboard from '../components/KPIDashboard';

type Tab = 'review' | 'kpi';

export default function ManagerPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('review');

  async function loadOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) setError(error.message);
    else setOrders((data as Order[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function updateStatus(order: Order, status: OrderStatus) {
    setUpdatingId(order.id);
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .select()
      .single();
    setUpdatingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === order.id ? (data as Order) : o)));

    logAudit({
      entityId: order.id,
      orderNo: order.order_no,
      action: status === 'Reviewed' ? 'order_reviewed' : 'order_closed',
      actorRole: 'Manager',
      actorName: 'Manager',
      detail: `Status changed from ${order.status} to ${status}`,
    });
  }

  const pendingReview = orders.filter((o) => o.status === 'Job Done');
  const reviewed = orders.filter((o) => o.status === 'Reviewed');
  const closed = orders.filter((o) => o.status === 'Closed');
  const inProgress = orders.filter((o) => o.status === 'New' || o.status === 'Assigned' || o.status === 'In Progress');

  function OrderRow({ order, action }: { order: Order; action?: React.ReactNode }) {
    return (
      <li className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-200 hover:-translate-y-0.5 transition-all p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
          <span className="font-semibold text-slate-900 text-lg">{order.order_no} — {order.customer_name}</span>
          <StatusBadge status={order.status} />
        </div>
        <div className="text-sm text-slate-500 mb-3 flex items-center gap-2 flex-wrap">
          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{order.assigned_technician ?? 'Unassigned'}</span>
          <span className="text-slate-300">•</span>
          <span className="font-medium text-sky-700">Final: RM {(order.final_amount ?? order.quoted_price).toFixed(2)}</span>
          {order.attachments && order.attachments.length > 0 && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-sky-600 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                {order.attachments.length} attachment(s)
              </span>
            </>
          )}
        </div>
        {order.work_done && (
          <p className="text-sm text-slate-700 bg-sky-50 p-3 rounded-lg border border-sky-100 mb-4">{order.work_done}</p>
        )}
        {action && (
          <div className="mt-2 flex justify-end">
            {action}
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 text-slate-900 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600">Manager Dashboard</h1>
        <div className="flex rounded-xl bg-slate-100 p-1 gap-1 text-sm shadow-inner">
          <button
            onClick={() => setTab('review')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${tab === 'review' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
          >
            Review Jobs
          </button>
          <button
            onClick={() => setTab('kpi')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${tab === 'kpi' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
          >
            KPI Dashboard
          </button>
        </div>
      </div>

      {loading && <p className="text-slate-500">Loading…</p>}
      {error && <p className="text-red-600 bg-red-50 p-4 rounded-xl border border-red-200 text-sm">{error}</p>}

      {!loading && !error && tab === 'kpi' && <KPIDashboard orders={orders} />}

      {!loading && !error && tab === 'review' && (
        <>
          <AIQueryPanel />
          <WorkflowSupervisorPanel orders={orders} />
          <AuditLogPanel />
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="bg-amber-100 text-amber-600 p-1.5 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </span>
              Pending Review ({pendingReview.length})
            </h2>
            {pendingReview.length === 0 && (
              <p className="text-slate-500 text-sm italic bg-slate-50 p-6 rounded-xl border border-slate-100 text-center">No completed jobs awaiting review.</p>
            )}
            <ul className="space-y-3">
              {pendingReview.map((o) => (
                <OrderRow
                  key={o.id}
                  order={o}
                  action={
                    <button
                      onClick={() => updateStatus(o, 'Reviewed')}
                      disabled={updatingId === o.id}
                      className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm px-5 py-2 font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
                    >
                      {updatingId === o.id ? 'Saving…' : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                          Mark Reviewed
                        </>
                      )}
                    </button>
                  }
                />
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="bg-sky-100 text-sky-600 p-1.5 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </span>
              Reviewed ({reviewed.length})
            </h2>
            {reviewed.length === 0 && (
              <p className="text-slate-500 text-sm italic bg-slate-50 p-6 rounded-xl border border-slate-100 text-center">No orders in Reviewed state.</p>
            )}
            <ul className="space-y-3">
              {reviewed.map((o) => (
                <OrderRow
                  key={o.id}
                  order={o}
                  action={
                    <button
                      onClick={() => updateStatus(o, 'Closed')}
                      disabled={updatingId === o.id}
                      className="rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm px-5 py-2 font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
                    >
                      {updatingId === o.id ? 'Saving…' : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                          Close Order
                        </>
                      )}
                    </button>
                  }
                />
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>
              </span>
              In Progress ({inProgress.length})
            </h2>
            <ul className="space-y-3">
              {inProgress.length === 0 && (
                <p className="text-slate-500 text-sm italic bg-slate-50 p-6 rounded-xl border border-slate-100 text-center">Nothing currently in progress.</p>
              )}
              {inProgress.map((o) => (
                <OrderRow key={o.id} order={o} />
              ))}
            </ul>
          </section>

          {closed.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2 opacity-60">
                <span className="bg-slate-200 text-slate-600 p-1.5 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </span>
                Closed ({closed.length})
              </h2>
              <ul className="space-y-3 opacity-60">
                {closed.map((o) => (
                  <OrderRow key={o.id} order={o} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
