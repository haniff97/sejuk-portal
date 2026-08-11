import type { Order } from '../types/order';

export interface TechnicianStats {
  technician: string;
  jobsCompleted: number;
  totalAmount: number;
  avgAmount: number;
  inProgress: number;       // Assigned or In Progress
  pending: number;          // New (not yet assigned / postponed)
  paymentCollected: number; // from payment_received field
}

export interface DailyStats {
  date: string; // "Mon", "Tue", etc or "Jan 1" etc
  jobsCompleted: number;
  totalAmount: number;
}

const COMPLETED_STATUSES = new Set(['Job Done', 'Reviewed', 'Closed']);

/**
 * Aggregates per-technician stats from orders.
 * - jobsCompleted: orders that reached Job Done/Reviewed/Closed
 * - totalAmount: sum of final_amount (or quoted_price fallback)
 * - inProgress: currently Assigned or In Progress
 * - pending: New (unassigned / not yet started — acts as "postpone" proxy)
 * - paymentCollected: sum of payment_received where recorded
 */
export function computeTechnicianStats(orders: Order[], since?: Date): TechnicianStats[] {
  const relevant = since
    ? orders.filter((o) => new Date(o.updated_at) >= since)
    : orders;

  const byTechnician = new Map<string, TechnicianStats>();

  for (const order of relevant) {
    const tech = order.assigned_technician ?? 'Unassigned';
    const entry = byTechnician.get(tech) ?? {
      technician: tech,
      jobsCompleted: 0,
      totalAmount: 0,
      avgAmount: 0,
      inProgress: 0,
      pending: 0,
      paymentCollected: 0,
    };

    if (COMPLETED_STATUSES.has(order.status)) {
      entry.jobsCompleted += 1;
      entry.totalAmount += order.final_amount ?? order.quoted_price;
      if (order.payment_received) {
        entry.paymentCollected += order.payment_received;
      }
    } else if (order.status === 'Assigned' || order.status === 'In Progress') {
      entry.inProgress += 1;
    } else if (order.status === 'New') {
      entry.pending += 1;
    }

    byTechnician.set(tech, entry);
  }

  const result = Array.from(byTechnician.values()).map((s) => ({
    ...s,
    avgAmount: s.jobsCompleted > 0 ? s.totalAmount / s.jobsCompleted : 0,
  }));

  return result.sort((a, b) => b.jobsCompleted - a.jobsCompleted);
}

/**
 * Groups completed orders by day (last N days) for the trend chart.
 */
export function computeDailyStats(orders: Order[], days = 7): DailyStats[] {
  const result: DailyStats[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);

    const end = new Date(d);
    end.setHours(23, 59, 59, 999);

    const dayOrders = orders.filter((o) => {
      if (!COMPLETED_STATUSES.has(o.status)) return false;
      const updated = new Date(o.updated_at);
      return updated >= d && updated <= end;
    });

    result.push({
      date: d.toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short' }),
      jobsCompleted: dayOrders.length,
      totalAmount: dayOrders.reduce((sum, o) => sum + (o.final_amount ?? o.quoted_price), 0),
    });
  }

  return result;
}

export function startOfWeek(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  d.setHours(0, 0, 0, 0);
  return d;
}
