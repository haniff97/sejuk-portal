import type { OrderStatus } from '../types/order';

const STATUS_STYLES: Record<OrderStatus, string> = {
  New: 'bg-slate-100 text-slate-700 border-slate-200',
  Assigned: 'bg-sky-100 text-sky-700 border-sky-200',
  'In Progress': 'bg-amber-100 text-amber-700 border-amber-200',
  'Job Done': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Reviewed: 'bg-violet-100 text-violet-700 border-violet-200',
  Closed: 'bg-slate-100 text-slate-500 border-slate-200 opacity-80',
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}
