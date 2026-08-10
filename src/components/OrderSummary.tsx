import type { Order } from '../types/order';
import StatusBadge from './StatusBadge';

export default function OrderSummary({ order, onDismiss }: { order: Order; onDismiss: () => void }) {
  return (
    <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-slate-100">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Order created — {order.order_no}</h3>
        <button onClick={onDismiss} className="text-slate-400 hover:text-slate-200 text-sm">
          Dismiss
        </button>
      </div>
      <dl className="text-sm grid grid-cols-2 gap-y-1 gap-x-4 text-slate-300">
        <dt className="text-slate-500">Customer</dt>
        <dd>{order.customer_name}</dd>
        <dt className="text-slate-500">Technician</dt>
        <dd>{order.assigned_technician}</dd>
        <dt className="text-slate-500">Quoted Price</dt>
        <dd>RM {order.quoted_price.toFixed(2)}</dd>
        <dt className="text-slate-500">Status</dt>
        <dd><StatusBadge status={order.status} /></dd>
      </dl>
    </div>
  );
}
