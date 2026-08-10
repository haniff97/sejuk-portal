import type { Order } from '../types/order';
import { buildWhatsAppLink } from '../lib/whatsapp';

export default function WhatsAppButton({ order }: { order: Order }) {
  return (
    <a
      href={buildWhatsAppLink(order)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2"
    >
      Send WhatsApp Update
    </a>
  );
}
