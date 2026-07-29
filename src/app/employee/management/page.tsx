"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Building2,
  TrendingUp,
  Wrench,
  Pencil,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  CheckCircle2,
  AlertOctagon,
  Copy,
  Check,
  ArrowRight,
  Briefcase,
  IdCard,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { api, ApiError } from "@/lib/api";
import type { Employee } from "@/lib/types";

const DEPARTMENTS = ["OFFICE", "MARKETING", "PRODUKSI"];

type NotificationState = {
  isOpen: boolean;
  type: "success" | "error";
  title: string;
  message: string;
  details?: string;
  sqlState?: string;
  code?: string;
  sqlMessage?: string;
};

function DeptBadge({ dept }: { dept: string }) {
  const cls =
    dept === "OFFICE"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
      : dept === "MARKETING"
      ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
      : "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${cls}`}>
      {dept}
    </span>
  );
}

export default function EmployeeManagementPage() {
  const queryClient = useQueryClient();

  // Main Table State
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(5);

  // Department Modal State
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [deptSearch, setDeptSearch] = useState("");
  const [deptLimit, setDeptLimit] = useState<number>(5);
  const [deptPage, setDeptPage] = useState(1);

  // Add Employee Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ nm_karyawan: "", dept: "OFFICE", jabatan: "" });

  // Edit Employee Modal State
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({ id_karyawan: "", nm_karyawan: "", dept: "", jabatan: "" });

  // Notification State
  const [notification, setNotification] = useState<NotificationState>({
    isOpen: false, type: "success", title: "", message: "",
  });
  const [copiedDetails, setCopiedDetails] = useState(false);

  // Main Table Query
  const { data: employeeData, isLoading: isMainLoading, isError: isMainError } = useQuery({
    queryKey: ["employees", page, limit, search],
    queryFn: () => api.getEmployees({ page, limit, search }),
  });

  // Department Modal Query (with pagination & search)
  const { data: deptData, isLoading: isDeptLoading } = useQuery({
    queryKey: ["employees-dept", selectedDept, deptPage, deptLimit, deptSearch],
    queryFn: () => api.getEmployees({ page: deptPage, limit: deptLimit, search: deptSearch, dept: selectedDept || "" }),
    enabled: !!selectedDept,
  });

  // Add Mutation
  const addMutation = useMutation({
    mutationFn: (payload: { nm_karyawan: string; dept: string; jabatan: string }) => api.addEmployee(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setIsAddModalOpen(false);
      setAddForm({ nm_karyawan: "", dept: "OFFICE", jabatan: "" });
      showSuccess("Karyawan Berhasil Ditambahkan", `Karyawan baru berhasil disimpan dengan NIP: ${data.id_karyawan}`);
    },
    onError: (err: any) => showApiError("Gagal Menambahkan Karyawan", err),
  });

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: (payload: { id_karyawan: string; nm_karyawan: string; dept: string; jabatan: string }) =>
      api.updateEmployee(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees-dept"] });
      setEditingEmployee(null);
      showSuccess("Data Karyawan Diperbarui", data.message || "Perubahan data berhasil disimpan.");
    },
    onError: (err: any) => showApiError("Gagal Memperbarui Karyawan", err),
  });

  function showSuccess(title: string, message: string) {
    setNotification({ isOpen: true, type: "success", title, message });
  }

  function showApiError(title: string, err: any) {
    const isApiError = err instanceof ApiError;
    setNotification({
      isOpen: true,
      type: "error",
      title,
      message: err.message || "Terjadi kesalahan.",
      details: isApiError ? err.details : String(err),
      sqlState: isApiError ? err.sqlState : undefined,
      code: isApiError ? err.code : undefined,
      sqlMessage: isApiError ? err.sqlMessage : undefined,
    });
  }

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditForm({ id_karyawan: emp.id_karyawan, nm_karyawan: emp.nm_karyawan, dept: emp.dept, jabatan: emp.jabatan });
  };

  const handleOpenDept = (dept: string) => {
    setSelectedDept(dept);
    setDeptSearch("");
    setDeptLimit(5);
    setDeptPage(1);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.nm_karyawan.trim() || !addForm.jabatan.trim()) {
      return showSuccess("Input Tidak Lengkap", "Nama dan jabatan wajib diisi.");
    }
    addMutation.mutate(addForm);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.nm_karyawan.trim() || !editForm.jabatan.trim()) {
      return showSuccess("Input Tidak Lengkap", "Nama dan jabatan tidak boleh kosong.");
    }
    editMutation.mutate(editForm);
  };

  const copyErrorToClipboard = () => {
    const t = `Error: ${notification.title}\nMessage: ${notification.message}\nSQL State: ${notification.sqlState || "-"}\nCode: ${notification.code || "-"}\nSQL Message: ${notification.sqlMessage || "-"}\nDetails:\n${notification.details || "-"}`;
    navigator.clipboard.writeText(t);
    setCopiedDetails(true);
    setTimeout(() => setCopiedDetails(false), 2000);
  };

  const deptCounts = employeeData?.departmentCounts || { OFFICE: 0, MARKETING: 0, PRODUKSI: 0, TOTAL: 0 };

  const departmentCards = [
    { name: "OFFICE", title: "Departement Office", description: "Personil manajemen, keuangan, dan administrasi kantor.", icon: Building2, count: deptCounts.OFFICE, tone: "text-blue-300" },
    { name: "MARKETING", title: "Departement Marketing", description: "Tim pemasaran, penjualan, dan hubungan pelanggan.", icon: TrendingUp, count: deptCounts.MARKETING, tone: "text-purple-300" },
    { name: "PRODUKSI", title: "Departement Produksi", description: "Tim operator pabrik, layout, press, cutting, dan QC.", icon: Wrench, count: deptCounts.PRODUKSI, tone: "text-amber-300" },
  ];

  const inputCls = "h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-400";
  const selectCls = "h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400";

  return (
    <>
      {/* Page Header */}
      <PageHeader
        title="Management Employee"
        description="Kelola data departemen, karyawan, dan jabatan pada sistem AllStar."
        action={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Employee</span>
            <span className="sm:hidden">Add</span>
          </button>
        }
      />

      {/* 1. Department Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {departmentCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.name}
              onClick={() => handleOpenDept(card.name)}
              className="group rounded-xl border border-slate-800 bg-slate-900/70 p-5 text-left shadow-sm shadow-slate-950/20 hover:border-cyan-400/40 hover:bg-slate-900 transition flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-4">
                <div className={`flex size-11 items-center justify-center rounded-lg bg-slate-950 ${card.tone}`}>
                  <Icon size={22} />
                </div>
                <ArrowRight size={18} className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-300" />
              </div>
              <div className="mt-6 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{card.title}</h2>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">{card.description}</p>
                </div>
                <span className="text-3xl font-bold text-white font-mono tracking-tight shrink-0">{card.count}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Employee Table Section */}
      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-6 backdrop-blur-md shadow-xl shadow-slate-950/20 space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Users className="text-cyan-400 size-5 shrink-0" />
              Daftar Karyawan
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Daftar lengkap seluruh karyawan terdaftar dalam sistem dari database.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px] sm:w-60 sm:flex-initial">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Cari NIP atau nama..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className={`${inputCls} pl-8`}
              />
            </div>
            {/* Limit */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 whitespace-nowrap hidden sm:inline">Tampil:</span>
              <select
                value={String(limit)}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className={selectCls}
              >
                {[5, 10, 25, 50, 100].map((o) => (
                  <option key={o} value={o}>{o} data</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-950/40">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">NIP</th>
                <th className="px-5 py-3.5">Nama Karyawan</th>
                <th className="px-5 py-3.5">Departemen</th>
                <th className="px-5 py-3.5">Jabatan</th>
                <th className="px-5 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {isMainLoading ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400 italic">
                  <Loader2 className="mx-auto size-6 animate-spin text-cyan-400 mb-2" />
                  Memuat data karyawan...
                </td></tr>
              ) : isMainError ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-rose-400 font-medium">
                  Gagal memuat data karyawan dari server.
                </td></tr>
              ) : !employeeData?.items?.length ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500 italic">
                  Karyawan tidak ditemukan.
                </td></tr>
              ) : (
                employeeData.items.map((emp) => (
                  <tr key={emp.id_karyawan} className="border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors text-slate-300">
                    <td className="px-5 py-4 font-mono font-bold text-cyan-300 tracking-wide whitespace-nowrap">{emp.id_karyawan}</td>
                    <td className="px-5 py-4 font-semibold text-white">{emp.nm_karyawan}</td>
                    <td className="px-5 py-4"><DeptBadge dept={emp.dept} /></td>
                    <td className="px-5 py-4 text-slate-300 font-medium">{emp.jabatan}</td>
                    <td className="px-5 py-4 text-center">
                      <button onClick={() => handleOpenEdit(emp)} title="Edit" className="inline-flex size-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 transition hover:bg-cyan-500 hover:text-white">
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Card List */}
        <div className="lg:hidden space-y-2">
          {isMainLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="size-8 animate-spin text-cyan-400 mb-2" />
              <p className="text-xs">Memuat data karyawan...</p>
            </div>
          ) : isMainError ? (
            <div className="rounded-lg border border-rose-500/20 bg-rose-950/10 p-4 text-center text-xs text-rose-400">
              Gagal memuat data karyawan dari server.
            </div>
          ) : !employeeData?.items?.length ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-500 italic">
              Karyawan tidak ditemukan.
            </div>
          ) : (
            employeeData.items.map((emp) => (
              <div key={emp.id_karyawan} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-start justify-between gap-3 hover:border-slate-700 transition-colors">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-cyan-300 text-sm tracking-wide">{emp.id_karyawan}</span>
                    <DeptBadge dept={emp.dept} />
                  </div>
                  <p className="font-semibold text-white text-sm truncate">{emp.nm_karyawan}</p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Briefcase size={12} className="shrink-0" />
                    <span>{emp.jabatan}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenEdit(emp)}
                  title="Edit"
                  className="shrink-0 inline-flex size-9 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 transition hover:bg-cyan-500 hover:text-white"
                >
                  <Pencil size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {employeeData && employeeData.totalPages > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row text-xs text-slate-400">
            <p className="text-center sm:text-left">
              Halaman <span className="font-semibold text-white">{employeeData.page}</span> dari{" "}
              <span className="font-semibold text-white">{employeeData.totalPages}</span>{" "}
              <span className="text-slate-500">(Total {employeeData.totalCount} karyawan)</span>
            </p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>
              <span className="px-2 font-mono font-medium text-slate-400">{page} / {employeeData.totalPages}</span>
              <button
                disabled={page >= employeeData.totalPages}
                onClick={() => setPage((p) => Math.min(employeeData.totalPages, p + 1))}
                className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="hidden sm:inline">Berikutnya</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. Department Modal (with search, limit & pagination) */}
      {selectedDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-4 bg-slate-900/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400 border border-cyan-500/20 shrink-0">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Anggota Departemen {selectedDept}
                  </h3>
                  <p className="text-xs text-slate-400 hidden sm:block">
                    Daftar karyawan di departemen {selectedDept}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedDept(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Modal Controls */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-3 border-b border-slate-800/60 bg-slate-900/40 shrink-0">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari NIP atau nama..."
                  value={deptSearch}
                  onChange={(e) => { setDeptSearch(e.target.value); setDeptPage(1); }}
                  className={`${inputCls} pl-8`}
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400 whitespace-nowrap">Tampil:</span>
                <select
                  value={String(deptLimit)}
                  onChange={(e) => { setDeptLimit(Number(e.target.value)); setDeptPage(1); }}
                  className={selectCls}
                >
                  {[5, 10, 25, 50, 100].map((o) => (
                    <option key={o} value={o}>{o} data</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-6">
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-950/40">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">NIP</th>
                      <th className="px-5 py-3.5">Nama Karyawan</th>
                      <th className="px-5 py-3.5">Departemen</th>
                      <th className="px-5 py-3.5">Jabatan</th>
                      <th className="px-5 py-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {isDeptLoading ? (
                      <tr><td colSpan={5} className="py-10 text-center text-slate-400 italic">
                        <Loader2 className="mx-auto size-5 animate-spin text-cyan-400 mb-2" />
                        Memuat data...
                      </td></tr>
                    ) : !deptData?.items?.length ? (
                      <tr><td colSpan={5} className="py-8 text-center text-slate-500 italic">
                        Tidak ada karyawan yang cocok.
                      </td></tr>
                    ) : (
                      deptData.items.map((emp) => (
                        <tr key={emp.id_karyawan} className="border-b border-slate-800/60 hover:bg-slate-900/60 transition-colors text-slate-300">
                          <td className="px-5 py-4 font-mono font-bold text-cyan-300 tracking-wide whitespace-nowrap">{emp.id_karyawan}</td>
                          <td className="px-5 py-4 font-semibold text-white">{emp.nm_karyawan}</td>
                          <td className="px-5 py-4"><DeptBadge dept={emp.dept} /></td>
                          <td className="px-5 py-4 text-slate-300 font-medium">{emp.jabatan}</td>
                          <td className="px-5 py-4 text-center">
                            <button onClick={() => handleOpenEdit(emp)} title="Edit" className="inline-flex size-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 transition hover:bg-cyan-500 hover:text-white">
                              <Pencil size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile List */}
              <div className="sm:hidden space-y-2">
                {isDeptLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <Loader2 className="size-7 animate-spin text-cyan-400 mb-2" />
                    <p className="text-xs">Memuat data...</p>
                  </div>
                ) : !deptData?.items?.length ? (
                  <div className="rounded-lg border border-slate-800 p-8 text-center text-xs text-slate-500 italic">
                    Tidak ada karyawan yang cocok.
                  </div>
                ) : (
                  deptData.items.map((emp) => (
                    <div key={emp.id_karyawan} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-cyan-300 text-sm">{emp.id_karyawan}</span>
                          <DeptBadge dept={emp.dept} />
                        </div>
                        <p className="font-semibold text-white text-sm">{emp.nm_karyawan}</p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Briefcase size={12} />
                          <span>{emp.jabatan}</span>
                        </div>
                      </div>
                      <button onClick={() => handleOpenEdit(emp)} className="shrink-0 inline-flex size-9 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 transition hover:bg-cyan-500 hover:text-white">
                        <Pencil size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer (Pagination + Close) */}
            <div className="border-t border-slate-800 bg-slate-900/80 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {deptData && deptData.totalPages > 0 ? (
                <>
                  <p className="text-xs text-slate-400 text-center sm:text-left">
                    Halaman <span className="font-semibold text-white">{deptData.page}</span> dari{" "}
                    <span className="font-semibold text-white">{deptData.totalPages}</span>{" "}
                    <span className="text-slate-500">(Total {deptData.totalCount})</span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={deptPage <= 1}
                      onClick={() => setDeptPage((p) => Math.max(1, p - 1))}
                      className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={14} />
                      <span className="hidden sm:inline">Sebelumnya</span>
                    </button>
                    <span className="px-2 font-mono text-xs text-slate-400">{deptPage} / {deptData.totalPages}</span>
                    <button
                      disabled={deptPage >= deptData.totalPages}
                      onClick={() => setDeptPage((p) => Math.min(deptData.totalPages, p + 1))}
                      className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="hidden sm:inline">Berikutnya</span>
                      <ChevronRight size={14} />
                    </button>
                    <button onClick={() => setSelectedDept(null)} className="ml-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700">
                      Tutup
                    </button>
                  </div>
                </>
              ) : (
                <div className="ml-auto">
                  <button onClick={() => setSelectedDept(null)} className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700">
                    Tutup
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
            {addMutation.isPending && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm">
                <Loader2 className="size-10 animate-spin text-cyan-400" />
                <p className="mt-3 text-sm font-semibold text-white">Processing Data...</p>
                <p className="text-xs text-slate-400">Menyimpan karyawan baru ke database</p>
              </div>
            )}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 sm:px-6 py-4 bg-slate-900/80">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus size={18} className="text-cyan-400" /> Add Employee
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap <span className="text-rose-400">*</span></label>
                <input type="text" required placeholder="Masukkan nama lengkap karyawan" value={addForm.nm_karyawan}
                  onChange={(e) => setAddForm({ ...addForm, nm_karyawan: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Departemen <span className="text-rose-400">*</span></label>
                <select value={addForm.dept} onChange={(e) => setAddForm({ ...addForm, dept: e.target.value })} className={`${selectCls} w-full`}>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Jabatan <span className="text-rose-400">*</span></label>
                <input type="text" required placeholder="Contoh: CASHIER, LAYOUT, DIREKSI" value={addForm.jabatan}
                  onChange={(e) => setAddForm({ ...addForm, jabatan: e.target.value })} className={inputCls} />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700">
                  Batal
                </button>
                <button type="submit" disabled={addMutation.isPending} className="rounded-lg bg-cyan-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-cyan-500">
                  Add Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
            {editMutation.isPending && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm">
                <Loader2 className="size-10 animate-spin text-cyan-400" />
                <p className="mt-3 text-sm font-semibold text-white">Processing Edit Data...</p>
                <p className="text-xs text-slate-400">Updating data karyawan ke database</p>
              </div>
            )}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 sm:px-6 py-4 bg-slate-900/80">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil size={16} className="text-cyan-400" /> Edit Karyawan
              </h3>
              <button onClick={() => setEditingEmployee(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">NIP (Nomor Induk Pegawai)</label>
                <input type="text" disabled value={editForm.id_karyawan}
                  className="h-9 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-xs font-mono font-bold text-cyan-400 opacity-70 cursor-not-allowed" />
                <p className="mt-1 text-[10px] text-slate-500">NIP bersifat permanen dan tidak boleh diubah.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap <span className="text-rose-400">*</span></label>
                <input type="text" required placeholder="Masukkan nama lengkap" value={editForm.nm_karyawan}
                  onChange={(e) => setEditForm({ ...editForm, nm_karyawan: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Departemen <span className="text-rose-400">*</span></label>
                <select value={editForm.dept} onChange={(e) => setEditForm({ ...editForm, dept: e.target.value })} className={`${selectCls} w-full`}>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Jabatan <span className="text-rose-400">*</span></label>
                <input type="text" required placeholder="Jabatan karyawan" value={editForm.jabatan}
                  onChange={(e) => setEditForm({ ...editForm, jabatan: e.target.value })} className={inputCls} />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setEditingEmployee(null)} className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700">
                  Batal
                </button>
                <button type="submit" disabled={editMutation.isPending} className="rounded-lg bg-cyan-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-cyan-500">
                  Edit Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Notification Modal */}
      {notification.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className={`relative w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl bg-slate-950 ${notification.type === "success" ? "border-emerald-500/40" : "border-rose-500/40"}`}>
            <div className={`flex items-center justify-between border-b px-5 sm:px-6 py-4 ${notification.type === "success" ? "border-emerald-500/20 bg-emerald-950/40" : "border-rose-500/20 bg-rose-950/40"}`}>
              <div className="flex items-center gap-3">
                {notification.type === "success"
                  ? <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
                  : <AlertOctagon size={22} className="text-rose-400 shrink-0" />}
                <h3 className={`text-sm sm:text-base font-bold ${notification.type === "success" ? "text-emerald-300" : "text-rose-300"}`}>
                  {notification.title}
                </h3>
              </div>
              <button onClick={() => setNotification({ ...notification, isOpen: false })} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              <p className="text-sm font-medium text-slate-200">{notification.message}</p>
              {notification.type === "error" && (notification.details || notification.sqlState || notification.code) && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Developer Error Diagnostics</span>
                    <button onClick={copyErrorToClipboard} className="flex items-center gap-1 rounded bg-rose-900/40 px-2 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-800/50">
                      {copiedDetails ? <><Check size={12} className="text-emerald-400" /><span>Copied</span></> : <><Copy size={12} /><span>Copy</span></>}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {notification.sqlState && <div><span className="text-slate-400">SQL State: </span><span className="font-bold text-amber-300">{notification.sqlState}</span></div>}
                    {notification.code && <div><span className="text-slate-400">Error Code: </span><span className="font-bold text-rose-300">{notification.code}</span></div>}
                  </div>
                  {notification.sqlMessage && (
                    <div className="text-xs font-mono">
                      <span className="text-slate-400">SQL Message: </span>
                      <p className="text-rose-200 mt-0.5 bg-slate-900/80 p-2 rounded border border-rose-500/20">{notification.sqlMessage}</p>
                    </div>
                  )}
                  {notification.details && (
                    <div className="text-[11px] font-mono">
                      <span className="text-slate-400">Detail Trace: </span>
                      <pre className="mt-1 max-h-36 overflow-y-auto whitespace-pre-wrap rounded bg-slate-950 p-2.5 text-slate-300 text-[10px] border border-slate-800">
                        {notification.details}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="border-t border-slate-800 bg-slate-900/60 px-5 sm:px-6 py-3 text-right">
              <button
                onClick={() => setNotification({ ...notification, isOpen: false })}
                className={`rounded-lg px-5 py-2 text-xs font-semibold transition ${notification.type === "success" ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-rose-600 text-white hover:bg-rose-500"}`}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
