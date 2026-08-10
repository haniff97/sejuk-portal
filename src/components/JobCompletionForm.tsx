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

export default function JobCompletionForm({ order, technicianName, onCompleted, onCancel }: Props) {
  const [workDone, setWorkDone] = useState('');
  const [extraCharges, setExtraCharges] = useState('0');
  const [remarks, setRemarks] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extra = parseFloat(extraCharges) || 0;
  const finalAmount = order.quoted_price + extra;

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
      const path = `${order.order_no}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('job-attachments')
        .upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('job-attachments').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!workDone.trim()) {
      setError('Please describe the work done.');
      return;
    }

    setSubmitting(true);
    try {
      const attachmentUrls = files.length > 0 ? await uploadFiles() : [];

      const { data, error: updateError } = await supabase
        .from('orders')
        .update({
          work_done: workDone,
          extra_charges: extra,
          final_amount: finalAmount,
          remarks: remarks || null,
          attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
          status: 'Job Done',
          updated_at: new Date().toISOString(),
        })
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
    'w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500';
  const labelClass = 'block text-sm text-slate-400 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md bg-slate-900 border border-slate-800 p-3 text-sm text-slate-300">
        <div><span className="text-slate-500">Order ID:</span> {order.order_no}</div>
        <div><span className="text-slate-500">Customer:</span> {order.customer_name}</div>
        <div><span className="text-slate-500">Quoted:</span> RM {order.quoted_price.toFixed(2)}</div>
      </div>

      <div>
        <label className={labelClass}>Work Done *</label>
        <textarea className={inputClass} rows={3} value={workDone} onChange={(e) => setWorkDone(e.target.value)} required />
      </div>

      <div>
        <label className={labelClass}>Extra Charges (RM)</label>
        <input
          className={inputClass}
          type="number"
          step="0.01"
          min="0"
          value={extraCharges}
          onChange={(e) => setExtraCharges(e.target.value)}
        />
      </div>

      <div className="rounded-md bg-slate-900 border border-slate-800 p-3 text-sm">
        <span className="text-slate-500">Final Amount (auto):</span>{' '}
        <span className="text-slate-100 font-medium">RM {finalAmount.toFixed(2)}</span>
      </div>

      <div>
        <label className={labelClass}>Photos / Video / PDF (max {MAX_FILES})</label>
        <input
          className={inputClass}
          type="file"
          accept="image/*,video/*,application/pdf"
          multiple
          onChange={handleFileChange}
        />
        {files.length > 0 && (
          <p className="text-xs text-slate-500 mt-1">{files.length} file(s) selected</p>
        )}
      </div>

      <div>
        <label className={labelClass}>Remarks</label>
        <textarea className={inputClass} rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </div>

      <div className="text-sm text-slate-500">
        Technician: {technicianName} · {new Date().toLocaleString()}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md border border-slate-700 py-3 text-slate-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 font-medium"
        >
          {submitting ? 'Saving…' : 'Mark Job Done'}
        </button>
      </div>
    </form>
  );
}
