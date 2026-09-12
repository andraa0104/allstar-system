"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Calculator,
  Search,
  Filter,
  ArrowUpDown,
  Edit3,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  Users,
  Utensils,
  Car,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Briefcase,
  TrendingUp,
  Copy,
  Check,
  Terminal,
} from "lucide-react";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import type {
  EmployeeSalaryConfig,
  SalaryPeriodType,
  SalaryOperatorType,
  UpdateEmployeeSalaryPayload,
} from "@/lib/types";

function parseDotsToNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const digits = String(val).replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function formatRupiah(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Rp 0";
  const num = typeof value === "number" ? value : parseDotsToNumber(value);
  if (isNaN(num)) return "Rp 0";
  return "Rp " + Math.round(num).toLocaleString("id-ID");
}

function calculateRateLocal(
  nominal: number,
  period: SalaryPeriodType,
  operator: SalaryOperatorType,
  factor: number
) {
  const f = factor > 0 ? factor : 26;
  let daily = 0;
  let monthly = 0;

  if (period === "bulan") {
    if (operator === "bagi") {
      daily = nominal / f;
      monthly = nominal;
    } else {
      monthly = nominal * f;
      daily = monthly / 26;
    }
  } else if (period === "hari") {
    if (operator === "kali") {
      daily = nominal;
      monthly = nominal * f;
    } else {
      daily = nominal / f;
      monthly = daily * 26;
    }
  } else if (period === "minggu") {
    if (operator === "kali") {
      monthly = nominal * f;
      daily = monthly / 26;
    } else {
      daily = nominal / f;
      monthly = daily * 26;
    }
  }

  return {
    daily: Math.round(daily),
    monthly: Math.round(monthly),
  };
}

export function SalarySettings() {
  const queryClient = useQueryClient();

  // Filters & pagination
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<EmployeeSalaryConfig | null>(null);

  // Form states for modal (stored with thousand dot separators for natural typing)
  const [formBasicSalary, setFormBasicSalary] = useState<string>("0");
  const [formSalaryPeriod, setFormSalaryPeriod] = useState<SalaryPeriodType>("bulan");
  const [formSalaryOperator, setFormSalaryOperator] = useState<SalaryOperatorType>("bagi");
  const [formSalaryFactor, setFormSalaryFactor] = useState<number>(26);

  const [formMakanNominal, setFormMakanNominal] = useState<string>("0");
  const [formMakanPeriod, setFormMakanPeriod] = useState<SalaryPeriodType>("hari");
  const [formMakanOperator, setFormMakanOperator] = useState<SalaryOperatorType>("kali");
  const [formMakanFactor, setFormMakanFactor] = useState<number>(26);

  const [formTransportNominal, setFormTransportNominal] = useState<string>("0");
  const [formTransportPeriod, setFormTransportPeriod] = useState<SalaryPeriodType>("hari");
  const [formTransportOperator, setFormTransportOperator] = useState<SalaryOperatorType>("kali");
  const [formTransportFactor, setFormTransportFactor] = useState<number>(26);

  const [formNotes, setFormNotes] = useState<string>("");
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Floating Toast notification state (page-level)
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // In-modal detailed technical error state (for developers)
  const [detailedError, setDetailedError] = useState<{
    message: string;
    data?: any;
  } | null>(null);

  const [copiedError, setCopiedError] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleCopyError = () => {
    if (!detailedError) return;
    const info = {
      message: detailedError.message,
      code: detailedError.data?.code,
      errno: detailedError.data?.errno,
      sqlState: detailedError.data?.sqlState,
      sqlMessage: detailedError.data?.sqlMessage,
      sql: detailedError.data?.sql,
      errors: detailedError.data?.errors,
      details: detailedError.data?.details,
    };
    navigator.clipboard.writeText(JSON.stringify(info, null, 2));
    setCopiedError(true);
    setTimeout(() => setCopiedError(false), 2000);
  };

  const handleNominalChange = (rawInput: string, setter: (val: string) => void) => {
    const digits = rawInput.replace(/\D/g, "");
    if (!digits) {
      setter("0");
      return;
    }
    // Number(digits) automatically removes leading zeroes (e.g. "02500000" -> 2500000)
    const num = Number(digits);
    setter(num.toLocaleString("id-ID"));
  };

  const handleNominalFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  // Fetch employees data
  const { data, isLoading, isError } = useQuery({
    queryKey: ["karyawan-salary", page, limit, search, deptFilter, sortBy, sortOrder],
    queryFn: () =>
      api.getEmployeeSalaries({
        page,
        limit,
        search,
        dept: deptFilter === "all" ? "" : deptFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
  });

  const employees = data?.items ?? [];
  const summary = data?.summary;
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.count ?? 0;

  // Mutation for updating salary
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateEmployeeSalaryPayload) => api.updateEmployeeSalary(payload),
    onSuccess: (res) => {
      const msg = res.message || `Konfigurasi gaji untuk ${selectedEmp?.nm_karyawan || "karyawan"} berhasil disimpan!`;
      showToast(msg, "success");
      queryClient.invalidateQueries({ queryKey: ["karyawan-salary"] });
      setDetailedError(null);
      setIsEditOpen(false);
    },
    onError: (err: any) => {
      const errMsg = err?.message || "Gagal menyimpan konfigurasi gaji.";
      showToast(errMsg, "error");
      setDetailedError({
        message: errMsg,
        data: err?.data,
      });
      setCopiedError(false);
    },
  });

  const handleOpenEdit = (emp: EmployeeSalaryConfig) => {
    setSelectedEmp(emp);
    setFormBasicSalary(emp.basic_salary ? Number(emp.basic_salary).toLocaleString("id-ID") : "0");
    setFormSalaryPeriod(emp.salary_period || "bulan");
    setFormSalaryOperator(emp.salary_operator || "bagi");
    setFormSalaryFactor(emp.salary_factor || 26);

    setFormMakanNominal(emp.makan_nominal ? Number(emp.makan_nominal).toLocaleString("id-ID") : "0");
    setFormMakanPeriod(emp.makan_period || "hari");
    setFormMakanOperator(emp.makan_operator || "kali");
    setFormMakanFactor(emp.makan_factor || 26);

    setFormTransportNominal(emp.transport_nominal ? Number(emp.transport_nominal).toLocaleString("id-ID") : "0");
    setFormTransportPeriod(emp.transport_period || "hari");
    setFormTransportOperator(emp.transport_operator || "kali");
    setFormTransportFactor(emp.transport_factor || 26);

    setFormNotes(emp.salary_notes || "");
    setDetailedError(null);
    setCopiedError(false);
    setFeedbackMsg(null);
    setIsEditOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    updateMutation.mutate({
      id: selectedEmp.id,
      basic_salary: parseDotsToNumber(formBasicSalary),
      salary_period: formSalaryPeriod,
      salary_operator: formSalaryOperator,
      salary_factor: Number(formSalaryFactor) || 26,

      makan_nominal: parseDotsToNumber(formMakanNominal),
      makan_period: formMakanPeriod,
      makan_operator: formMakanOperator,
      makan_factor: Number(formMakanFactor) || 26,

      transport_nominal: parseDotsToNumber(formTransportNominal),
      transport_period: formTransportPeriod,
      transport_operator: formTransportOperator,
      transport_factor: Number(formTransportFactor) || 26,

      salary_notes: formNotes.trim() || null,
    });
  };

  // Live simulation in modal
  const liveBasicCalc = useMemo(() => {
    return calculateRateLocal(parseDotsToNumber(formBasicSalary), formSalaryPeriod, formSalaryOperator, formSalaryFactor);
  }, [formBasicSalary, formSalaryPeriod, formSalaryOperator, formSalaryFactor]);

  const liveMakanCalc = useMemo(() => {
    return calculateRateLocal(parseDotsToNumber(formMakanNominal), formMakanPeriod, formMakanOperator, formMakanFactor);
  }, [formMakanNominal, formMakanPeriod, formMakanOperator, formMakanFactor]);

  const liveTransportCalc = useMemo(() => {
    return calculateRateLocal(parseDotsToNumber(formTransportNominal), formTransportPeriod, formTransportOperator, formTransportFactor);
  }, [formTransportNominal, formTransportPeriod, formTransportOperator, formTransportFactor]);

  const liveTotalMonthly = liveBasicCalc.monthly + liveMakanCalc.monthly + liveTransportCalc.monthly;
  const liveTotalDaily = liveBasicCalc.daily + liveMakanCalc.daily + liveTransportCalc.daily;

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-sm shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Karyawan</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Users size={16} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-white font-mono">
            {summary?.total_employees ?? totalCount}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Karyawan terdaftar di database</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-sm shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Basic Salary (Bln)</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Banknote size={16} />
            </div>
          </div>
          <p className="mt-3 text-xl font-bold tracking-tight text-emerald-400 font-mono">
            {formatRupiah(summary?.total_basic_payroll ?? 0)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Akumulasi gaji pokok per bulan</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-sm shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Insentif Makan & Transport</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Utensils size={16} />
            </div>
          </div>
          <p className="mt-3 text-xl font-bold tracking-tight text-amber-400 font-mono">
            {formatRupiah((summary?.total_makan_payroll ?? 0) + (summary?.total_transport_payroll ?? 0))}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Makan: {formatRupiah(summary?.total_makan_payroll ?? 0)} | Trans: {formatRupiah(summary?.total_transport_payroll ?? 0)}
          </span>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-slate-900/40 p-4 backdrop-blur-sm shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Estimasi Payroll Bulanan
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-white font-mono">
            {formatRupiah(summary?.total_monthly_payroll ?? 0)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Total seluruh kompensasi bulanan
          </span>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-900/30 border border-slate-800/80 p-3.5 rounded-xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-2.5 flex-1 items-stretch sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama karyawan, ID, jabatan..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-500 ml-1" />
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-colors"
            >
              <option value="all">Semua Departemen</option>
              <option value="MARKETING">Marketing</option>
              <option value="OFFICE">Office</option>
              <option value="PRODUKSI">Produksi</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ArrowUpDown size={13} className="text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="id">Urut ID</option>
              <option value="nm_karyawan">Nama</option>
              <option value="dept">Departemen</option>
              <option value="basic_salary">Gaji Pokok</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-2 py-1.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-300 hover:bg-slate-800/60 font-mono transition-colors"
              title="Ganti A-Z / Z-A"
            >
              {sortOrder.toUpperCase()}
            </button>
          </div>

          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value={10}>10 data</option>
            <option value={20}>20 data</option>
            <option value={50}>50 data</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/20 overflow-hidden backdrop-blur-sm shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5">Karyawan</th>
                <th className="px-4 py-3.5">Dept & Jabatan</th>
                <th className="px-4 py-3.5">Basic Salary</th>
                <th className="px-4 py-3.5">Insentif Makan</th>
                <th className="px-4 py-3.5">Insentif Transport</th>
                <th className="px-4 py-3.5 text-right">Estimasi Bulanan</th>
                <th className="px-4 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="size-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Memuat data gaji karyawan...</span>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-rose-400">
                    Gagal memuat data dari server.
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 italic">
                    Tidak ada karyawan yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const deptBadge =
                    emp.dept === "PRODUKSI"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                      : emp.dept === "MARKETING"
                      ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20"
                      : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20";

                  return (
                    <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 font-mono text-xs shadow-inner">
                            {emp.nm_karyawan.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-white block group-hover:text-cyan-300 transition-colors">
                              {emp.nm_karyawan}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 tracking-wider">
                              {emp.id_karyawan}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${deptBadge}`}>
                          {emp.dept}
                        </span>
                        <span className="block text-[11px] text-slate-400 mt-1 font-medium">
                          {emp.jabatan}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <span className="font-semibold font-mono text-white block">
                            {formatRupiah(emp.basic_salary)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono inline-flex items-center gap-1">
                            <span className="px-1 py-0.2 rounded bg-slate-800 text-slate-300">
                              /{emp.salary_period}
                            </span>
                            <span className="text-slate-500 font-bold">
                              {emp.salary_operator === "bagi" ? "÷" : "×"} {emp.salary_factor}
                            </span>
                            <span className="text-emerald-400 font-semibold ml-1">
                              ({formatRupiah(emp.calculated.daily_basic)}/hr)
                            </span>
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <span className="font-semibold font-mono text-white block">
                            {formatRupiah(emp.makan_nominal)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono inline-flex items-center gap-1">
                            <span className="px-1 py-0.2 rounded bg-slate-800 text-slate-300">
                              /{emp.makan_period}
                            </span>
                            <span className="text-slate-500 font-bold">
                              {emp.makan_operator === "bagi" ? "÷" : "×"} {emp.makan_factor}
                            </span>
                            <span className="text-amber-400 font-semibold ml-1">
                              (Bln: {formatRupiah(emp.calculated.monthly_makan)})
                            </span>
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <span className="font-semibold font-mono text-white block">
                            {formatRupiah(emp.transport_nominal)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono inline-flex items-center gap-1">
                            <span className="px-1 py-0.2 rounded bg-slate-800 text-slate-300">
                              /{emp.transport_period}
                            </span>
                            <span className="text-slate-500 font-bold">
                              {emp.transport_operator === "bagi" ? "÷" : "×"} {emp.transport_factor}
                            </span>
                            <span className="text-cyan-400 font-semibold ml-1">
                              (Bln: {formatRupiah(emp.calculated.monthly_transport)})
                            </span>
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm block">
                          {formatRupiah(emp.calculated.monthly_total)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatRupiah(emp.calculated.daily_total)} / hari
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 transition-colors font-semibold text-xs shadow-sm hover:scale-102"
                        >
                          <Edit3 size={13} />
                          Atur
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-950/60 border-t border-slate-800/80 text-xs text-slate-400">
          <div>
            Menampilkan{" "}
            <span className="font-semibold text-slate-200">
              {employees.length > 0 ? (page - 1) * limit + 1 : 0}
            </span>{" "}
            s/d{" "}
            <span className="font-semibold text-slate-200">
              {Math.min(page * limit, totalCount)}
            </span>{" "}
            dari <span className="font-semibold text-slate-200">{totalCount}</span> karyawan
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <span className="px-2 font-mono text-slate-400">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Salary Configuration Modal */}
      {isEditOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Calculator size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Konfigurasi Gaji Karyawan
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">
                      {selectedEmp.id_karyawan}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedEmp.nm_karyawan} &bull; <span className="text-cyan-400">{selectedEmp.dept}</span> ({selectedEmp.jabatan})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditOpen(false)}
                className="size-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Scrollable form */}
            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-5 flex-1">
              {detailedError && (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-200 space-y-2.5 animate-fade-in shadow-lg shadow-rose-950/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                      <AlertCircle size={16} className="text-rose-400 shrink-0" />
                      <span>Gagal Menyimpan: {detailedError.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyError}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-800/80 text-[11px] font-mono text-rose-200 border border-rose-700/50 transition-colors shrink-0"
                      title="Salin semua detail error teknis ke clipboard"
                    >
                      {copiedError ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedError ? "Tersalin!" : "Salin Detail"}</span>
                    </button>
                  </div>

                  {/* Developer Technical / SQL Breakdown */}
                  {detailedError.data && (
                    <div className="mt-2 p-3 rounded-lg bg-black/70 border border-rose-900/80 font-mono text-[11px] text-rose-300/90 space-y-1.5 select-all overflow-x-auto">
                      <div className="flex items-center justify-between border-b border-rose-950/80 pb-1 text-[10px] text-rose-400 font-bold tracking-wider">
                        <span className="flex items-center gap-1">
                          <Terminal size={12} />
                          [DEVELOPER DEBUG DATA]
                        </span>
                        {detailedError.data.code && (
                          <span className="bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800 text-rose-300">
                            CODE: {detailedError.data.code}
                          </span>
                        )}
                      </div>

                      {detailedError.data.sqlState && (
                        <div>
                          <span className="text-rose-400 font-semibold">SQLSTATE:</span>{" "}
                          <span className="text-amber-300">{detailedError.data.sqlState}</span>
                        </div>
                      )}

                      {detailedError.data.errno !== undefined && (
                        <div>
                          <span className="text-rose-400 font-semibold">ERRNO:</span>{" "}
                          <span>{detailedError.data.errno}</span>
                        </div>
                      )}

                      {detailedError.data.sqlMessage && (
                        <div>
                          <span className="text-rose-400 font-semibold">SQL MESSAGE:</span>{" "}
                          <span className="text-rose-200 font-semibold">{detailedError.data.sqlMessage}</span>
                        </div>
                      )}

                      {detailedError.data.sql && (
                        <div className="pt-1">
                          <span className="text-rose-400 font-semibold block mb-0.5">EXECUTED SQL:</span>
                          <pre className="p-2 rounded bg-slate-950 text-[10px] text-cyan-300 overflow-x-auto whitespace-pre-wrap border border-slate-800">
                            {detailedError.data.sql}
                          </pre>
                        </div>
                      )}

                      {detailedError.data.errors && (
                        <div className="pt-1">
                          <span className="text-rose-400 font-semibold block mb-0.5">VALIDATION ISSUES:</span>
                          <pre className="p-2 rounded bg-slate-950 text-[10px] text-amber-300 overflow-x-auto border border-slate-800">
                            {JSON.stringify(detailedError.data.errors, null, 2)}
                          </pre>
                        </div>
                      )}

                      {detailedError.data.details && (
                        <div className="pt-1">
                          <span className="text-slate-500 font-semibold block mb-0.5">STACK TRACE:</span>
                          <pre className="p-2 rounded bg-slate-950 text-[10px] text-slate-400 overflow-x-auto max-h-32 border border-slate-800">
                            {detailedError.data.details}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 1: Basic Salary */}
              <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Banknote size={14} />
                    </div>
                    <label className="text-xs font-bold text-white uppercase tracking-wider">
                      1. Basic Salary (Gaji Pokok)
                    </label>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Rate Harian: {formatRupiah(liveBasicCalc.daily)}/hr
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-5">
                    <span className="text-[10px] text-slate-400 font-medium block mb-1">Nominal (Rp)</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-500 pointer-events-none">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formBasicSalary}
                        onFocus={handleNominalFocus}
                        onChange={(e) => handleNominalChange(e.target.value, setFormBasicSalary)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <span className="text-[10px] text-slate-400 font-medium block mb-1">Periode</span>
                    <select
                      value={formSalaryPeriod}
                      onChange={(e) => setFormSalaryPeriod(e.target.value as SalaryPeriodType)}
                      className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="bulan">Per Bulan</option>
                      <option value="hari">Per Hari</option>
                      <option value="minggu">Per Minggu</option>
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <span className="text-[10px] text-slate-400 font-medium block mb-1">Rumus Operator</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={formSalaryOperator}
                        onChange={(e) => setFormSalaryOperator(e.target.value as SalaryOperatorType)}
                        className="w-[95px] shrink-0 px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-center text-cyan-700 dark:text-cyan-300 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="bagi">÷ Bagi</option>
                        <option value="kali">× Kali</option>
                      </select>
                      <input
                        type="number"
                        min={0.01}
                        step="any"
                        value={formSalaryFactor}
                        onChange={(e) => setFormSalaryFactor(Number(e.target.value))}
                        className="w-full px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-center text-white focus:outline-none focus:border-cyan-500"
                        title="Faktor (misal 26 hari)"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60 flex items-center justify-between">
                  <span>
                    Simulasi: {formatRupiah(formBasicSalary)} {formSalaryOperator === "bagi" ? "÷" : "×"} {formSalaryFactor} {formSalaryPeriod === "bulan" ? "hari kerja" : "satuan"}
                  </span>
                  <span className="font-mono text-slate-300 font-semibold">
                    Bulanan: {formatRupiah(liveBasicCalc.monthly)}
                  </span>
                </div>
              </div>

              {/* SECTION 2: Insentif Makan */}
              <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Utensils size={14} />
                    </div>
                    <label className="text-xs font-bold text-white uppercase tracking-wider">
                      2. Insentif Makan
                    </label>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Bulan: {formatRupiah(liveMakanCalc.monthly)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-5">
                    <span className="text-[10px] text-slate-400 font-medium block mb-1">Nominal (Rp)</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-500 pointer-events-none">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formMakanNominal}
                        onFocus={handleNominalFocus}
                        onChange={(e) => handleNominalChange(e.target.value, setFormMakanNominal)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <span className="text-[10px] text-slate-400 font-medium block mb-1">Periode</span>
                    <select
                      value={formMakanPeriod}
                      onChange={(e) => setFormMakanPeriod(e.target.value as SalaryPeriodType)}
                      className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="hari">Per Hari</option>
                      <option value="bulan">Per Bulan</option>
                      <option value="minggu">Per Minggu</option>
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <span className="text-[10px] text-slate-400 font-medium block mb-1">Rumus Operator</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={formMakanOperator}
                        onChange={(e) => setFormMakanOperator(e.target.value as SalaryOperatorType)}
                        className="w-[95px] shrink-0 px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-center text-amber-700 dark:text-amber-300 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="kali">× Kali</option>
                        <option value="bagi">÷ Bagi</option>
                      </select>
                      <input
                        type="number"
                        min={0.01}
                        step="any"
                        value={formMakanFactor}
                        onChange={(e) => setFormMakanFactor(Number(e.target.value))}
                        className="w-full px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-center text-white focus:outline-none focus:border-cyan-500"
                        title="Faktor (misal 26 hari)"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60 flex items-center justify-between">
                  <span>
                    Simulasi: {formatRupiah(formMakanNominal)} {formMakanOperator === "bagi" ? "÷" : "×"} {formMakanFactor} {formMakanPeriod === "hari" ? "hari kerja" : "satuan"}
                  </span>
                  <span className="font-mono text-slate-300 font-semibold">
                    Harian: {formatRupiah(liveMakanCalc.daily)}/hr
                  </span>
                </div>
              </div>

              {/* SECTION 3: Insentif Transportasi */}
              <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-md bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                      <Car size={14} />
                    </div>
                    <label className="text-xs font-bold text-white uppercase tracking-wider">
                      3. Insentif Transportasi
                    </label>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    Bulan: {formatRupiah(liveTransportCalc.monthly)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-5">
                    <span className="text-[10px] text-slate-400 font-medium block mb-1">Nominal (Rp)</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-500 pointer-events-none">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formTransportNominal}
                        onFocus={handleNominalFocus}
                        onChange={(e) => handleNominalChange(e.target.value, setFormTransportNominal)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <span className="text-[10px] text-slate-400 font-medium block mb-1">Periode</span>
                    <select
                      value={formTransportPeriod}
                      onChange={(e) => setFormTransportPeriod(e.target.value as SalaryPeriodType)}
                      className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="hari">Per Hari</option>
                      <option value="bulan">Per Bulan</option>
                      <option value="minggu">Per Minggu</option>
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <span className="text-[10px] text-slate-400 font-medium block mb-1">Rumus Operator</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={formTransportOperator}
                        onChange={(e) => setFormTransportOperator(e.target.value as SalaryOperatorType)}
                        className="w-[95px] shrink-0 px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-center text-cyan-700 dark:text-cyan-300 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="kali">× Kali</option>
                        <option value="bagi">÷ Bagi</option>
                      </select>
                      <input
                        type="number"
                        min={0.01}
                        step="any"
                        value={formTransportFactor}
                        onChange={(e) => setFormTransportFactor(Number(e.target.value))}
                        className="w-full px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white text-center focus:outline-none focus:border-cyan-500"
                        title="Faktor (misal 26 hari)"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60 flex items-center justify-between">
                  <span>
                    Simulasi: {formatRupiah(formTransportNominal)} {formTransportOperator === "bagi" ? "÷" : "×"} {formTransportFactor} {formTransportPeriod === "hari" ? "hari kerja" : "satuan"}
                  </span>
                  <span className="font-mono text-slate-300 font-semibold">
                    Harian: {formatRupiah(liveTransportCalc.daily)}/hr
                  </span>
                </div>
              </div>

              {/* SECTION 4: Notes */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Nomor rekening, kesepakatan lembur, atau catatan khusus..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              {/* SECTION 5: Real-time Total Calculation Summary Card */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-slate-900/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    Total Estimasi Kompensasi Bulanan
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Est. Harian: {formatRupiah(liveTotalDaily)} / hr
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Gaji Pokok + Makan + Transport:</span>
                  <span className="text-xl font-extrabold text-white font-mono">
                    {formatRupiah(liveTotalMonthly)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/ bulan</span>
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-xs font-medium text-slate-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateMutation.isPending ? (
                    <>
                      <div className="size-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <>
          <style>{`
            @keyframes slideInRight {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
            .animate-slide-in-right {
              animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>
          <div className="fixed bottom-6 right-6 z-[9999] animate-slide-in-right max-w-md">
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 ${
                toast.type === "success"
                  ? "bg-emerald-950/95 border-emerald-500/40 text-emerald-100 shadow-emerald-950/50"
                  : "bg-rose-950/95 border-rose-500/40 text-rose-100 shadow-rose-950/50"
              }`}
            >
              {toast.type === "success" ? (
                <div className="size-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <CheckCircle2 size={18} />
                </div>
              ) : (
                <div className="size-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                  <AlertCircle size={18} />
                </div>
              )}
              <div className="flex-1 text-xs font-semibold leading-relaxed">
                {toast.message}
              </div>
              <button
                onClick={() => setToast(null)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
