import type { Order } from '../types/order';

/**
 * Normalizes a local Malaysian number (e.g. "012-345 6789" or "0123456789")
 * into the international format wa.me requires (no +, no leading 0).
 * Numbers already starting with a country code are passed through as-is.
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return '60' + digits.slice(1);
  }
  return digits;
}

export function buildWhatsAppMessage(order: Order): string {
  const time = new Date(order.updated_at).toLocaleString('en-MY', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return `Hi ${order.customer_name}, Job ${order.order_no} has been completed by Technician ${order.assigned_technician} at ${time}. Please check and leave feedback. Thank you!`;
}

export function buildWhatsAppLink(order: Order): string {
  const phone = normalizePhone(order.phone);
  const message = buildWhatsAppMessage(order);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
