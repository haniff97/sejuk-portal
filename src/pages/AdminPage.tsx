import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Order } from '../types/order';
import OrderForm from '../components/OrderForm';
import OrderSummary from '../components/OrderSummary';
import StatusBadge from '../components/StatusBadge';

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastCreated, setLastCreated] = useState<Order | null>(null);

  async function loadOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setOrders((data as Order[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  function handleCreated(order: Order) {
    setLastCreated(order);
    setOrders((prev) => [order, ...prev]);
  }

  return (
    <div className="max-w-3xl mx-auto p-6 text-slate-900 space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-violet-700">Admin — Orders</h1>

      {lastCreated && (
        <OrderSummary order={lastCreated} onDismiss={() => setLastCreated(null)} />
      )}

      <OrderForm onCreated={handleCreated} />

      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="bg-indigo-100 text-indigo-700 p-1.5 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </span>
          All Orders
        </h2>
        {loading && <p className="text-slate-500">Loading…</p>}
        {error && (
          <p className="text-red-600 bg-red-50 p-4 rounded-xl border border-red-200 text-sm">
            <span className="font-semibold">Supabase error:</span> {error} — check your .env has the right URL/anon key and the `orders` table exists.
          </p>
        )}
        {!loading && !error && orders.length === 0 && (
          <p className="text-slate-500 italic bg-slate-50 p-6 rounded-xl border border-slate-100 text-center">No orders yet.</p>
        )}
        <div className="max-h-[480px] overflow-y-auto pr-1">
          <ul className="space-y-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 transition-all p-4"
              >
                <div>
                  <div className="font-semibold text-slate-900 text-lg">{o.order_no} — {o.customer_name}</div>
                  <div className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{o.service_type}</span>
                    <span className="text-slate-300">•</span>
                    <span>{o.assigned_technician ?? 'Unassigned'}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-medium text-emerald-600">RM {o.quoted_price.toFixed(2)}</span>
                  </div>
                </div>
                <StatusBadge status={o.status} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
