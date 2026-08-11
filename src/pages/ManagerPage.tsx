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
      <li className="rounded-md border border-slate-800 p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium">{order.order_no} — {order.customer_name}</span>
          <StatusBadge status={order.status} />
        </div>
        <div className="text-sm text-slate-500 mb-2">
          {order.assigned_technician ?? 'Unassigned'} · Final: RM {(order.final_amount ?? order.quoted_price).toFixed(2)}
          {order.attachments && order.attachments.length > 0 && (
            <span className="text-slate-600"> · {order.attachments.length} attachment(s)</span>
          )}
        </div>
        {order.work_done && (
          <p className="text-sm text-slate-400 mb-2">{order.work_done}</p>
        )}
        {action}
      </li>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 text-slate-100 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Manager</h1>
        <div className="flex rounded-md border border-slate-700 overflow-hidden text-sm">
          <button
            onClick={() => setTab('review')}
            className={`px-3 py-1.5 ${tab === 'review' ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400'}`}
          >
            Review
          </button>
          <button
            onClick={() => setTab('kpi')}
            className={`px-3 py-1.5 ${tab === 'kpi' ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400'}`}
          >
            KPI Dashboard
          </button>
        </div>
      </div>

      {loading && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && tab === 'kpi' && <KPIDashboard orders={orders} />}

      {!loading && !error && tab === 'review' && (
        <>
          <AIQueryPanel />
          <WorkflowSupervisorPanel orders={orders} />
          <AuditLogPanel />
          <section>
            <h2 className="text-lg font-semibold mb-3">
              Pending Review ({pendingReview.length})
            </h2>
            {pendingReview.length === 0 && (
              <p className="text-slate-500 text-sm">No completed jobs awaiting review.</p>
            )}
            <ul className="space-y-2">
              {pendingReview.map((o) => (
                <OrderRow
                  key={o.id}
                  order={o}
                  action={
                    <button
                      onClick={() => updateStatus(o, 'Reviewed')}
                      disabled={updatingId === o.id}
                      className="rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-3 py-1.5"
                    >
                      {updatingId === o.id ? 'Saving…' : 'Mark Reviewed'}
                    </button>
                  }
                />
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Reviewed ({reviewed.length})</h2>
            {reviewed.length === 0 && (
              <p className="text-slate-500 text-sm">No orders in Reviewed state.</p>
            )}
            <ul className="space-y-2">
              {reviewed.map((o) => (
                <OrderRow
                  key={o.id}
                  order={o}
                  action={
                    <button
                      onClick={() => updateStatus(o, 'Closed')}
                      disabled={updatingId === o.id}
                      className="rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm px-3 py-1.5"
                    >
                      {updatingId === o.id ? 'Saving…' : 'Close Order'}
                    </button>
                  }
                />
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">In Progress ({inProgress.length})</h2>
            <ul className="space-y-2">
              {inProgress.length === 0 && (
                <p className="text-slate-500 text-sm">Nothing currently in progress.</p>
              )}
              {inProgress.map((o) => (
                <OrderRow key={o.id} order={o} />
              ))}
            </ul>
          </section>

          {closed.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Closed ({closed.length})</h2>
              <ul className="space-y-2 opacity-60">
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
