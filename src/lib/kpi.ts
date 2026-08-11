import type { Order } from '../types/order';

export interface TechnicianStats {
  technician: string;
  jobsCompleted: number;
  totalAmount: number;
}

const COMPLETED_STATUSES = new Set(['Job Done', 'Reviewed', 'Closed']);

/**
 * Aggregates per-technician stats from orders. Only counts orders that have
 * actually reached a completed state (Job Done/Reviewed/Closed) — an order
 * that's just Assigned hasn't produced a real amount or a completed job yet.
 *
 * Note: the assessment brief's example KPI metrics include "Postpone /
 * Reschedule," which isn't modeled anywhere in this schema (no reschedule
 * concept exists in the order lifecycle as built). Deliberately omitted
 * rather than faked — see README.
 */
export function computeTechnicianStats(orders: Order[], since?: Date): TechnicianStats[] {
  const relevant = since
    ? orders.filter((o) => new Date(o.updated_at) >= since)
    : orders;

  const byTechnician = new Map<string, TechnicianStats>();

  for (const order of relevant) {
    if (!COMPLETED_STATUSES.has(order.status)) continue;
    const tech = order.assigned_technician ?? 'Unassigned';

    const entry = byTechnician.get(tech) ?? { technician: tech, jobsCompleted: 0, totalAmount: 0 };
    entry.jobsCompleted += 1;
    entry.totalAmount += order.final_amount ?? order.quoted_price;
    byTechnician.set(tech, entry);
  }

  return Array.from(byTechnician.values()).sort((a, b) => b.jobsCompleted - a.jobsCompleted);
}

export function startOfWeek(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d;
}
