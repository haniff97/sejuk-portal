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
    <div className="max-w-3xl mx-auto p-6 text-slate-100 space-y-6">
      <h1 className="text-xl font-semibold">Admin — Orders</h1>

      {lastCreated && (
        <OrderSummary order={lastCreated} onDismiss={() => setLastCreated(null)} />
      )}

      <OrderForm onCreated={handleCreated} />

      <div>
        <h2 className="text-lg font-semibold mb-3">All Orders</h2>
        {loading && <p className="text-slate-400">Loading…</p>}
        {error && (
          <p className="text-red-400 text-sm">
            Supabase error: {error} — check your .env has the right URL/anon key and the
            `orders` table exists.
          </p>
        )}
        {!loading && !error && orders.length === 0 && (
          <p className="text-slate-400">No orders yet.</p>
        )}
        <ul className="space-y-2">
          {orders.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between rounded-md border border-slate-800 p-3"
            >
              <div>
                <div className="font-medium">{o.order_no} — {o.customer_name}</div>
                <div className="text-sm text-slate-500">
                  {o.service_type} · {o.assigned_technician ?? 'Unassigned'} · RM {o.quoted_price.toFixed(2)}
                </div>
              </div>
              <StatusBadge status={o.status} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
