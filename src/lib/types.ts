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
  Start_Print: string | null;
  Print_ReadyPress: string | null;
  Ambil_Kain: string | null;
  Kain_ReadyPress: string | null;
  Start_Press: string | null;
  Press_ReadyCut: string | null;
  Start_Cut: string | null;
  Cut_ReadyJahit: string | null;
  Start_Jahit: string | null;
  Jahit_ReadyQC: string | null;
  Start_QC: string | null;
  FinalQC_Packiing: string | null;
  Final_Cust: string | null;
  status_lanjutan?: string | null;
  datetime_lanjutan?: string | null;
  jenis_order?: string | null;
};

export type FoDetailItemRow = {
  id: number;
  no_fo: string;
  detail_item: string;
  qty: number;
  produk: string | null;
  model: string | null;
  bahan: string | null;
  size: string | null;
};

export type FoDetailItemsResponse = {
  count: number;
  items: FoDetailItemRow[];
  page: number;
  limit: number | "all";
  totalPages: number;
};

export type FoJobDetailRow = {
  id: number;
  no_job: string;
  no_fo: string;
  datetime_awal: string | null;
  status_awal: string | null;
  datetime_lanjutan: string | null;
  username: string | null;
  nama_pegawai: string | null;
  jobdesk: string | null;
  ket: string | null;
  status_lanjutan: string | null;
};

export type FoJobDetailsResponse = {
  count: number;
  items: FoJobDetailRow[];
  page: number;
  limit: number | "all";
  totalPages: number;
};

export type FoListRow = {
  no_fo: string;
  order_date: string | null;
  doc_date: string | null;
  deadline_date: string | null;
  datetime_lanjutan: string | null;
  customer: string | null;
  qty_order: number | null;
  status_lanjutan: string | null;
};

export type FoListResponse = {
  count: number;
  items: FoListRow[];
  page: number;
  limit: number | "all";
  totalPages: number;
};

export type AdminAccount = {
  kd_user: string;
  nm_user: string;
  no_hp: string;
  pengguna: string;
  tingkat: string;
  LastOnline?: string;
};

export type AdminAccountsResponse = {
  count: number;
  items: AdminAccount[];
  page: number;
  limit: number;
  totalPages: number;
};

export type UserPermissionResponse = {
  kd_user: string;
  updated_at?: string;
  permissions: Record<string, Record<string, boolean>>;
};

