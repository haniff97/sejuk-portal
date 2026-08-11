import type { Order } from '../types/order';
import StatusBadge from './StatusBadge';

export default function OrderSummary({ order, onDismiss }: { order: Order; onDismiss: () => void }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 text-slate-900 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200 rounded-full blur-2xl opacity-50 -mr-10 -mt-10 pointer-events-none"></div>
      <div className="flex items-center justify-between mb-4 relative">
        <h3 className="font-bold text-emerald-800 text-lg flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          Order created — {order.order_no}
        </h3>
        <button onClick={onDismiss} className="text-emerald-600 hover:text-emerald-800 font-medium bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded-md transition-colors text-sm">
          Dismiss
        </button>
      </div>
      <dl className="text-sm grid grid-cols-2 gap-y-2 gap-x-4 text-slate-700 relative">
        <dt className="text-slate-500 font-medium">Customer</dt>
        <dd className="font-semibold">{order.customer_name}</dd>
        <dt className="text-slate-500 font-medium">Technician</dt>
        <dd className="font-semibold">{order.assigned_technician}</dd>
        <dt className="text-slate-500 font-medium">Quoted Price</dt>
        <dd className="font-semibold text-emerald-700">RM {order.quoted_price.toFixed(2)}</dd>
        <dt className="text-slate-500 font-medium flex items-center">Status</dt>
        <dd><StatusBadge status={order.status} /></dd>
      </dl>
    </div>
  );
}
