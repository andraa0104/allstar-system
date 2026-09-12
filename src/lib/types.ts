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
  qty_order?: number | null;
  status?: string | null;
  status_lanjutan?: string | null;
  datetime_lanjutan?: string | null;
  deadline_days?: number;
  deadline_date?: string | null;
  uang_muka?: number | null;
  sisa_tagihan?: number | null;
  totalrp?: number | null;
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
  uang_muka?: number | null;
  sisa_tagihan?: number | null;
  totalrp?: number | null;
};

export type FoListResponse = {
  count: number;
  totalQty?: number;
  totalStel?: number;
  totalPcs?: number;
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

export type MonitoringStaffRow = {
  no_job: string;
  no_fo: string;
  order_date: string | null;
  customer: string | null;
  qty_order: number | null;
  nama_pegawai: string | null;
  pcs_count: number;
  stel_count: number;
};

export type MonitoringStaffResponse = {
  count: number;
  totalQty: number;
  totalPcs: number;
  totalStel: number;
  items: MonitoringStaffRow[];
  page: number;
  limit: number | "all";
  totalPages: number;
};

export type SalaryPeriodType = "hari" | "minggu" | "bulan";
export type SalaryOperatorType = "kali" | "bagi";

export type EmployeeSalaryCalculated = {
  daily_basic: number;
  monthly_basic: number;
  daily_makan: number;
  monthly_makan: number;
  daily_transport: number;
  monthly_transport: number;
  daily_total: number;
  monthly_total: number;
};

export type EmployeeSalaryConfig = {
  id: number;
  id_karyawan: string;
  nm_karyawan: string;
  dept: string;
  jabatan: string;
  basic_salary: number;
  salary_period: SalaryPeriodType;
  salary_operator: SalaryOperatorType;
  salary_factor: number;
  makan_nominal: number;
  makan_period: SalaryPeriodType;
  makan_operator: SalaryOperatorType;
  makan_factor: number;
  transport_nominal: number;
  transport_period: SalaryPeriodType;
  transport_operator: SalaryOperatorType;
  transport_factor: number;
  salary_notes?: string | null;
  calculated: EmployeeSalaryCalculated;
};

export type EmployeeSalarySummary = {
  total_employees: number;
  total_basic_payroll: number;
  total_makan_payroll: number;
  total_transport_payroll: number;
  total_monthly_payroll: number;
};

export type EmployeeSalaryResponse = {
  count: number;
  items: EmployeeSalaryConfig[];
  page: number;
  limit: number | "all";
  totalPages: number;
  summary: EmployeeSalarySummary;
};

export type UpdateEmployeeSalaryPayload = {
  id: number;
  basic_salary: number;
  salary_period: SalaryPeriodType;
  salary_operator: SalaryOperatorType;
  salary_factor: number;
  makan_nominal: number;
  makan_period: SalaryPeriodType;
  makan_operator: SalaryOperatorType;
  makan_factor: number;
  transport_nominal: number;
  transport_period: SalaryPeriodType;
  transport_operator: SalaryOperatorType;
  transport_factor: number;
  salary_notes?: string | null;
};

export type SalaryPeriodRate = {
  basic: number;
  makan: number;
  transport: number;
  total: number;
};

export type EmployeeSalaryMyBreakdown = {
  daily: SalaryPeriodRate;
  weekly: SalaryPeriodRate;
  monthly: SalaryPeriodRate;
};

export type EmployeeSalaryConfigDetail = {
  basic_salary: number;
  salary_period: SalaryPeriodType;
  salary_operator: SalaryOperatorType;
  salary_factor: number;
  makan_nominal: number;
  makan_period: SalaryPeriodType;
  makan_operator: SalaryOperatorType;
  makan_factor: number;
  transport_nominal: number;
  transport_period: SalaryPeriodType;
  transport_operator: SalaryOperatorType;
  transport_factor: number;
  salary_notes?: string | null;
};

export type MySalaryResponse = {
  karyawan: {
    id: number;
    id_karyawan: string;
    nm_karyawan: string;
    dept: string;
    jabatan: string;
    config: EmployeeSalaryConfigDetail;
    breakdown: EmployeeSalaryMyBreakdown;
  } | null;
  user: {
    kd_user?: string;
    nm_user?: string;
    pengguna?: string;
    tingkat?: string;
    username?: string;
  };
  message?: string;
};

// ─── Wage Categories (tb_kategori_pakaian) ──────────────────────────────────

export type KategoriPakaian = {
  id: number;
  parent_id: number | null;
  nama: string;
  created_at?: string;
  updated_at?: string;
  children?: KategoriPakaian[];
};

export type WageCategoriesResponse = {
  items: KategoriPakaian[];
};

export type WageCategorySuggestResponse = {
  suggestions: string[];
};

// ─── Wage Rates (tb_tarif_upah) ─────────────────────────────────────────────

export type TarifUpah = {
  id: number;
  kategori_id: number;
  jobdesk: string;
  harga: number;
  keterangan: string | null;
  created_at?: string;
  updated_at?: string;
  kategori_nama?: string;
  kategori_parent_id?: number | null;
};

export type WageRatesResponse = {
  items: TarifUpah[];
  jobdesk_options: string[];
  count: number;
};

export type CreateWageCategoryPayload = {
  parent_id?: number | null;
  nama: string;
};

export type UpdateWageCategoryPayload = {
  id: number;
  nama: string;
  parent_id?: number | null;
};

export type CreateWageRatePayload = {
  kategori_id: number;
  jobdesk: string;
  harga: number;
  keterangan?: string | null;
};

export type UpdateWageRatePayload = {
  id: number;
  harga: number;
  keterangan?: string | null;
};
