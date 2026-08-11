export type Role = 'Admin' | 'Technician' | 'Manager';

export type OrderStatus =
  | 'New'
  | 'Assigned'
  | 'In Progress'
  | 'Job Done'
  | 'Reviewed'
  | 'Closed';

export const TECHNICIANS = ['Ali', 'John', 'Bala', 'Yusoff'] as const;
export type Technician = (typeof TECHNICIANS)[number];

export interface Order {
  id: string;
  order_no: string;
  customer_name: string;
  phone: string;
  address: string;
  problem_description: string;
  service_type: string;
  quoted_price: number;
  assigned_technician: Technician | null;
  admin_notes: string | null;
  status: OrderStatus;
  work_done: string | null;
  extra_charges: number | null;
  final_amount: number | null;
  remarks: string | null;
  attachments: string[] | null;
  technician_name: string | null;
  completed_at: string | null;
  // Payment recording (optional)
  payment_received: number | null;
  payment_method: string | null;
  payment_receipt_url: string | null;
  created_at: string;
  updated_at: string;
}
