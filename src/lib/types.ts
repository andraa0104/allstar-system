export type UserRole = "admin" | "manager" | "staff" | "production" | string;

export type SessionUser = {
  id: string;
  name: string;
  phone?: string;
  username: string;
  role: UserRole;
};

export type LoginPayload = {
  username: string;
  password: string;
};

export type LoginResponse = {
  id?: string | number;
  user_id?: string | number;
  name?: string;
  nama?: string;
  phone?: string;
  telp?: string;
  username: string;
  role?: UserRole;
  level?: UserRole;
  data?: Partial<LoginResponse>;
};

export type OrderStatus = "pending" | "active" | "completed";

export type ProductionOrder = {
  id: string | number;
  customer?: string;
  customer_name?: string;
  client?: string;
  product?: string;
  item?: string;
  order_number?: string;
  no_order?: string;
  quantity?: number | string;
  qty?: number | string;
  deadline?: string;
  due_date?: string;
  status?: string;
  progress?: number;
  created_at?: string;
  updated_at?: string;
  notes?: string;
};

export type FoOutstandingRow = {
  no_fo: string;
  doc_date: string | null;
  customer: string | null;
  status?: string | null;
  status_lanjutan?: string | null;
  datetime_lanjutan?: string | null;
  deadline_days?: number;
  deadline_date?: string | null;
};

export type FoOutstandingResponse = {
  count: number;
  items: FoOutstandingRow[];
  page: number;
  limit: number | "all";
  totalPages: number;
};

export type AccountPayload = {
  name: string;
  phone: string;
  username: string;
  password: string;
  level: string;
};

export type ProfilePayload = {
  id: string;
  name: string;
  phone: string;
  username: string;
};

export type PasswordPayload = {
  id: string;
  currentPassword: string;
  newPassword: string;
};

export type PermissionMatrix = Record<string, Record<string, boolean>>;

export type FoDetailData = {
  no_fo: string;
  doc_date: string | null;
  order_date: string | null;
  deposit_date: string | null;
  customer: string | null;
  qty_order: number | null;
  remark: string | null;
  deadline_date: string | null;
  pos_date: string | null;
  QC_ReadyGudang: string | null;
  sales: string | null;
  desain: string | null;
  totalrp: number | null;
  uang_muka: number | null;
  tgl_um: string | null;
  sisa_tagihan: number | null;
  bayar_lunas: number | null;
  tgl_pelunasan: string | null;
  telp_cus: string | null;
  Desain_Ready: string | null;
  Start_Layout: string | null;
  Layout_Ready: string | null;
};
