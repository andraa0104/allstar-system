"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";
import { 
  Eye, 
  ClipboardList, 
  X,
  Phone,
  User,
  Palette,
  Coins,
  Check,
  Activity,
  Calendar,
  AlertTriangle,
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  Archive,
  Timer
} from "lucide-react";
import type { FoDetailData, MonitoringStaffRow } from "@/lib/types";

const pageSizeOptions = [5, 10, 25, 50, 100, "all"] as const;

function formatIndonesianDate(input: string | Date | null | undefined) {
  if (!input) {
    return "-";
  }

  let dateStr = "";
  if (input instanceof Date) {
    dateStr = input.toISOString();
  } else {
    dateStr = String(input);
  }

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = match[1];
    const monthIndex = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);

    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const monthName = months[monthIndex] || match[2];

    return `${day} ${monthName} ${year}`;
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return String(input);
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatIndonesianDateTime(input: string | Date | null | undefined) {
  if (!input) {
    return "-";
  }

  let dateStr = "";
  if (input instanceof Date) {
    dateStr = input.toISOString();
  } else {
    dateStr = String(input);
  }

  dateStr = dateStr.replace("T", " ");

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (match) {
    const year = match[1];
    const monthIndex = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const hour = match[4];
    const minute = match[5];

    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const monthName = months[monthIndex] || match[2];

    return `${day} ${monthName} ${year} pukul ${hour}:${minute}`;
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return String(input);
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(/\./g, ":");
}

function formatRupiah(value: number | string | null) {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num)) return "-";
  return "Rp. " + num.toLocaleString("id-ID");
}

interface RemainingDeadlineWidgetProps {
  posDate: string | null;
  deadlineDate: string | null;
  qcReadyGudang: string | null;
}

function RemainingDeadlineWidget({ posDate, deadlineDate, qcReadyGudang }: RemainingDeadlineWidgetProps) {
  const [progressWidth, setProgressWidth] = useState(0);

  // Hitung target progress secara aman tanpa conditional hooks
  let targetProgress = 0;
  let hasValidDates = false;
  let totalDays = 0;
  let remainingDays = 0;
  let isOverdue = false;
  let isUrgent = false;
  let isCompleted = false;
  let posStr = "-";
  let deadlineStr = "-";
  let qcReadyStr: string | null = null;

  if (posDate && deadlineDate) {
    hasValidDates = true;
    const pos = new Date(posDate);
    const deadline = new Date(deadlineDate);
    const now = new Date();
    const qcReady = qcReadyGudang ? new Date(qcReadyGudang) : null;

    pos.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    if (qcReady) {
      qcReady.setHours(0, 0, 0, 0);
    }

    isCompleted = qcReady !== null;
    totalDays = Math.max(1, Math.ceil((deadline.getTime() - pos.getTime()) / (1000 * 60 * 60 * 24)));
    remainingDays = isCompleted ? 0 : Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const elapsedDays = isCompleted ? totalDays : Math.max(0, Math.ceil((now.getTime() - pos.getTime()) / (1000 * 60 * 60 * 24)));
    targetProgress = isCompleted ? 100 : Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));

    isOverdue = !isCompleted && remainingDays < 0;
    isUrgent = !isCompleted && remainingDays >= 0 && remainingDays <= 3;

    posStr = formatIndonesianDate(posDate);
    deadlineStr = formatIndonesianDate(deadlineDate);
    qcReadyStr = qcReadyGudang ? formatIndonesianDate(qcReadyGudang) : null;
  }

  // Hook dijalankan secara UNCONDITIONAL
  useEffect(() => {
    if (!hasValidDates) return;
    const timer = setTimeout(() => {
      setProgressWidth(targetProgress);
    }, 150);
    return () => clearTimeout(timer);
  }, [targetProgress, hasValidDates]);

  // Early return diposisikan setelah deklarasi hook
  if (!hasValidDates) {
    return (
      <div className="rounded-lg bg-slate-950/40 border border-slate-800/40 p-4">
        <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider mb-1 text-slate-400">
          Remaining Deadline
        </span>
        <div className="text-xs text-slate-500 italic">
          Data tanggal order belum lengkap untuk kalkulasi tenggat waktu.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-slate-950/50 border border-slate-800/40 p-4 space-y-3 relative overflow-hidden">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
      
      {/* Background soft glowing effect */}
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none ${
        isCompleted 
          ? "bg-emerald-500/5" 
          : isOverdue 
          ? "bg-red-500/5" 
          : isUrgent 
          ? "bg-amber-500/5" 
          : "bg-cyan-500/5"
      }`}></div>

      <div className="flex items-center justify-between">
        <div>
          <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
            Remaining Deadline
          </span>
          <span className="text-[9px] text-slate-500 mt-0.5 block">
            Lini Masa Produksi (pos_date s.d deadline_date)
          </span>
        </div>

        {isCompleted ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 animate-pulse">
            <span className="size-1.5 rounded-full bg-emerald-400"></span>
            Selesai & Siap Diambil
          </div>
        ) : isOverdue ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 border border-red-500/30 text-red-400 animate-pulse">
            <span className="size-1.5 rounded-full bg-red-400"></span>
            Lewat {Math.abs(remainingDays)} Hari
          </div>
        ) : isUrgent ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse">
            <span className="size-1.5 rounded-full bg-amber-400"></span>
            Kritis {remainingDays} Hari!
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <span className="size-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            Sisa {remainingDays} Hari
          </div>
        )}
      </div>

      <div className="relative pt-4 pb-2">
        <div className="h-2 w-full rounded-full bg-slate-800/60 overflow-hidden relative border border-slate-900">
          <div
            style={{ width: `${progressWidth}%` }}
            className={`h-full rounded-full transition-all duration-[1200ms] ease-out relative ${
              isCompleted
                ? "bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                : isOverdue
                ? "bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                : isUrgent
                ? "bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                : "bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
            }`}
          >
            <div 
              style={{
                backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite linear'
              }}
              className="absolute inset-0"
            ></div>
          </div>
        </div>

        <div className="absolute top-[13px] left-0 size-3 rounded-full border border-slate-700 bg-slate-950 flex items-center justify-center">
          <div className="size-1 rounded-full bg-slate-500"></div>
        </div>
        <div className={`absolute top-[13px] right-0 size-3 rounded-full border bg-slate-950 flex items-center justify-center ${
          isCompleted 
            ? "border-emerald-500" 
            : isOverdue 
            ? "border-red-500" 
            : isUrgent 
            ? "border-amber-500" 
            : "border-cyan-500"
        }`}>
          <div className={`size-1.5 rounded-full ${
            isCompleted 
              ? "bg-emerald-400 animate-pulse" 
              : isOverdue 
              ? "bg-red-500 animate-pulse" 
              : isUrgent 
              ? "bg-amber-500 animate-pulse" 
              : "bg-cyan-500 animate-pulse"
          }`}></div>
        </div>
      </div>

      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono px-0.5">
        <div className="flex flex-col items-start">
          <span className="text-[9px] text-slate-500 font-sans">Start (Pos)</span>
          <span className="mt-0.5 text-slate-300">{posStr}</span>
        </div>
        <div className="text-center font-sans px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 flex flex-col items-center">
          <span>Durasi: {totalDays} Hari</span>
          {isCompleted && qcReadyStr && (
            <span className="text-[8px] text-emerald-400 font-mono mt-0.5">Ready: {qcReadyStr}</span>
          )}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] text-slate-500 font-sans">Deadline Order</span>
          <span className="mt-0.5 text-slate-300">{deadlineStr}</span>
        </div>
      </div>
    </div>
  );
}

function matchesSearch(item: any, search: string) {
  const keyword = search.trim().toLowerCase();
  if (!keyword) return true;
  return (
    item.no_fo.toLowerCase().includes(keyword) ||
    (item.customer ?? "").toLowerCase().includes(keyword)
  );
}

function getDeadlineStyle(deadlineDateStr: string | null, status: string | null) {
  if (!deadlineDateStr) return "";
  if (status === "Produk diterima Customer" || status === "Selesai Packing, Siap diAmbil") {
    return "";
  }

  const parts = deadlineDateStr.split("T")[0].split("-");
  if (parts.length !== 3) return "";
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const deadline = new Date(year, month, day);
  deadline.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // Overdue -> Fuchsia/Magenta critical warning (fully distinct from H-2 red warning)
    return "bg-fuchsia-950/20 border-fuchsia-900/30 hover:bg-fuchsia-950/30 border-l-4 border-l-fuchsia-500 text-fuchsia-100";
  } else if (diffDays <= 2) {
    // H-2 sampai Hari H -> fill warna merah
    return "bg-red-950/20 border-red-900/30 hover:bg-red-950/30 border-l-4 border-l-red-500 text-red-100";
  } else if (diffDays <= 4) {
    // H-4 sampai H-3 -> fill warna kuning
    return "bg-amber-950/15 border-amber-900/20 hover:bg-amber-950/25 border-l-4 border-l-amber-500 text-amber-100";
  }
  return "";
}


export default function MonitoringStaffPage() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setSession(getSession());
    });
  }, []);

  const [namaPegawai, setNamaPegawai] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number | "all">(5);

  const [selectedFo, setSelectedFo] = useState<MonitoringStaffRow | null>(null);

  const [activeTab, setActiveTab] = useState<"summary" | "detail" | "job">("summary");
  const [showDetailFilters, setShowDetailFilters] = useState(false);
  const [showJobFilters, setShowJobFilters] = useState(false);
  const [jobSearch, setJobSearch] = useState("");
  const [jobLimit, setJobLimit] = useState<number | "all">(5);
  const [jobPage, setJobPage] = useState(1);
  const [jobImageModal, setJobImageModal] = useState<string | null>(null);
  const [jobModalData, setJobModalData] = useState<any>(null);
  const [detailSearch, setDetailSearch] = useState("");
  const [detailLimit, setDetailLimit] = useState<number | "all">(5);
  const [detailPage, setDetailPage] = useState(1);

  const validNames = [
    "ALDO", "BEN", "JIHAN", "FINA", "FANI", "EGY", "IVAN", "IZAMI", "IKHA", 
    "NOVAN", "NATRIS", "NASRIL", "PUSPA", "RISKY", "REINA", "SAFA", "SAID", 
    "SYAHNI", "YOHAND", "KARIM-PENJAHIT", "ADI-PENJAHIT", "SANDY-PENJAHIT", 
    "ALIF-PENJAHIT", "DIDIN-PENJAHIT"
  ];

  const tableQuery = useQuery({
    queryKey: ["monitoring-staff", page, limit, namaPegawai, dateFilter, startDate, endDate, search],
    queryFn: () =>
      api.getMonitoringStaff({
        page,
        limit,
        nama_pegawai: namaPegawai,
        date_filter: dateFilter,
        start_date: startDate,
        end_date: endDate,
        search,
      }),
    enabled: namaPegawai !== "",
  });

  const foDetailQuery = useQuery({
    queryKey: ["fo-detail", selectedFo?.no_fo],
    queryFn: () => api.getFoDetail(selectedFo!.no_fo),
    enabled: !!selectedFo?.no_fo,
  });

  const foDetailAllItemsQuery = useQuery({
    queryKey: ["fo-detail-all-items", selectedFo?.no_fo],
    queryFn: () => api.getFoDetailItems({ no_fo: selectedFo!.no_fo, limit: "all" }),
    enabled: !!selectedFo?.no_fo,
  });

  const foDetailItemsQuery = useQuery({
    queryKey: ["fo-detail-items", selectedFo?.no_fo, detailPage, detailLimit, detailSearch],
    queryFn: () =>
      api.getFoDetailItems({
        no_fo: selectedFo!.no_fo,
        page: detailPage,
        limit: detailLimit,
        search: detailSearch,
      }),
    enabled: !!selectedFo?.no_fo && activeTab === "detail",
  });

  const foJobDetailsQuery = useQuery({
    queryKey: ["fo-job-details", selectedFo?.no_fo, jobPage, jobLimit, jobSearch],
    queryFn: () =>
      api.getFoJobDetails({
        no_fo: selectedFo!.no_fo,
        page: jobPage,
        limit: jobLimit,
        search: jobSearch,
      }),
    enabled: !!selectedFo?.no_fo && activeTab === "job",
  });

  useEffect(() => {
    if (selectedFo) {
      setActiveTab("summary");
      setDetailSearch("");
      setDetailLimit(5);
      setDetailPage(1);
    }
  }, [selectedFo]);

  return (
    <>
      <PageHeader
        title="Monitoring Staff"
        description="Pantau pekerjaan masing-masing pegawai berdasarkan rentang waktu."
      />

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl shadow-slate-950/20">
        <header className="mb-6 flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex flex-wrap items-center gap-2">
              <ClipboardList className="text-cyan-400 size-5" />
              Monitoring Staff List
              {!tableQuery.isLoading && tableQuery.data && (
                <div className="flex flex-wrap items-center gap-1.5 ml-2">
                  <span className="inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    {tableQuery.data.totalStel.toLocaleString("id-ID")} Stel
                  </span>
                  <span className="inline-flex items-center rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:text-amber-400 border border-amber-500/20">
                    {tableQuery.data.totalPcs.toLocaleString("id-ID")} Pcs
                  </span>
                  <span className="inline-flex items-center rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
                    Total: {tableQuery.data.totalQty.toLocaleString("id-ID")} Qty
                  </span>
                  <span className="inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-500/20 dark:border-purple-500/30 dark:text-purple-400 border border-purple-300">
                    Total: {tableQuery.data.count.toLocaleString("id-ID")} FO
                  </span>
                </div>
              )}
            </h2>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-end mt-4 2xl:mt-0">
            {/* Nama Pegawai filter */}
            <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-2">
              <span className="text-xs font-medium text-slate-400">Pegawai:</span>
              <select
                value={namaPegawai}
                onChange={(e) => {
                  setNamaPegawai(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full md:w-40 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400"
              >
                <option value="" disabled>Pilih Pegawai</option>
                <option value="all">Semua Pegawai</option>
                {validNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date filter */}
            <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-2">
              <span className="text-xs font-medium text-slate-400">Date:</span>
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full md:w-36 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400"
              >
                <option value="today">Hari Ini</option>
                <option value="range">Range Tanggal</option>
                <option value="all">Semua Data</option>
              </select>
            </div>

            {dateFilter === "range" && (
              <div className="grid grid-cols-[1fr_auto_1fr] md:flex md:items-center gap-2 w-full md:w-auto">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-full md:w-auto rounded-lg border border-slate-700 bg-slate-950 px-2 text-[10px] md:text-xs md:px-3 text-white outline-none focus:border-cyan-400 min-w-0 md:min-w-fit"
                />
                <span className="text-xs text-slate-400 text-center shrink-0">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-full md:w-auto rounded-lg border border-slate-700 bg-slate-950 px-2 text-[10px] md:text-xs md:px-3 text-white outline-none focus:border-cyan-400 min-w-0 md:min-w-fit"
                />
              </div>
            )}

            {/* Search filter */}
            <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-2">
              <span className="text-xs font-medium text-slate-400">Cari:</span>
              <input
                type="text"
                placeholder="No Job / No FO"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full md:w-40 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400 placeholder:text-slate-500"
              />
            </div>

            {/* Limit filter */}
            <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-2">
              <select
                value={String(limit)}
                onChange={(e) => {
                  const nextValue = e.target.value === "all" ? "all" : Number(e.target.value);
                  setLimit(nextValue);
                  setPage(1);
                }}
                className="h-9 w-full md:w-auto rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400"
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "Semua data" : `${option} data`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="hidden lg:block overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-950/40">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-3 py-2">No Job</th>
                <th className="px-3 py-2">No FO</th>
                <th className="px-3 py-2">Order Date</th>
                <th className="px-3 py-2">Date Job</th>
                <th className="px-3 py-2">Pegawai</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {namaPegawai === "" ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-xs text-slate-400 italic">
                    Silakan pilih pegawai terlebih dahulu untuk menampilkan data.
                  </td>
                </tr>
              ) : tableQuery.isLoading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-xs text-slate-400 italic">
                    Memuat data monitoring staff...
                  </td>
                </tr>
              ) : null}

              {namaPegawai !== "" && !tableQuery.isLoading && !tableQuery.data?.items?.length ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-xs text-slate-400 italic">
                    Tidak ada data yang cocok dengan kriteria.
                  </td>
                </tr>
              ) : null}

              {tableQuery.data?.items?.map((item) => (
                <tr key={item.no_job} className="transition-colors border-b border-slate-800/60 hover:bg-slate-900/30 text-slate-300">
                  <td className="px-3 py-2 font-mono font-bold tracking-wide text-cyan-500 dark:text-cyan-400">
                    {item.no_job}
                  </td>
                  <td className="px-3 py-2 font-mono tracking-wide text-slate-600 dark:text-slate-400">
                    {item.no_fo}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {formatIndonesianDate(item.order_date)}
                  </td>
                  <td className="px-3 py-2 text-xs text-cyan-500 font-semibold">
                    {formatIndonesianDateTime(item.datetime_lanjutan)}
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    {item.nama_pegawai}
                  </td>
                  <td className="px-3 py-2 font-medium" title={item.customer ?? ""}>
                    {item.customer ?? "-"}
                  </td>
                  <td className="px-3 py-2 font-mono font-semibold">
                    {item.qty_order ?? 0}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      aria-label={`Lihat detail ${item.no_fo}`}
                      className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors shadow-inner"
                      onClick={() => setSelectedFo(item)}
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* List view for Mobile & Tablet screens */}
        <div className="lg:hidden space-y-3.5">
          {namaPegawai === "" ? (
            <div className="text-center text-xs text-slate-400 italic py-12 border border-slate-800 bg-slate-950/20 rounded-lg">
              Silakan pilih pegawai terlebih dahulu untuk menampilkan data.
            </div>
          ) : tableQuery.isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-400 italic text-xs border border-slate-800 bg-slate-950/20 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
              <span>Memuat data monitoring staff...</span>
            </div>
          ) : null}

          {namaPegawai !== "" && !tableQuery.isLoading && !tableQuery.data?.items?.length ? (
            <div className="text-center text-xs text-slate-400 italic py-12 border border-slate-800 bg-slate-950/20 rounded-lg">
              Tidak ada data yang cocok dengan kriteria.
            </div>
          ) : null}

          {tableQuery.data?.items?.map((item) => (
            <div 
              key={item.no_job} 
              className="rounded-lg border border-slate-800/80 bg-slate-950/30 p-4 space-y-3 shadow-md transition-colors hover:border-slate-700/60"
            >
              <div className="flex justify-between items-start gap-3">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">No Job / No FO</span>
                  <div className="flex flex-col gap-1 mt-0.5">
                    <span className="text-xs font-mono font-bold text-cyan-500 dark:text-cyan-400 tracking-wide">{item.no_job}</span>
                    <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 tracking-wide">{item.no_fo}</span>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    aria-label={`Lihat detail ${item.no_fo}`}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors shadow-inner"
                    onClick={() => setSelectedFo(item)}
                  >
                    <Eye size={15} />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Customer & Pegawai</span>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-200 font-semibold leading-relaxed block break-words" title={item.customer ?? ""}>
                    Cust: {item.customer ?? "-"}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Pegawai: {item.nama_pegawai}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2.5 border-t border-slate-800/40">
                <div>
                  <span className="block text-[9px] uppercase font-semibold text-slate-500">Order Date</span>
                  <span className="text-[11px] text-slate-300 block mt-0.5 leading-relaxed">{formatIndonesianDate(item.order_date)}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-semibold text-slate-500">Date Job</span>
                  <span className="text-[11px] text-cyan-500 font-semibold block mt-0.5 leading-relaxed">{formatIndonesianDateTime(item.datetime_lanjutan)}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-semibold text-slate-500">Qty Order</span>
                  <span className="text-[11px] text-slate-700 dark:text-slate-300 font-mono font-bold block mt-0.5 leading-relaxed">{item.qty_order ?? 0} Pcs</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400">
          <p>
            {tableQuery.isFetching
              ? "Memperbarui data..."
              : `Menampilkan ${tableQuery.data?.items?.length ?? 0} dari total ${tableQuery.data?.count ?? 0} data. Halaman ${tableQuery.data?.page ?? page} dari ${tableQuery.data?.totalPages ?? 1}`}
          </p>
          <div className="flex gap-2">
            <button
              className="h-8 rounded-lg border border-slate-800 bg-slate-900 px-3 text-slate-300 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              disabled={page <= 1 || limit === "all"}
              onClick={() => setPage((curr) => Math.max(curr - 1, 1))}
            >
              Previous
            </button>
            <button
              className="h-8 rounded-lg border border-slate-800 bg-slate-900 px-3 text-slate-300 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              disabled={limit === "all" || page >= (tableQuery.data?.totalPages ?? 1)}
              onClick={() => setPage((curr) => curr + 1)}
            >
              Next
            </button>
          </div>
        </footer>
      </section>

      {/* Modal Detail Form Order */}
      {selectedFo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <section className="w-full max-w-xl md:max-w-3xl lg:max-w-5xl rounded-xl border border-slate-800 bg-slate-900/90 shadow-2xl relative overflow-hidden backdrop-blur-md flex flex-col max-h-[90vh] md:max-h-[85vh]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"></div>
            
            <header className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-slate-800 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ClipboardList className="text-cyan-400 size-5" />
                  Detail Form Order
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Informasi lengkap dan detail penugasan formulir order.
                </p>
              </div>
              <button
                aria-label="Tutup detail"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                onClick={() => setSelectedFo(null)}
              >
                <X size={18} />
              </button>
            </header>

            {/* Tabs Selector */}
            <div className="flex border-b border-slate-800/80 bg-slate-950/20 px-6 flex-shrink-0">
              <button
                className={`py-3 text-xs font-semibold tracking-wider uppercase border-b-2 px-4 transition-all duration-300 ${
                  activeTab === "summary"
                    ? "border-cyan-500 text-cyan-400 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setActiveTab("summary")}
              >
                Order Summary
              </button>
              <button
                className={`py-3 text-xs font-semibold tracking-wider uppercase border-b-2 px-4 transition-all duration-300 ${
                  activeTab === "detail"
                    ? "border-cyan-500 text-cyan-400 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setActiveTab("detail")}
              >
                Detail Order
              </button>
              <button
                className={`py-3 text-xs font-semibold tracking-wider uppercase border-b-2 px-4 transition-all duration-300 ${
                  activeTab === "job"
                    ? "border-cyan-500 text-cyan-400 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setActiveTab("job")}
              >
                Detail Job
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {foDetailQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                  <span className="text-sm text-slate-400">Memuat detail order...</span>
                </div>
              ) : foDetailQuery.isError ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  {foDetailQuery.error instanceof Error ? foDetailQuery.error.message : "Gagal memuat detail order."}
                </div>
              ) : foDetailQuery.data ? (
                (() => {
                  const data = foDetailQuery.data;
                  return (
                    <div className="space-y-4">
                      {activeTab === "summary" && (
                        <>
                          {/* Ringkasan Utama: No FO & Qty */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-slate-950 p-3 border border-slate-800/60">
                          <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider">No FO</span>
                          <span className="mt-1 block font-mono text-sm font-bold text-cyan-300">
                            {data.no_fo}
                          </span>
                        </div>
                        <div className="rounded-lg bg-slate-950 p-3 border border-slate-800/60">
                          <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Quantity</span>
                          {foDetailAllItemsQuery.isLoading ? (
                            <span className="mt-1 block text-sm font-medium text-slate-400 italic">
                              Loading Qty...
                            </span>
                          ) : (
                            (() => {
                              const totalQty = data.qty_order ?? 0;
                              const detailItems = foDetailAllItemsQuery.data?.items ?? [];
                              
                              const hasSetelan = detailItems.some(item => 
                                item.produk && item.produk.toUpperCase().includes("SETELAN")
                              );
                              const hasNonSetelan = detailItems.some(item => 
                                !item.produk || !item.produk.toUpperCase().includes("SETELAN")
                              );

                              if (hasSetelan && hasNonSetelan) {
                                let setelanQty = 0;
                                let nonSetelanQty = 0;
                                detailItems.forEach(item => {
                                  const qty = Number(item.qty) || 0;
                                  if (item.produk && item.produk.toUpperCase().includes("SETELAN")) {
                                    setelanQty += qty;
                                  } else {
                                    nonSetelanQty += qty;
                                  }
                                });

                                return (
                                  <div className="space-y-1.5 mt-1">
                                    <span className="block text-sm font-bold text-emerald-400">
                                      {totalQty}
                                    </span>
                                    <div className="text-[10px] text-slate-400 space-y-0.5 border-t border-slate-800/80 pt-1.5 font-medium leading-relaxed">
                                      <div className="flex justify-between items-center gap-2">
                                        <span>SETELAN:</span>
                                        <span className="font-bold text-amber-400 font-mono">{setelanQty} Stel</span>
                                      </div>
                                      <div className="flex justify-between items-center gap-2">
                                        <span>Bukan SETELAN:</span>
                                        <span className="font-bold text-slate-200 font-mono">{nonSetelanQty} Pcs</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              const unit = hasSetelan ? "Stel" : "Pcs";
                              return (
                                <span className="mt-1 block text-sm font-bold text-emerald-400">
                                  {totalQty} {unit}
                                </span>
                              );
                            })()
                          )}
                        </div>
                      </div>

                      {/* Detail Pelanggan & Penugasan */}
                      <div className="rounded-lg bg-slate-950/50 border border-slate-800/40 p-4 space-y-3">
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                          <div className="flex items-start gap-2.5">
                            <div className="text-slate-400 mt-0.5"><Eye size={15} /></div>
                            <div>
                              <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Customer</span>
                              <span className="text-sm font-semibold text-slate-200">{data.customer ?? "-"}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <div className="text-slate-400 mt-0.5"><Phone size={15} /></div>
                            <div>
                              <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider">No Handphone</span>
                              <span className="text-sm font-semibold text-slate-200">{data.telp_cus ?? "-"}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <div className="text-slate-400 mt-0.5"><User size={15} /></div>
                            <div>
                              <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Sales</span>
                              <span className="text-sm font-semibold text-slate-200">{data.sales ?? "-"}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <div className="text-slate-400 mt-0.5"><Palette size={15} /></div>
                            <div>
                              <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Design By</span>
                              <span className="text-sm font-semibold text-slate-200">{data.desain ?? "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detail Jadwal & Tanggal */}
                      <div className="rounded-lg bg-slate-950/30 border border-slate-800/30 p-4">
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                          <div>
                            <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Date (Doc Date)</span>
                            <span className="mt-0.5 block text-xs text-slate-300">
                              {formatIndonesianDateTime(data.doc_date)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Order Date</span>
                            <span className="mt-0.5 block text-xs text-slate-300">
                              {formatIndonesianDate(data.order_date)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Deposit Date</span>
                            <span className="mt-0.5 block text-xs text-slate-300">
                              {formatIndonesianDate(data.deposit_date)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider text-cyan-400">Deadline Order</span>
                            <span className="mt-0.5 block text-xs font-semibold text-cyan-300">
                              {formatIndonesianDate(data.deadline_date)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Lini Masa / Remaining Deadline */}
                      {data.Desain_Ready && (
                        <RemainingDeadlineWidget
                          posDate={data.pos_date}
                          deadlineDate={data.deadline_date}
                          qcReadyGudang={data.QC_ReadyGudang}
                        />
                      )}

                      {/* Status Working / Workflow Stepper */}
                      <div className="rounded-lg bg-slate-950/50 border border-slate-800/40 p-4 space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
                          <Activity size={14} className="text-cyan-400 animate-pulse" />
                          Status Alur Kerja (Working Status)
                        </h3>

                        {!data.Desain_Ready ? (
                          <div className="rounded-lg border border-slate-800/50 bg-slate-950/40 p-5 text-center">
                            <span className="block text-xs font-semibold text-slate-400">Data tidak ditemukan</span>
                            <span className="block text-[11px] text-slate-500 mt-1">Data status alur kerja tidak ditemukan atau belum dimulai.</span>
                          </div>
                        ) : (
                          <div className="relative pl-3 space-y-6">
                            {/* Connector Line */}
                            <div className="absolute left-[22px] top-2.5 bottom-2.5 w-[2px] bg-slate-800"></div>

                            {/* Step 1: Order Success */}
                            {(() => {
                              const isCompleted = !!data.pos_date;
                              return (
                                <div className="relative pl-8">
                                  <div className={`absolute left-0 top-0.5 flex-shrink-0 flex items-center justify-center rounded-full w-5 h-5 border transition-all duration-300 z-10 ${
                                    isCompleted 
                                      ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                                      : "bg-slate-950 border-slate-800 text-slate-600"
                                  }`}>
                                    {isCompleted ? <Check size={11} strokeWidth={3} /> : <div className="size-1.5 bg-slate-800 rounded-full" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className={`text-xs font-bold transition-colors ${isCompleted ? "text-slate-200" : "text-slate-500"}`}>
                                        Order Success
                                      </h4>
                                      {isCompleted && (
                                        <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex-shrink-0">
                                          Selesai
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {data.pos_date ? `Tanggal POS: ${formatIndonesianDateTime(data.pos_date)}` : "Belum mulai"}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Step 2: Design Step */}
                            {(() => {
                              const isCompleted = !!data.Desain_Ready;
                              const isOngoing = !isCompleted && !!data.pos_date;
                              const label = isCompleted ? "Design Ready" : "Start Design";
                              
                              return (
                                <div className="relative pl-8">
                                  <div className={`absolute left-0 top-0.5 flex-shrink-0 flex items-center justify-center rounded-full w-5 h-5 border transition-all duration-300 z-10 ${
                                    isCompleted 
                                      ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                                      : isOngoing 
                                        ? "bg-blue-500 border-blue-400 text-white animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" 
                                        : "bg-slate-950 border-slate-800 text-slate-600"
                                  }`}>
                                    {isCompleted ? (
                                      <Check size={11} strokeWidth={3} />
                                    ) : isOngoing ? (
                                      <div className="size-1.5 bg-white rounded-full animate-ping" />
                                    ) : (
                                      <div className="size-1.5 bg-slate-800 rounded-full" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className={`text-xs font-bold transition-colors ${
                                        isCompleted ? "text-slate-200" : isOngoing ? "text-blue-300 font-semibold" : "text-slate-500"
                                      }`}>
                                        {label}
                                      </h4>
                                      {isCompleted ? (
                                        <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex-shrink-0">
                                          Selesai
                                        </span>
                                      ) : isOngoing ? (
                                        <span className="text-[9px] text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 animate-pulse flex-shrink-0">
                                          On Going
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {data.Desain_Ready ? `Tanggal Ready: ${formatIndonesianDateTime(data.Desain_Ready)}` : isOngoing ? "Proses pembuatan desain" : "Menunggu Order Success"}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Step 3: Layout Step */}
                            {(() => {
                              const isCompleted = !!data.Layout_Ready;
                              const isOngoing = !isCompleted && (!!data.Desain_Ready || !!data.Start_Layout);
                              const label = isCompleted ? "Layout Ready" : "Start Layout";
                              
                              return (
                                <div className="relative pl-8">
                                  <div className={`absolute left-0 top-0.5 flex-shrink-0 flex items-center justify-center rounded-full w-5 h-5 border transition-all duration-300 z-10 ${
                                    isCompleted 
                                      ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                                      : isOngoing 
                                        ? "bg-blue-500 border-blue-400 text-white animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" 
                                        : "bg-slate-950 border-slate-800 text-slate-600"
                                  }`}>
                                    {isCompleted ? (
                                      <Check size={11} strokeWidth={3} />
                                    ) : isOngoing ? (
                                      <div className="size-1.5 bg-white rounded-full animate-ping" />
                                    ) : (
                                      <div className="size-1.5 bg-slate-800 rounded-full" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className={`text-xs font-bold transition-colors ${
                                        isCompleted ? "text-slate-200" : isOngoing ? "text-blue-300 font-semibold" : "text-slate-500"
                                      }`}>
                                        {label}
                                      </h4>
                                      {isCompleted ? (
                                        <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex-shrink-0">
                                          Selesai
                                        </span>
                                      ) : isOngoing ? (
                                        <span className="text-[9px] text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 animate-pulse flex-shrink-0">
                                          On Going
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {data.Layout_Ready 
                                        ? `Tanggal Ready: ${formatIndonesianDateTime(data.Layout_Ready)}` 
                                        : isOngoing 
                                          ? (data.Start_Layout 
                                            ? `Mulai Layout: ${formatIndonesianDateTime(data.Start_Layout)}` 
                                            : "Proses layouting") 
                                          : "Menunggu Design Ready"
                                      }
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Step 4: Cloth Preparation Step */}
                            {(data.Layout_Ready || data.Ambil_Kain) && (() => {
                              const isCompleted = !!data.Kain_ReadyPress;
                              const isOngoing = !isCompleted && (!!data.Layout_Ready || !!data.Ambil_Kain);
                              const label = isCompleted ? "Cloth Ready to Press" : "Cloth Preparation";
                              return (
                                <div className="relative pl-8">
                                  <div className={`absolute left-0 top-0.5 flex-shrink-0 flex items-center justify-center rounded-full w-5 h-5 border transition-all duration-300 z-10 ${
                                    isCompleted 
                                      ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                                      : isOngoing 
                                        ? "bg-blue-500 border-blue-400 text-white animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" 
                                        : "bg-slate-950 border-slate-800 text-slate-600"
                                  }`}>
                                    {isCompleted ? (
                                      <Check size={11} strokeWidth={3} />
                                    ) : isOngoing ? (
                                      <div className="size-1.5 bg-white rounded-full animate-ping" />
                                    ) : (
                                      <div className="size-1.5 bg-slate-800 rounded-full" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className={`text-xs font-bold transition-colors ${
                                        isCompleted ? "text-slate-200" : isOngoing ? "text-blue-300 font-semibold" : "text-slate-500"
                                      }`}>
                                        {label}
                                      </h4>
                                      {isCompleted ? (
                                        <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex-shrink-0">
                                          Selesai
                                        </span>
                                      ) : isOngoing ? (
                                        <span className="text-[9px] text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 animate-pulse flex-shrink-0">
                                          On Going
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {isCompleted 
                                        ? `Kain Siap Press: ${formatIndonesianDateTime(data.Kain_ReadyPress)}` 
                                        : (data.Ambil_Kain 
                                            ? `Ambil Kain: ${formatIndonesianDateTime(data.Ambil_Kain)}` 
                                            : "Proses persiapan kain")}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Step 5: Printing Step */}
                            {(data.Kain_ReadyPress || data.Start_Print) && (() => {
                              const isCompleted = !!data.Print_ReadyPress;
                              const isOngoing = !isCompleted && (!!data.Kain_ReadyPress || !!data.Start_Print);
                              const label = isCompleted ? "Finish Printing" : "Start Printing";
                              return (
                                <div className="relative pl-8">
                                  <div className={`absolute left-0 top-0.5 flex-shrink-0 flex items-center justify-center rounded-full w-5 h-5 border transition-all duration-300 z-10 ${
                                    isCompleted 
                                      ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                                      : isOngoing 
                                        ? "bg-blue-500 border-blue-400 text-white animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" 
                                        : "bg-slate-950 border-slate-800 text-slate-600"
                                  }`}>
                                    {isCompleted ? (
                                      <Check size={11} strokeWidth={3} />
                                    ) : isOngoing ? (
                                      <div className="size-1.5 bg-white rounded-full animate-ping" />
                                    ) : (
                                      <div className="size-1.5 bg-slate-800 rounded-full" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className={`text-xs font-bold transition-colors ${
                                        isCompleted ? "text-slate-200" : isOngoing ? "text-blue-300 font-semibold" : "text-slate-500"
                                      }`}>
                                        {label}
                                      </h4>
                                      {isCompleted ? (
                                        <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex-shrink-0">
                                          Selesai
                                        </span>
                                      ) : isOngoing ? (
                                        <span className="text-[9px] text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 animate-pulse flex-shrink-0">
                                          On Going
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {isCompleted 
                                        ? `Selesai Print: ${formatIndonesianDateTime(data.Print_ReadyPress)}` 
                                        : (data.Start_Print 
                                            ? `Mulai Print: ${formatIndonesianDateTime(data.Start_Print)}` 
                                            : "Proses printing")}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Step 6: Press Step */}
                            {(data.Print_ReadyPress || data.Start_Press) && (() => {
                              const isCompleted = !!data.Press_ReadyCut;
                              const isOngoing = !isCompleted && (!!data.Print_ReadyPress || !!data.Start_Press);
                              const label = isCompleted ? "Finish Press" : "Start Press";
                              return (
                                <div className="relative pl-8">
                                  <div className={`absolute left-0 top-0.5 flex-shrink-0 flex items-center justify-center rounded-full w-5 h-5 border transition-all duration-300 z-10 ${
                                    isCompleted 
                                      ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                                      : isOngoing 
                                        ? "bg-blue-500 border-blue-400 text-white animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" 
                                        : "bg-slate-950 border-slate-800 text-slate-600"
                                  }`}>
                                    {isCompleted ? (
                                      <Check size={11} strokeWidth={3} />
                                    ) : isOngoing ? (
                                      <div className="size-1.5 bg-white rounded-full animate-ping" />
                                    ) : (
                                      <div className="size-1.5 bg-slate-800 rounded-full" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className={`text-xs font-bold transition-colors ${
                                        isCompleted ? "text-slate-200" : isOngoing ? "text-blue-300 font-semibold" : "text-slate-500"
                                      }`}>
                                        {label}
                                      </h4>
                                      {isCompleted ? (
                                        <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex-shrink-0">
                                          Selesai
                                        </span>
                                      ) : isOngoing ? (
                                        <span className="text-[9px] text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 animate-pulse flex-shrink-0">
                                          On Going
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {isCompleted 
                                        ? `Selesai Press: ${formatIndonesianDateTime(data.Press_ReadyCut)}` 
                                        : (data.Start_Press 
                                            ? `Mulai Press: ${formatIndonesianDateTime(data.Start_Press)}` 
                                            : "Proses pemotongan & pengepresan")}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Step 7: Cutting Step */}
                            {(data.Press_ReadyCut || data.Start_Cut) && (() => {
                              const isCompleted = !!data.Cut_ReadyJahit;
                              const isOngoing = !isCompleted && (!!data.Press_ReadyCut || !!data.Start_Cut);
                              const label = isCompleted ? "Finish Cutting" : "Start Cutting";
                              return (
                                <div className="relative pl-8">
                                  <div className={`absolute left-0 top-0.5 flex-shrink-0 flex items-center justify-center rounded-full w-5 h-5 border transition-all duration-300 z-10 ${
                                    isCompleted 
                                      ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                                      : "bg-blue-500 border-blue-400 text-white animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" 
                                  }`}>
                                    {isCompleted ? (
                                      <Check size={11} strokeWidth={3} />
                                    ) : (
                                      <div className="size-1.5 bg-white rounded-full animate-ping" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className={`text-xs font-bold transition-colors ${
                                        isCompleted ? "text-slate-200" : "text-blue-300 font-semibold"
                                      }`}>
                                        {label}
                                      </h4>
                                      {isCompleted ? (
                                        <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex-shrink-0">
                                          Selesai
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 animate-pulse flex-shrink-0">
                                          On Going
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {isCompleted 
                                        ? `Selesai Cutting: ${formatIndonesianDateTime(data.Cut_ReadyJahit)}` 
                                        : (data.Start_Cut 
                                            ? `Mulai Cutting: ${formatIndonesianDateTime(data.Start_Cut)}` 
                                            : "Proses pemotongan bahan")}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Step 8: Sew Clothes Step */}
                            {(data.Cut_ReadyJahit || data.Start_Jahit) && (() => {
                              const isCompleted = !!data.Jahit_ReadyQC;
                              const isOngoing = !isCompleted && (!!data.Cut_ReadyJahit || !!data.Start_Jahit);
                              const label = isCompleted ? "Finish Sew Clothes" : "Start Sew Clothes";
                              return (
                                <div className="relative pl-8">
                                  <div className={`absolute left-0 top-0.5 flex-shrink-0 flex items-center justify-center rounded-full w-5 h-5 border transition-all duration-300 z-10 ${
                                    isCompleted 
                                      ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                                      : "bg-blue-500 border-blue-400 text-white animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" 
                                  }`}>
                                    {isCompleted ? (
                                      <Check size={11} strokeWidth={3} />
                                    ) : (
                                      <div className="size-1.5 bg-white rounded-full animate-ping" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className={`text-xs font-bold transition-colors ${
                                        isCompleted ? "text-slate-200" : "text-blue-300 font-semibold"
                                      }`}>
                                        {label}
                                      </h4>
                                      {isCompleted ? (
                                        <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex-shrink-0">
                                          Selesai
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 animate-pulse flex-shrink-0">
                                          On Going
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {isCompleted 
                                        ? `Selesai Jahit: ${formatIndonesianDateTime(data.Jahit_ReadyQC)}` 
                                        : (data.Start_Jahit 
                                            ? `Mulai Jahit: ${formatIndonesianDateTime(data.Start_Jahit)}` 
                                            : "Proses penjahitan pakaian")}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Step 9: Quality Control Step */}
                            {(data.Jahit_ReadyQC || data.Start_QC) && (() => {
                              const isCompleted = !!data.FinalQC_Packiing;
                              const isOngoing = !isCompleted && (!!data.Jahit_ReadyQC || !!data.Start_QC);
                              const label = isCompleted ? "Finish Quality Control" : "Start Quality Control";
                              return (
                                <div className="relative pl-8">
                                  <div className={`absolute left-0 top-0.5 flex-shrink-0 flex items-center justify-center rounded-full w-5 h-5 border transition-all duration-300 z-10 ${
                                    isCompleted 
                                      ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                                      : "bg-blue-500 border-blue-400 text-white animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" 
                                  }`}>
                                    {isCompleted ? (
                                      <Check size={11} strokeWidth={3} />
                                    ) : (
                                      <div className="size-1.5 bg-white rounded-full animate-ping" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className={`text-xs font-bold transition-colors ${
                                        isCompleted ? "text-slate-200" : "text-blue-300 font-semibold"
                                      }`}>
                                        {label}
                                      </h4>
                                      {isCompleted ? (
                                        <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex-shrink-0">
                                          Selesai
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 animate-pulse flex-shrink-0">
                                          On Going
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {isCompleted 
                                        ? `Selesai QC: ${formatIndonesianDateTime(data.FinalQC_Packiing)}` 
                                        : (data.Start_QC 
                                            ? `Mulai QC: ${formatIndonesianDateTime(data.Start_QC)}` 
                                            : "Proses penjaminan mutu")}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Step 10: Packing Step */}
                            {data.FinalQC_Packiing && (() => {
                              const isCompleted = !!data.QC_ReadyGudang;
                              const isOngoing = !isCompleted;
                              const label = isCompleted ? "Packed and ready to pickup" : "Packing Process";
                              return (
                                <div className="relative pl-8">
                                  <div className={`absolute left-0 top-0.5 flex-shrink-0 flex items-center justify-center rounded-full w-5 h-5 border transition-all duration-300 z-10 ${
                                    isCompleted 
                                      ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                                      : "bg-blue-500 border-blue-400 text-white animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" 
                                  }`}>
                                    {isCompleted ? (
                                      <Check size={11} strokeWidth={3} />
                                    ) : (
                                      <div className="size-1.5 bg-white rounded-full animate-ping" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className={`text-xs font-bold transition-colors ${
                                        isCompleted ? "text-slate-200" : "text-blue-300 font-semibold"
                                      }`}>
                                        {label}
                                      </h4>
                                      {isCompleted ? (
                                        <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex-shrink-0">
                                          Selesai
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 animate-pulse flex-shrink-0">
                                          On Going
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {isCompleted 
                                        ? `Siap Diambil: ${formatIndonesianDateTime(data.QC_ReadyGudang)}` 
                                        : `Proses Packing (sejak ${formatIndonesianDateTime(data.FinalQC_Packiing)})`}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Step 11: Pickup Step */}
                            {data.QC_ReadyGudang && (() => {
                              const isCompleted = !!data.Final_Cust;
                              const isOngoing = !isCompleted;
                              const label = isCompleted ? "Received by the customer" : "Waiting Customer Pickup";
                              return (
                                <div className="relative pl-8">
                                  <div className={`absolute left-0 top-0.5 flex-shrink-0 flex items-center justify-center rounded-full w-5 h-5 border transition-all duration-300 z-10 ${
                                    isCompleted 
                                      ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                                      : "bg-blue-500 border-blue-400 text-white animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" 
                                  }`}>
                                    {isCompleted ? (
                                      <Check size={11} strokeWidth={3} />
                                    ) : (
                                      <div className="size-1.5 bg-white rounded-full animate-ping" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className={`text-xs font-bold transition-colors ${
                                        isCompleted ? "text-slate-200" : "text-blue-300 font-semibold"
                                      }`}>
                                        {label}
                                      </h4>
                                      {isCompleted ? (
                                        <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex-shrink-0">
                                          Selesai
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 animate-pulse flex-shrink-0">
                                          On Going
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {isCompleted 
                                        ? `Diterima Pelanggan: ${formatIndonesianDateTime(data.Final_Cust)}` 
                                        : `Menunggu Diambil (sejak ${formatIndonesianDateTime(data.QC_ReadyGudang)})`}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      <div className="rounded-lg bg-slate-950/50 border border-slate-800/40 p-4 space-y-3.5">
                        <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
                          <Coins size={14} className="text-amber-400" />
                          Informasi Pembayaran
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Total Payment</span>
                            <span className="mt-0.5 block text-sm font-bold text-slate-200">
                              {formatRupiah(data.totalrp)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Remaining Balance</span>
                            <span className={`mt-0.5 block text-sm font-bold ${
                              (data.sisa_tagihan ?? 0) > 0 ? "text-amber-900 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                            }`}>
                              {formatRupiah(data.sisa_tagihan)}
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-slate-800/40 my-2"></div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider">DP (Uang Muka)</span>
                            <span className="mt-0.5 block text-xs font-bold text-slate-300">
                              {formatRupiah(data.uang_muka)}
                            </span>
                            {data.tgl_um && (
                              <span className="block text-[9px] text-slate-500 mt-0.5">
                                Tgl: {formatIndonesianDate(data.tgl_um)}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Repayment (Pelunasan)</span>
                            <span className="mt-0.5 block text-xs font-bold text-slate-300">
                              {formatRupiah(data.bayar_lunas)}
                            </span>
                            {data.tgl_pelunasan && (
                              <span className="block text-[9px] text-slate-500 mt-0.5">
                                Tgl: {formatIndonesianDate(data.tgl_pelunasan)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Remark / Keterangan */}
                      <div className="rounded-lg bg-slate-950/40 border border-slate-800/40 p-4">
                        <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider mb-2">Remark / Keterangan</span>
                        <div className="rounded border border-slate-800/80 bg-slate-950/80 p-3 text-xs text-slate-300 leading-relaxed font-sans min-h-[60px] whitespace-pre-wrap">
                          {data.remark || "Tidak ada keterangan tambahan."}
                        </div>
                      </div>
                        </>
                      )}

                      {activeTab === "detail" && (
                        <div className="space-y-4">
                          {/* Standing Header showing No FO and Customer when scrolling */}
                          <div className="sticky -top-6 bg-slate-900 z-10 py-3 px-6 border-b border-slate-800 -mx-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-md mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">No FO:</span>
                              <span className="font-mono text-xs font-bold text-cyan-300">{data.no_fo}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Customer:</span>
                              <span className="text-xs font-semibold text-slate-200 truncate max-w-[200px]" title={data.customer ?? ""}>{data.customer ?? "-"}</span>
                            </div>
                          </div>

                          {/* Title & Filter Toggle Button */}
                          <div className="flex justify-between items-center border-b border-slate-800/40 pb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <ClipboardList size={14} className="text-cyan-700 dark:text-cyan-400" />
                              Daftar Item Detail
                            </span>
                            <button
                              onClick={() => setShowDetailFilters(!showDetailFilters)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all duration-300 ${
                                showDetailFilters
                                  ? "bg-cyan-500/10 border-cyan-500/35 text-cyan-400 hover:bg-cyan-500/20"
                                  : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white"
                              }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                              </svg>
                              {showDetailFilters ? "Sembunyikan Pencarian" : "Tampilkan Pencarian"}
                            </button>
                          </div>

                          {/* Search & Limit Control - Collapsible */}
                          {showDetailFilters && (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-lg border border-slate-800 bg-slate-950/30 transition-all duration-300">
                              {/* Search Input */}
                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  placeholder="Cari detail item..."
                                  value={detailSearch}
                                  onChange={(e) => {
                                    setDetailSearch(e.target.value);
                                    setDetailPage(1);
                                  }}
                                  className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3.5 py-1.5 pl-9 text-xs text-slate-300 placeholder-slate-500 focus:border-cyan-500/80 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all duration-300"
                                />
                                <span className="absolute left-3 top-2 text-slate-500">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
                                  </svg>
                                </span>
                                {detailSearch && (
                                  <button
                                    onClick={() => {
                                      setDetailSearch("");
                                      setDetailPage(1);
                                    }}
                                    className="absolute right-3 top-2 text-slate-400 hover:text-white transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>

                              {/* Page Size Select */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tampil:</span>
                                <select
                                  value={detailLimit}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setDetailLimit(val === "all" ? "all" : Number(val));
                                    setDetailPage(1);
                                  }}
                                  className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none transition-all duration-300"
                                >
                                  <option value={5}>5</option>
                                  <option value={10}>10</option>
                                  <option value={25}>25</option>
                                  <option value={50}>50</option>
                                  <option value={100}>100</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Table view for Desktop screens */}
                          <div className="hidden lg:block overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-950/30 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                            <table className="w-full text-left border-collapse min-w-[850px]">
                              <thead>
                                <tr className="border-b border-slate-800 bg-slate-950/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  <th className="px-4 py-3 font-semibold min-w-[280px]">Detail Item</th>
                                  <th className="px-4 py-3 font-semibold">Produk</th>
                                  <th className="px-4 py-3 font-semibold">Model</th>
                                  <th className="px-4 py-3 font-semibold">Bahan</th>
                                  <th className="px-4 py-3 font-semibold">Size</th>
                                  <th className="px-4 py-3 text-right font-semibold w-24">Qty</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/55 text-xs text-slate-300">
                                {foDetailItemsQuery.isLoading ? (
                                  <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">
                                      <div className="flex items-center justify-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                                        <span>Memuat detail item...</span>
                                      </div>
                                    </td>
                                  </tr>
                                ) : foDetailItemsQuery.isError ? (
                                  <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-rose-400 font-semibold">
                                      Gagal memuat detail item: {foDetailItemsQuery.error instanceof Error ? foDetailItemsQuery.error.message : "Error"}
                                    </td>
                                  </tr>
                                ) : (foDetailItemsQuery.data?.items ?? []).length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center">
                                      <div className="flex flex-col items-center justify-center gap-1 py-4">
                                        <span className="text-sm font-semibold text-slate-400">Data tidak ditemukan</span>
                                        <span className="text-xs text-slate-500">Tidak ada detail item yang tercatat untuk Form Order ini.</span>
                                      </div>
                                    </td>
                                  </tr>
                                ) : (
                                  (foDetailItemsQuery.data?.items ?? []).map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                                      <td className="px-4 py-2.5 font-sans min-w-[280px] break-all">{item.detail_item || "-"}</td>
                                      <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">{item.produk || "-"}</td>
                                      <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{item.model || "-"}</td>
                                      <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{item.bahan || "-"}</td>
                                      <td className="px-4 py-2.5 whitespace-nowrap">
                                        {item.size ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-800/80 text-slate-300 font-mono">
                                            {item.size.trim()}
                                          </span>
                                        ) : (
                                          "-"
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-bold text-emerald-400 tabular-nums">
                                        {item.qty} {item.produk && item.produk.toUpperCase().includes("SETELAN") ? "Stel" : "Pcs"}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* List view for Mobile & Tablet screens */}
                          <div className="lg:hidden space-y-3">
                            {foDetailItemsQuery.isLoading ? (
                              <div className="flex items-center justify-center py-8 gap-2 text-slate-500 italic text-xs">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                                <span>Memuat detail item...</span>
                              </div>
                            ) : foDetailItemsQuery.isError ? (
                              <div className="text-center text-rose-400 py-8 text-xs font-semibold">
                                Gagal memuat detail item: {foDetailItemsQuery.error instanceof Error ? foDetailItemsQuery.error.message : "Error"}
                              </div>
                            ) : (foDetailItemsQuery.data?.items ?? []).length === 0 ? (
                              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-6 text-center">
                                <span className="block text-xs font-semibold text-slate-400">Data tidak ditemukan</span>
                                <span className="block text-[11px] text-slate-500 mt-1">Tidak ada detail item yang tercatat untuk Form Order ini.</span>
                              </div>
                            ) : (
                              (foDetailItemsQuery.data?.items ?? []).map((item) => (
                                <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 space-y-2.5">
                                  <div className="flex justify-between items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Detail Item</span>
                                      <span className="text-xs font-semibold text-slate-200 font-sans block mt-0.5 break-words leading-relaxed">{item.detail_item || "-"}</span>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Qty</span>
                                      <span className="block text-xs font-bold text-emerald-400 mt-0.5">
                                        {item.qty} {item.produk && item.produk.toUpperCase().includes("SETELAN") ? "Stel" : "Pcs"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/40">
                                    <div>
                                      <span className="block text-[9px] uppercase font-semibold text-slate-500">Produk</span>
                                      <span className="text-xs text-slate-300 block mt-0.5 break-words">{item.produk || "-"}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[9px] uppercase font-semibold text-slate-500">Model</span>
                                      <span className="text-xs text-slate-300 block mt-0.5 break-words">{item.model || "-"}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[9px] uppercase font-semibold text-slate-500">Bahan</span>
                                      <span className="text-xs text-slate-300 block mt-0.5 break-words">{item.bahan || "-"}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[9px] uppercase font-semibold text-slate-500">Size</span>
                                      <span className="block mt-1">
                                        {item.size ? (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                                            {item.size.trim()}
                                          </span>
                                        ) : (
                                          "-"
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Pagination Controls */}
                          {foDetailItemsQuery.data && foDetailItemsQuery.data.totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-slate-800/60 pt-4 flex-shrink-0">
                              <span className="text-[10px] text-slate-500 font-medium">
                                Menampilkan Halaman <span className="font-semibold text-slate-300">{foDetailItemsQuery.data.page}</span> dari <span className="font-semibold text-slate-300">{foDetailItemsQuery.data.totalPages}</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  disabled={detailPage === 1}
                                  onClick={() => setDetailPage((p) => Math.max(1, p - 1))}
                                  className="px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-all duration-300"
                                >
                                  Prev
                                </button>
                                <button
                                  disabled={detailPage >= foDetailItemsQuery.data.totalPages}
                                  onClick={() => setDetailPage((p) => p + 1)}
                                  className="px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-all duration-300"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === "job" && (
                        <div className="space-y-4">
                          {/* Standing Header showing No FO and Customer when scrolling */}
                          <div className="sticky -top-6 bg-slate-900 z-10 py-3 px-6 border-b border-slate-800 -mx-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-md mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">No FO:</span>
                              <span className="font-mono text-xs font-bold text-cyan-300">{data.no_fo}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Customer:</span>
                              <span className="text-xs font-semibold text-slate-200 truncate max-w-[200px]" title={data.customer ?? ""}>{data.customer ?? "-"}</span>
                            </div>
                          </div>

                          {/* Title & Filter Toggle Button */}
                          <div className="flex justify-between items-center border-b border-slate-800/40 pb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Activity size={14} className="text-cyan-400 animate-pulse" />
                              Daftar Detail Pekerjaan
                            </span>
                            <button
                              onClick={() => setShowJobFilters(!showJobFilters)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all duration-300 ${
                                showJobFilters
                                  ? "bg-cyan-500/10 border-cyan-500/35 text-cyan-400 hover:bg-cyan-500/20"
                                  : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white"
                              }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                              </svg>
                              {showJobFilters ? "Sembunyikan Pencarian" : "Tampilkan Pencarian"}
                            </button>
                          </div>

                          {/* Search & Limit Control - Collapsible */}
                          {showJobFilters && (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-lg border border-slate-800 bg-slate-950/30 transition-all duration-300">
                              {/* Search Input */}
                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  placeholder="Cari no job, pegawai, status, jobdesk..."
                                  value={jobSearch}
                                  onChange={(e) => {
                                    setJobSearch(e.target.value);
                                    setJobPage(1);
                                  }}
                                  className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3.5 py-1.5 pl-9 text-xs text-slate-300 placeholder-slate-500 focus:border-cyan-500/80 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all duration-300"
                                />
                                <span className="absolute left-3 top-2 text-slate-500">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
                                  </svg>
                                </span>
                                {jobSearch && (
                                  <button
                                    onClick={() => {
                                      setJobSearch("");
                                      setJobPage(1);
                                    }}
                                    className="absolute right-3 top-2 text-slate-400 hover:text-white transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>

                              {/* Page Size Select */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tampil:</span>
                                <select
                                  value={jobLimit}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setJobLimit(val === "all" ? "all" : Number(val));
                                    setJobPage(1);
                                  }}
                                  className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none transition-all duration-300"
                                >
                                  <option value={5}>5</option>
                                  <option value={10}>10</option>
                                  <option value={25}>25</option>
                                  <option value={50}>50</option>
                                  <option value={100}>100</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Table view for Desktop screens */}
                          <div className="hidden lg:block overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-950/30 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                            <table className="w-full text-left border-collapse min-w-[850px]">
                              <thead>
                                <tr className="border-b border-slate-800 bg-slate-950/70 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                                  <th className="px-4 py-3 font-semibold">No Job</th>
                                  <th className="px-4 py-3 font-semibold">Datetime Awal</th>
                                  <th className="px-4 py-3 font-semibold">Status Awal</th>
                                  <th className="px-4 py-3 font-semibold">Datetime Lanjutan</th>
                                  <th className="px-4 py-3 font-semibold">Status Lanjutan</th>
                                  <th className="px-4 py-3 font-semibold">Pegawai</th>
                                  <th className="px-4 py-3 font-semibold">Jobdesk</th>
                                  <th className="px-4 py-3 font-semibold">Keterangan</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/55 text-xs text-slate-300">
                                {foJobDetailsQuery.isLoading ? (
                                  <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500 italic">
                                      <div className="flex items-center justify-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                                        <span>Memuat detail job...</span>
                                      </div>
                                    </td>
                                  </tr>
                                ) : foJobDetailsQuery.isError ? (
                                  <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-rose-400 font-semibold">
                                      Gagal memuat detail job: {foJobDetailsQuery.error instanceof Error ? foJobDetailsQuery.error.message : "Error"}
                                    </td>
                                  </tr>
                                ) : (foJobDetailsQuery.data?.items ?? []).length === 0 ? (
                                  <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center">
                                      <div className="flex flex-col items-center justify-center gap-1 py-4">
                                        <span className="text-sm font-semibold text-slate-400">Data tidak ditemukan</span>
                                        <span className="text-xs text-slate-500">Tidak ada log/detail pekerjaan yang tercatat untuk Form Order ini.</span>
                                      </div>
                                    </td>
                                  </tr>
                                ) : (
                                  (foJobDetailsQuery.data?.items ?? []).map((job) => (
                                    <tr key={job.id} className="hover:bg-slate-800/20 transition-colors">
                                      <td className="px-4 py-2.5 font-mono text-cyan-300 font-semibold whitespace-nowrap">{job.no_job || "-"}</td>
                                      <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{formatIndonesianDateTime(job.datetime_awal)}</td>
                                      <td className="px-4 py-2.5 text-slate-300">{job.status_awal || "-"}</td>
                                      <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{formatIndonesianDateTime(job.datetime_lanjutan)}</td>
                                      <td className="px-4 py-2.5 text-slate-300">{job.status_lanjutan || "-"}</td>
                                      <td className="px-4 py-2.5 font-semibold text-slate-200 whitespace-nowrap">{job.nama_pegawai || job.username || "-"}</td>
                                      <td className="px-4 py-2.5 whitespace-nowrap">
                                        {job.jobdesk ? (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 uppercase tracking-wide font-mono">
                                            {job.jobdesk}
                                          </span>
                                        ) : (
                                          "-"
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-400 break-all max-w-[200px]">{job.ket || "-"}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* List view for Mobile & Tablet screens */}
                          <div className="lg:hidden space-y-3">
                            {foJobDetailsQuery.isLoading ? (
                              <div className="flex items-center justify-center py-8 gap-2 text-slate-500 italic text-xs">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                                <span>Memuat detail job...</span>
                              </div>
                            ) : foJobDetailsQuery.isError ? (
                              <div className="text-center text-rose-400 py-8 text-xs font-semibold">
                                Gagal memuat detail job: {foJobDetailsQuery.error instanceof Error ? foJobDetailsQuery.error.message : "Error"}
                              </div>
                            ) : (foJobDetailsQuery.data?.items ?? []).length === 0 ? (
                              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-6 text-center">
                                <span className="block text-xs font-semibold text-slate-400">Data tidak ditemukan</span>
                                <span className="block text-[11px] text-slate-500 mt-1">Tidak ada log/detail pekerjaan yang tercatat untuk Form Order ini.</span>
                              </div>
                            ) : (
                              (foJobDetailsQuery.data?.items ?? []).map((job) => (
                                <div key={job.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 space-y-2.5">
                                  <div className="flex justify-between items-start gap-3">
                                    <div>
                                      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">No Job</span>
                                      <span className="text-xs font-mono text-cyan-300 font-semibold block mt-0.5">{job.no_job || "-"}</span>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pegawai</span>
                                      <span className="block text-xs font-semibold text-slate-200 mt-0.5">{job.nama_pegawai || job.username || "-"}</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/40">
                                    <div>
                                      <span className="block text-[9px] uppercase font-semibold text-slate-500">Datetime Awal</span>
                                      <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">{formatIndonesianDateTime(job.datetime_awal)}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[9px] uppercase font-semibold text-slate-500">Datetime Lanjutan</span>
                                      <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">{formatIndonesianDateTime(job.datetime_lanjutan)}</span>
                                    </div>
                                  </div>

                                  <div className="space-y-2 pt-2 border-t border-slate-800/40">
                                    <div>
                                      <span className="block text-[9px] uppercase font-semibold text-slate-500">Status Awal</span>
                                      <span className="text-xs text-slate-300 block mt-0.5 leading-relaxed">{job.status_awal || "-"}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[9px] uppercase font-semibold text-slate-500">Status Lanjutan</span>
                                      <span className="text-xs text-slate-300 block mt-0.5 leading-relaxed">{job.status_lanjutan || "-"}</span>
                                    </div>
                                    <div className="flex justify-between items-start gap-3 pt-1">
                                      <div className="flex-1">
                                        <span className="block text-[9px] uppercase font-semibold text-slate-500">Keterangan</span>
                                        <span className="text-xs text-slate-400 block mt-0.5 break-words leading-relaxed">{job.ket || "-"}</span>
                                      </div>
                                      <div className="flex-shrink-0 text-right">
                                        <span className="block text-[9px] uppercase font-semibold text-slate-500 mb-0.5">Jobdesk</span>
                                        {job.jobdesk ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 uppercase tracking-wide font-mono">
                                            {job.jobdesk}
                                          </span>
                                        ) : (
                                          "-"
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Pagination Controls */}
                          {foJobDetailsQuery.data && foJobDetailsQuery.data.totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-slate-800/60 pt-4 flex-shrink-0">
                              <span className="text-[10px] text-slate-500 font-medium">
                                Menampilkan Halaman <span className="font-semibold text-slate-300">{foJobDetailsQuery.data.page}</span> dari <span className="font-semibold text-slate-300">{foJobDetailsQuery.data.totalPages}</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  disabled={jobPage === 1}
                                  onClick={() => setJobPage((p) => Math.max(1, p - 1))}
                                  className="px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-all duration-300"
                                >
                                  Prev
                                </button>
                                <button
                                  disabled={jobPage >= foJobDetailsQuery.data.totalPages}
                                  onClick={() => setJobPage((p) => p + 1)}
                                  className="px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-all duration-300"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
