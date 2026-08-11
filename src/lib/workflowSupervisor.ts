import type { Order } from '../types/order';

export interface Flag {
  orderId: string;
  orderNo: string;
  type: 'amount_variance' | 'missing_photos';
  detail: string;
}

const COMPLETED_STATUSES = new Set(['Job Done', 'Reviewed', 'Closed']);
const VARIANCE_THRESHOLD = 1.3; // final amount 30%+ above quoted triggers a flag

/**
 * Pure, deterministic rule checks — no AI involved here. This is intentional:
 * "is the final amount 30% over quote" and "are there zero attachments" are
 * business rules, not judgment calls that need a model. AI's role (see
 * phraseFlagsWithAI) is limited to turning these structured flags into
 * readable sentences, not deciding what counts as anomalous.
 */
export function detectAnomalies(orders: Order[]): Flag[] {
  const flags: Flag[] = [];

  for (const order of orders) {
    // 1. Amount variance check (applies to any order that has a final amount)
    if (order.final_amount != null && order.quoted_price > 0) {
      const ratio = order.final_amount / order.quoted_price;
      if (ratio >= VARIANCE_THRESHOLD) {
        flags.push({
          orderId: order.id,
          orderNo: order.order_no,
          type: 'amount_variance',
          detail: `Final amount RM ${order.final_amount.toFixed(2)} vs quoted RM ${order.quoted_price.toFixed(2)} (${Math.round((ratio - 1) * 100)}% higher)`,
        });
      }
    }

    // 2. Missing photos check (ONLY applies to completed orders)
    if (COMPLETED_STATUSES.has(order.status)) {
      if (!order.attachments || order.attachments.length === 0) {
        flags.push({
          orderId: order.id,
          orderNo: order.order_no,
          type: 'missing_photos',
          detail: `Marked ${order.status} with no photos/attachments uploaded`,
        });
      }
    }
  }

  return flags;
}
