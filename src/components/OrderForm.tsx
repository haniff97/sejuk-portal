import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { TECHNICIANS } from '../types/order';
import type { Order } from '../types/order';

const SERVICE_TYPES = ['Installation', 'Servicing', 'Repair', 'Gas Refill', 'Cleaning'];

interface Props {
  onCreated: (order: Order) => void;
}

function generateOrderNo() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORDER${Date.now().toString().slice(-6)}${rand}`;
}

export default function OrderForm({ onCreated }: Props) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [quotedPrice, setQuotedPrice] = useState('');
  const [assignedTechnician, setAssignedTechnician] = useState(TECHNICIANS[0]);
  const [adminNotes, setAdminNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setCustomerName('');
    setPhone('');
    setAddress('');
    setProblemDescription('');
    setServiceType(SERVICE_TYPES[0]);
    setQuotedPrice('');
    setAssignedTechnician(TECHNICIANS[0]);
    setAdminNotes('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const price = parseFloat(quotedPrice);
    if (!customerName || !phone || !address || !problemDescription || Number.isNaN(price)) {
      setError('Please fill in all required fields with a valid quoted price.');
      return;
    }

    setSubmitting(true);

    const { data, error: insertError } = await supabase
      .from('orders')
      .insert({
        order_no: generateOrderNo(),
        customer_name: customerName,
        phone,
        address,
        problem_description: problemDescription,
        service_type: serviceType,
        quoted_price: price,
        assigned_technician: assignedTechnician,
        admin_notes: adminNotes || null,
        status: 'Assigned',
      })
      .select()
      .single();

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onCreated(data as Order);
    resetForm();
  }

  const inputClass =
    'w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500';
  const labelClass = 'block text-sm text-slate-400 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-800 p-5">
      <h2 className="text-lg font-semibold text-slate-100">New Order</h2>

      <div>
        <label className={labelClass}>Customer Name *</label>
        <input className={inputClass} value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Phone *</label>
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Service Type</label>
          <select className={inputClass} value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Address *</label>
        <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} required />
      </div>

      <div>
        <label className={labelClass}>Problem Description *</label>
        <textarea
          className={inputClass}
          rows={3}
          value={problemDescription}
          onChange={(e) => setProblemDescription(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Quoted Price (RM) *</label>
          <input
            className={inputClass}
            type="number"
            step="0.01"
            min="0"
            value={quotedPrice}
            onChange={(e) => setQuotedPrice(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Assigned Technician</label>
          <select
            className={inputClass}
            value={assignedTechnician}
            onChange={(e) => setAssignedTechnician(e.target.value as typeof assignedTechnician)}
          >
            {TECHNICIANS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Admin Notes</label>
        <textarea className={inputClass} rows={2} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white py-2 font-medium"
      >
        {submitting ? 'Submitting…' : 'Create Order'}
      </button>
    </form>
  );
}
