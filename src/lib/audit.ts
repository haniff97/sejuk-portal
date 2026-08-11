import { supabase } from './supabase';

interface LogAuditParams {
  entityId: string;
  orderNo: string;
  action: string;
  actorRole: string;
  actorName: string;
  detail: string;
}

/**
 * Writes one row to audit_log. Fire-and-forget by design: a logging failure
 * should never block the actual business action (creating an order,
 * completing a job, etc.) from succeeding — it just won't show up in the
 * activity feed, which is logged to the console for debugging rather than
 * surfaced to the user.
 */
export async function logAudit(params: LogAuditParams) {
  const { error } = await supabase.from('audit_log').insert({
    entity_id: params.entityId,
    order_no: params.orderNo,
    action: params.action,
    actor_role: params.actorRole,
    actor_name: params.actorName,
    detail: params.detail,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Audit log write failed:', error.message);
  }
}
