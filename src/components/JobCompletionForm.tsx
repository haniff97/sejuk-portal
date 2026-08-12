import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Order } from '../types/order';

interface Props {
  order: Order;
  technicianName: string;
  onCompleted: (order: Order) => void;
  onCancel: () => void;
}

const MAX_FILES = 6;

const PAYMENT_METHODS = ['Cash', 'Online Transfer', 'QR Code / DuitNow', 'Credit/Debit Card', 'Other'];

export default function JobCompletionForm({ order, technicianName, onCompleted, onCancel }: Props) {
  // Core fields
  const [workDone, setWorkDone] = useState('');
  const [extraCharges, setExtraCharges] = useState('0');
  const [remarks, setRemarks] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  // Payment (optional)
  const [recordPayment, setRecordPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extra = parseFloat(extraCharges) || 0;
  const finalAmount = order.quoted_price + extra;
  const completedAt = new Date();

  /** Replace every character outside [A-Za-z0-9._-] with a hyphen.
   *  This covers the narrow no-break space (U+202F) macOS puts in screenshot
   *  names (e.g. "9.34.58\u202FPM.png") which Supabase rejects as an invalid key.
   */
  function sanitizeFilename(name: string): string {
    return name
      .replace(/[^A-Za-z0-9._-]/g, '-') // replace unsafe chars
      .replace(/-{2,}/g, '-');           // collapse consecutive hyphens
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed.`);
      return;
    }
    setError(null);
    setFiles(selected);
  }

  async function uploadFiles(): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const path = `${order.order_no}/${Date.now()}-${sanitizeFilename(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from('job-attachments')
        .upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('job-attachments').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function uploadReceipt(): Promise<string | null> {
    if (!receiptFile) return null;
    const path = `${order.order_no}/receipt-${Date.now()}-${sanitizeFilename(receiptFile.name)}`;
    const { error: uploadError } = await supabase.storage
      .from('job-attachments')
      .upload(path, receiptFile);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('job-attachments').getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!workDone.trim()) {
      setError('Please describe the work done.');
      return;
    }
    if (recordPayment && (!paymentAmount || parseFloat(paymentAmount) <= 0)) {
      setError('Please enter a valid payment amount.');
      return;
    }

    setSubmitting(true);
    try {
      const attachmentUrls = files.length > 0 ? await uploadFiles() : [];
      const receiptUrl = recordPayment ? await uploadReceipt() : null;

      const updatePayload: Record<string, unknown> = {
        work_done: workDone,
        extra_charges: extra,
        final_amount: finalAmount,
        remarks: remarks || null,
        attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
        technician_name: technicianName,
        completed_at: completedAt.toISOString(),
        status: 'Job Done',
        updated_at: new Date().toISOString(),
      };

      if (recordPayment) {
        updatePayload.payment_received = parseFloat(paymentAmount);
        updatePayload.payment_method = paymentMethod;
        updatePayload.payment_receipt_url = receiptUrl;
      }

      const { data, error: updateError } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', order.id)
        .select()
        .single();

      if (updateError) throw updateError;
      onCompleted(data as Order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-inner transition-all';
  const labelClass = 'block text-sm font-bold text-slate-700 mb-2';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Order summary (read-only) */}
      <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-4 text-sm text-slate-700 shadow-sm space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-emerald-800 text-base">{order.order_no}</span>
          <span className="text-xs text-slate-500 font-medium bg-white px-2 py-1 rounded-lg border border-slate-200">Read-only</span>
        </div>
        <div><span className="font-semibold text-emerald-800">Customer:</span> {order.customer_name}</div>
        <div><span className="font-semibold text-emerald-800">Service:</span> {order.service_type}</div>
        <div><span className="font-semibold text-emerald-800">Quoted:</span> RM {order.quoted_price.toFixed(2)}</div>
        {order.problem_description && (
          <div><span className="font-semibold text-emerald-800">Issue:</span> {order.problem_description}</div>
        )}
      </div>

      {/* Work Done */}
      <div>
        <label className={labelClass}>Work Done *</label>
        <textarea
          className={inputClass}
          rows={3}
          placeholder="Describe what was done (e.g. replaced capacitor, cleaned filter coil…)"
          value={workDone}
          onChange={(e) => setWorkDone(e.target.value)}
          required
        />
      </div>

      {/* Extra Charges */}
      <div>
        <label className={labelClass}>Extra Charges (RM)</label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 font-bold">RM</span>
          <input
            className={inputClass + ' pl-10'}
            type="number"
            step="0.01"
            min="0"
            value={extraCharges}
            onChange={(e) => setExtraCharges(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">Enter 0 if no extra charges.</p>
      </div>

      {/* Final Amount (auto-calculated) */}
      <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-sm text-emerald-50 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Final Amount (auto-calculated)</span>
          <span className="text-white font-bold text-2xl">RM {finalAmount.toFixed(2)}</span>
        </div>
        <div className="text-xs text-emerald-200 flex justify-between">
          <span>Quoted: RM {order.quoted_price.toFixed(2)}</span>
          <span>+ Extra: RM {extra.toFixed(2)}</span>
        </div>
      </div>

      {/* Attachments */}
      <div>
        <label className={labelClass}>Photos / Video / PDF (max {MAX_FILES})</label>
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all">
          <input
            className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 file:cursor-pointer"
            type="file"
            accept="image/*,video/*,application/pdf"
            multiple
            onChange={handleFileChange}
          />
          {files.length > 0 && (
            <div className="mt-3 space-y-1">
              {files.map((f, i) => (
                <div key={i} className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  {f.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Remarks */}
      <div>
        <label className={labelClass}>Remarks</label>
        <textarea
          className={inputClass}
          rows={2}
          placeholder="Any additional notes…"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>

      {/* Technician & Timestamp (read-only display) */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 space-y-1">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <span><span className="font-semibold text-slate-700">Technician:</span> {technicianName}</span>
        </div>
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span><span className="font-semibold text-slate-700">Timestamp:</span> {completedAt.toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}</span>
        </div>
      </div>

      {/* Payment (optional) */}
      <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 overflow-hidden">
        <button
          type="button"
          onClick={() => setRecordPayment(!recordPayment)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="bg-violet-100 text-violet-600 p-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            </span>
            <div>
              <div className="font-bold text-violet-800 text-sm">Record Payment Received</div>
              <div className="text-xs text-violet-600">Optional — record if customer paid on-site</div>
            </div>
          </div>
          <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${recordPayment ? 'bg-violet-500' : 'bg-slate-200'}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${recordPayment ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </button>

        {recordPayment && (
          <div className="px-5 pb-5 space-y-4 border-t border-violet-200/60">
            <div className="pt-4">
              <label className="block text-sm font-bold text-violet-800 mb-2">Payment Amount (RM) *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 font-bold">RM</span>
                <input
                  className="w-full rounded-xl bg-white border border-violet-200 pl-10 pr-4 py-3 text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder={finalAmount.toFixed(2)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required={recordPayment}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-violet-800 mb-2">Payment Method *</label>
              <div className="relative">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full appearance-none rounded-xl bg-white border border-violet-200 px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"></path></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-violet-800 mb-2">Receipt Photo (optional)</label>
              <div className="rounded-xl border-2 border-dashed border-violet-200 bg-white p-4 hover:border-violet-400 transition-all">
                <input
                  className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-violet-100 file:text-violet-700 hover:file:bg-violet-200 file:cursor-pointer"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                />
                {receiptFile && (
                  <div className="mt-2 text-xs text-violet-700 bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-100 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    {receiptFile.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 text-sm font-medium text-center">{error}</p>}

      <div className="flex gap-4 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border-2 border-slate-200 py-3 text-slate-600 font-semibold hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white py-3 font-bold shadow-md hover:shadow-lg transition-all shadow-emerald-500/30"
        >
          {submitting ? 'Saving…' : 'Mark Job Done ✓'}
        </button>
      </div>
    </form>
  );
}
