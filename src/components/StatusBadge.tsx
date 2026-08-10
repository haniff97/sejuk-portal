import type { OrderStatus } from '../types/order';

const STATUS_STYLES: Record<OrderStatus, string> = {
  New: 'bg-slate-700 text-slate-200',
  Assigned: 'bg-sky-900 text-sky-300',
  'In Progress': 'bg-amber-900 text-amber-300',
  'Job Done': 'bg-emerald-900 text-emerald-300',
  Reviewed: 'bg-violet-900 text-violet-300',
  Closed: 'bg-slate-800 text-slate-500',
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}
