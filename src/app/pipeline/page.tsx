"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  ArrowRight,
  ClipboardList,
  Eye,
  Timer,
  X,
  Phone,
  User,
  Palette,
  Coins,
  Check,
  Activity,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { api } from "@/lib/api";
import type { FoDetailData, FoOutstandingRow } from "@/lib/types";

const pipelineCards = [
  {
    title: "FO Outstanding",
    description: "Form order yang masih menunggu tindak lanjut.",
    icon: ClipboardList,
    tone: "text-amber-200",
    type: "outstanding",
  },
  {
    title: "FO Deadline",
    description: "Order aktif yang perlu dipantau berdasarkan tanggal deadline.",
    icon: Timer,
    tone: "text-cyan-200",
    type: "deadline",
  },
  {
    title: "FO Overdue",
    description: "Order aktif yang telah melewati batas deadline pengerjaan.",
    icon: AlertTriangle,
    tone: "text-rose-300",
    type: "overdue",
  },
  {
    title: "FO Complete",
    description: "Arsip order selesai untuk histori dan referensi produksi.",
    icon: Archive,
    tone: "text-emerald-200",
    type: "complete",
  },
];

const pageSizeOptions = [5, 10, 15, 25, 50, "all"] as const;

function formatDate(input: string | null) {
  if (!input) {
    return "-";
  }

  const datePart = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (datePart) {
    return `${datePart[3]}-${datePart[2]}-${datePart[1]}`;
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replace(/\//g, "-");
}

function formatIndonesianDateTime(input: string | Date | null) {
  if (!input) {
    return "-";
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

function formatIndonesianDate(input: string | Date | null) {
  if (!input) {
    return "-";
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

function matchesSearch(item: FoOutstandingRow, search: string) {
  const keyword = search.trim().toLowerCase();

  if (!keyword) {
    return true;
  }

  return (
    item.no_fo.toLowerCase().includes(keyword) ||
    (item.customer ?? "").toLowerCase().includes(keyword)
  );
}

export default function ProductionPipelinePage() {
  const [isOutstandingOpen, setIsOutstandingOpen] = useState(false);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const [isOverdueOpen, setIsOverdueOpen] = useState(false);
  const [selectedFo, setSelectedFo] = useState<FoOutstandingRow | null>(null);

  // States for Outstanding Modal
  const [outstandingPage, setOutstandingPage] = useState(1);
  const [outstandingLimit, setOutstandingLimit] = useState<number | "all">(5);
  const [outstandingSearch, setOutstandingSearch] = useState("");

  // States for Deadline Modal
  const [deadlinePage, setDeadlinePage] = useState(1);
  const [deadlineLimit, setDeadlineLimit] = useState<number | "all">(5);
  const [deadlineSearch, setDeadlineSearch] = useState("");
  const [deadlineType, setDeadlineType] = useState<string>("");

  // States for Overdue Modal
  const [overduePage, setOverduePage] = useState(1);
  const [overdueLimit, setOverdueLimit] = useState<number | "all">(5);
  const [overdueSearch, setOverdueSearch] = useState("");

  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  // States for Complete Modal
  const [completePage, setCompletePage] = useState(1);
  const [completeLimit, setCompleteLimit] = useState<number | "all">(5);
  const [completeSearch, setCompleteSearch] = useState("");

  const outstandingSummary = useQuery({
    queryKey: ["fo-outstanding-summary"],
    queryFn: () => api.getFoOutstanding({ page: 1, limit: 5 }),
  });

  const deadlineSummary = useQuery({
    queryKey: ["fo-deadline-summary"],
    queryFn: () => api.getFoDeadlineSummary({ page: 1, limit: 5 }),
  });

  const overdueSummary = useQuery({
    queryKey: ["fo-overdue-summary"],
    queryFn: () => api.getFoOverdue({ page: 1, limit: 5 }),
  });

  const completeSummary = useQuery({
    queryKey: ["fo-complete-summary"],
    queryFn: () => api.getFoComplete({ page: 1, limit: 5 }),
  });

  const outstandingTable = useQuery({
    queryKey: ["fo-outstanding", outstandingPage, outstandingLimit, outstandingSearch],
    queryFn: () =>
      api.getFoOutstanding({
        page: outstandingPage,
        limit: outstandingLimit,
        search: outstandingSearch,
      }),
    enabled: isOutstandingOpen,
  });

  const deadlineTable = useQuery({
    queryKey: ["fo-deadline", deadlinePage, deadlineLimit, deadlineSearch, deadlineType],
    queryFn: () =>
      api.getFoDeadlineSummary({
        page: deadlinePage,
        limit: deadlineLimit,
        search: deadlineSearch,
        deadline_type: deadlineType,
      }),
    enabled: isDeadlineOpen,
  });

  const overdueTable = useQuery({
    queryKey: ["fo-overdue", overduePage, overdueLimit, overdueSearch],
    queryFn: () =>
      api.getFoOverdue({
        page: overduePage,
        limit: overdueLimit,
        search: overdueSearch,
      }),
    enabled: isOverdueOpen,
  });

  const foDetailQuery = useQuery({
    queryKey: ["fo-detail", selectedFo?.no_fo],
    queryFn: () => api.getFoDetail(selectedFo!.no_fo),
    enabled: !!selectedFo?.no_fo,
  });

  const visibleOutstandingItems = (outstandingTable.data?.items ?? []).filter(
    (item, index, rows) =>
      matchesSearch(item, outstandingSearch) &&
      rows.findIndex((row) => row.no_fo === item.no_fo) === index,
  );

  const visibleDeadlineItems = (deadlineTable.data?.items ?? []).filter(
    (item, index, rows) =>
      matchesSearch(item, deadlineSearch) &&
      rows.findIndex((row) => row.no_fo === item.no_fo) === index,
  );

  const visibleOverdueItems = (overdueTable.data?.items ?? []).filter(
    (item, index, rows) =>
      matchesSearch(item, overdueSearch) &&
      rows.findIndex((row) => row.no_fo === item.no_fo) === index,
  );

  const completeTable = useQuery({
    queryKey: ["fo-complete", completePage, completeLimit, completeSearch],
    queryFn: () =>
      api.getFoComplete({
        page: completePage,
        limit: completeLimit,
        search: completeSearch,
      }),
    enabled: isCompleteOpen,
  });

  const visibleCompleteItems = (completeTable.data?.items ?? []).filter(
    (item, index, rows) =>
      matchesSearch(item, completeSearch) &&
      rows.findIndex((row) => row.no_fo === item.no_fo) === index,
  );

  return (
    <>
      <PageHeader
        title="Production Pipeline"
        description="Kelola alur FO dari outstanding, deadline, sampai complete dalam satu modul produksi."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pipelineCards.map((card) => {
          const Icon = card.icon;
          const isOutstanding = card.type === "outstanding";
          const isDeadline = card.type === "deadline";
          const isOverdue = card.type === "overdue";
          const isComplete = card.type === "complete";
          const content = (
            <>
              <div className="flex items-start justify-between gap-4">
                <div
                  className={`flex size-11 items-center justify-center rounded-lg bg-slate-950 ${card.tone}`}
                >
                  <Icon size={22} />
                </div>
                <ArrowRight
                  size={18}
                  className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-300"
                />
              </div>
              <div className="mt-6 flex items-end justify-between gap-4">
                <h2 className="text-lg font-semibold text-white">
                  {card.title}
                </h2>
                {isOutstanding ? (
                  <span className="text-3xl font-semibold text-white">
                    {outstandingSummary.isLoading
                      ? "-"
                      : outstandingSummary.data?.count ?? 0}
                  </span>
                ) : null}
                {isDeadline ? (
                  <span className="text-3xl font-semibold text-white">
                    {deadlineSummary.isLoading
                      ? "-"
                      : deadlineSummary.data?.count ?? 0}
                  </span>
                ) : null}
                {isOverdue ? (
                  <span className="text-3xl font-semibold text-white">
                    {overdueSummary.isLoading
                      ? "-"
                      : overdueSummary.data?.count ?? 0}
                  </span>
                ) : null}
                {isComplete ? (
                  <span className="text-3xl font-semibold text-white">
                    {completeSummary.isLoading
                      ? "-"
                      : completeSummary.data?.count ?? 0}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {card.description}
              </p>
              {isOutstanding && outstandingSummary.isError ? (
                <p className="mt-3 text-sm text-red-300">
                  {outstandingSummary.error.message}
                </p>
              ) : null}
              {isDeadline && deadlineSummary.isError ? (
                <p className="mt-3 text-sm text-red-300">
                  {deadlineSummary.error.message}
                </p>
              ) : null}
              {isOverdue && overdueSummary.isError ? (
                <p className="mt-3 text-sm text-red-300">
                  {overdueSummary.error.message}
                </p>
              ) : null}
              {isComplete && completeSummary.isError ? (
                <p className="mt-3 text-sm text-red-300">
                  {completeSummary.error.message}
                </p>
              ) : null}
            </>
          );

          if (isOutstanding) {
            return (
              <button
                key={card.title}
                className="group rounded-lg border border-slate-800 bg-slate-900/70 p-5 text-left shadow-sm shadow-slate-950/20 hover:border-cyan-400/40 hover:bg-slate-900"
                onClick={() => setIsOutstandingOpen(true)}
              >
                {content}
              </button>
            );
          }

          if (isDeadline) {
            return (
              <button
                key={card.title}
                className="group rounded-lg border border-slate-800 bg-slate-900/70 p-5 text-left shadow-sm shadow-slate-950/20 hover:border-cyan-400/40 hover:bg-slate-900"
                onClick={() => setIsDeadlineOpen(true)}
              >
                {content}
              </button>
            );
          }

          if (isOverdue) {
            return (
              <button
                key={card.title}
                className="group rounded-lg border border-slate-800 bg-slate-900/70 p-5 text-left shadow-sm shadow-slate-950/20 hover:border-cyan-400/40 hover:bg-slate-900"
                onClick={() => setIsOverdueOpen(true)}
              >
                {content}
              </button>
            );
          }

          if (isComplete) {
            return (
              <button
                key={card.title}
                className="group rounded-lg border border-slate-800 bg-slate-900/70 p-5 text-left shadow-sm shadow-slate-950/20 hover:border-cyan-400/40 hover:bg-slate-900"
                onClick={() => setIsCompleteOpen(true)}
              >
                {content}
              </button>
            );
          }

          return (
            <div
              key={card.title}
              className="group rounded-lg border border-slate-800 bg-slate-900/70 p-5 shadow-sm shadow-slate-950/20 hover:border-cyan-400/40 hover:bg-slate-900"
            >
              {content}
            </div>
          );
        })}
      </div>

      {isOutstandingOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
          <section className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40">
            <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  FO Outstanding
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Total {outstandingTable.data?.count ?? 0} form order belum
                  selesai.
                </p>
              </div>
              <button
                aria-label="Tutup modal"
                className="rounded-md p-2 text-slate-400 hover:bg-slate-900 hover:text-white"
                onClick={() => setIsOutstandingOpen(false)}
              >
                <X size={20} />
              </button>
            </header>

            <div className="overflow-auto flex-1">
              <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <label className="grid gap-2 text-sm md:w-80">
                  <span className="font-medium text-slate-300">Search</span>
                  <input
                    value={outstandingSearch}
                    onChange={(event) => {
                      setOutstandingSearch(event.target.value);
                      setOutstandingPage(1);
                    }}
                    placeholder="Cari No FO atau customer"
                    className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-white outline-none focus:border-cyan-400"
                  />
                </label>

                <label className="grid gap-2 text-sm md:w-44">
                  <span className="font-medium text-slate-300">Tampilkan</span>
                  <select
                    value={String(outstandingLimit)}
                    onChange={(event) => {
                      const nextValue =
                        event.target.value === "all"
                          ? "all"
                          : Number(event.target.value);
                      setOutstandingLimit(nextValue);
                      setOutstandingPage(1);
                    }}
                    className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-white outline-none focus:border-cyan-400"
                  >
                    {pageSizeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "all" ? "Semua data" : `${option} data`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <table className="hidden lg:table w-full min-w-[820px] text-sm">
                <thead className="sticky top-0 bg-slate-900 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">No FO</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {outstandingTable.isLoading ? (
                    <tr>
                      <td
                        className="px-5 py-8 text-center text-slate-400"
                        colSpan={5}
                      >
                        Memuat data FO Outstanding...
                      </td>
                    </tr>
                  ) : null}

                  {visibleOutstandingItems.map((item) => (
                    <tr key={item.no_fo} className="hover:bg-slate-900/70">
                      <td className="px-5 py-4 font-medium text-white">
                        {item.no_fo}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {formatDate(item.doc_date)}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {item.customer ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {item.status_lanjutan ?? item.status ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          aria-label={`Lihat detail ${item.no_fo}`}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-300"
                          onClick={() => setSelectedFo(item)}
                        >
                          <Eye size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!outstandingTable.isLoading &&
                  !visibleOutstandingItems.length ? (
                    <tr>
                      <td
                        className="px-5 py-8 text-center text-slate-400"
                        colSpan={5}
                      >
                        Tidak ada FO Outstanding.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>

              {/* Responsive Cards for Mobile/Tablet (< 1024px) */}
              <div className="block lg:hidden p-4 space-y-3">
                {outstandingTable.isLoading ? (
                  <div className="py-8 text-center text-slate-400">
                    Memuat data FO Outstanding...
                  </div>
                ) : null}

                {visibleOutstandingItems.map((item) => (
                  <div
                    key={item.no_fo}
                    className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/30 p-4 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/60"
                  >
                    {/* Glowing subtle top gradient bar on card hover */}
                    <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-amber-500/0 via-amber-500/40 to-amber-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                          No. Form Order
                        </div>
                        <div className="font-mono text-sm font-bold text-white tracking-wide">
                          {item.no_fo}
                        </div>
                      </div>
                      
                      <button
                        aria-label={`Lihat detail ${item.no_fo}`}
                        className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors shadow-inner"
                        onClick={() => setSelectedFo(item)}
                      >
                        <Eye size={18} />
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-800/60 pt-3 text-xs">
                      <div>
                        <div className="text-slate-500 mb-1 flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          <span>Date</span>
                        </div>
                        <div className="font-medium text-slate-300">
                          {formatDate(item.doc_date)}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500 mb-1 flex items-center gap-1.5">
                          <User size={13} className="text-slate-400" />
                          <span>Customer</span>
                        </div>
                        <div className="font-medium text-slate-300 truncate" title={item.customer ?? "-"}>
                          {item.customer ?? "-"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-800/60 pt-3 text-xs">
                      <div className="text-slate-500 flex items-center gap-1.5">
                        <Activity size={13} className="text-slate-400" />
                        <span>Status</span>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-amber-500/5 px-2.5 py-0.5 font-medium text-amber-400 border border-amber-500/10">
                        {item.status_lanjutan ?? item.status ?? "-"}
                      </span>
                    </div>
                  </div>
                ))}

                {!outstandingTable.isLoading && !visibleOutstandingItems.length ? (
                  <div className="py-8 text-center text-slate-400">
                    Tidak ada FO Outstanding.
                  </div>
                ) : null}
              </div>
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
              <p>
                {outstandingTable.isFetching
                  ? "Memperbarui data..."
                  : `Halaman ${outstandingTable.data?.page ?? outstandingPage} dari ${
                      outstandingTable.data?.totalPages ?? 1
                    }`}
              </p>
              <div className="flex gap-2">
                <button
                  className="h-9 rounded-lg border border-slate-700 px-3 text-slate-200 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={outstandingPage <= 1 || outstandingLimit === "all"}
                  onClick={() => setOutstandingPage((current) => Math.max(current - 1, 1))}
                >
                  Previous
                </button>
                <button
                  className="h-9 rounded-lg border border-slate-700 px-3 text-slate-200 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    outstandingLimit === "all" ||
                    outstandingPage >= (outstandingTable.data?.totalPages ?? 1)
                  }
                  onClick={() => setOutstandingPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}

      {isDeadlineOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
          <section className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40">
            <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  FO Deadline
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Total {deadlineTable.data?.count ?? 0} form order dalam masa tenggang.
                </p>
              </div>
              <button
                aria-label="Tutup modal"
                className="rounded-md p-2 text-slate-400 hover:bg-slate-900 hover:text-white"
                onClick={() => setIsDeadlineOpen(false)}
              >
                <X size={20} />
              </button>
            </header>

            <div className="overflow-auto flex-1">
              <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 md:flex-row md:items-center">
                <label className="grid gap-2 text-sm md:w-72">
                  <span className="font-medium text-slate-300">Search</span>
                  <input
                    value={deadlineSearch}
                    onChange={(event) => {
                      setDeadlineSearch(event.target.value);
                      setDeadlinePage(1);
                    }}
                    placeholder="Cari No FO atau customer"
                    className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-white outline-none focus:border-cyan-400"
                  />
                </label>

                <label className="grid gap-2 text-sm md:w-56">
                  <span className="font-medium text-slate-300">Filter Deadline</span>
                  <select
                    value={deadlineType}
                    onChange={(event) => {
                      setDeadlineType(event.target.value);
                      setDeadlinePage(1);
                    }}
                    className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-white outline-none focus:border-cyan-400"
                  >
                    <option value="">Semua Deadline</option>
                    <option value="singkat">Deadline Singkat (1-2 Hari)</option>
                    <option value="lama">Deadline Lama (3-4 Hari)</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm md:w-44 md:ml-auto">
                  <span className="font-medium text-slate-300">Tampilkan</span>
                  <select
                    value={String(deadlineLimit)}
                    onChange={(event) => {
                      const nextValue =
                        event.target.value === "all"
                          ? "all"
                          : Number(event.target.value);
                      setDeadlineLimit(nextValue);
                      setDeadlinePage(1);
                    }}
                    className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-white outline-none focus:border-cyan-400"
                  >
                    {pageSizeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "all" ? "Semua data" : `${option} data`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <table className="hidden lg:table w-full min-w-[820px] text-sm">
                <thead className="sticky top-0 bg-slate-900 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">No FO</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Deadline</th>
                    <th className="px-5 py-3 font-medium">Date Deadline</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {deadlineTable.isLoading ? (
                    <tr>
                      <td
                        className="px-5 py-8 text-center text-slate-400"
                        colSpan={7}
                      >
                        Memuat data FO Deadline...
                      </td>
                    </tr>
                  ) : null}

                  {visibleDeadlineItems.map((item) => (
                    <tr key={item.no_fo} className="hover:bg-slate-900/70">
                      <td className="px-5 py-4 font-medium text-white">
                        {item.no_fo}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {formatDate(item.doc_date)}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {item.customer ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {item.status_lanjutan ?? item.status ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {item.deadline_days ? `${item.deadline_days} Hari` : "-"}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {formatDate(item.deadline_date ?? null)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          aria-label={`Lihat detail ${item.no_fo}`}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-300"
                          onClick={() => setSelectedFo(item)}
                        >
                          <Eye size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!deadlineTable.isLoading &&
                  !visibleDeadlineItems.length ? (
                    <tr>
                      <td
                        className="px-5 py-8 text-center text-slate-400"
                        colSpan={7}
                      >
                        Tidak ada FO Deadline.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>

              {/* Responsive Cards for Mobile/Tablet (< 1024px) */}
              <div className="block lg:hidden p-4 space-y-3">
                {deadlineTable.isLoading ? (
                  <div className="py-8 text-center text-slate-400">
                    Memuat data FO Deadline...
                  </div>
                ) : null}

                {visibleDeadlineItems.map((item) => (
                  <div
                    key={item.no_fo}
                    className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/30 p-4 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/60"
                  >
                    {/* Glowing subtle top gradient bar on card hover */}
                    <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-cyan-500/0 via-cyan-500/40 to-cyan-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                          No. Form Order
                        </div>
                        <div className="font-mono text-sm font-bold text-white tracking-wide">
                          {item.no_fo}
                        </div>
                      </div>
                      
                      <button
                        aria-label={`Lihat detail ${item.no_fo}`}
                        className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors shadow-inner"
                        onClick={() => setSelectedFo(item)}
                      >
                        <Eye size={18} />
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-800/60 pt-3 text-xs">
                      <div>
                        <div className="text-slate-500 mb-1 flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          <span>Date Order</span>
                        </div>
                        <div className="font-medium text-slate-300">
                          {formatDate(item.doc_date)}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500 mb-1 flex items-center gap-1.5">
                          <User size={13} className="text-slate-400" />
                          <span>Customer</span>
                        </div>
                        <div className="font-medium text-slate-300 truncate" title={item.customer ?? "-"}>
                          {item.customer ?? "-"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-800/60 pt-3 text-xs">
                      <div>
                        <div className="text-slate-500 mb-1 flex items-center gap-1.5">
                          <Calendar size={13} className="text-rose-400/80" />
                          <span>Date Deadline</span>
                        </div>
                        <div className="font-semibold text-rose-300">
                          {formatDate(item.deadline_date ?? null)}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500 mb-1 flex items-center gap-1.5">
                          <Timer size={13} className="text-cyan-400/80" />
                          <span>Sisa Waktu</span>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-cyan-500/5 px-2.5 py-0.5 font-bold text-cyan-300 border border-cyan-500/15">
                          {item.deadline_days ? `${item.deadline_days} Hari` : "-"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-800/60 pt-3 text-xs">
                      <div className="text-slate-500 flex items-center gap-1.5">
                        <Activity size={13} className="text-slate-400" />
                        <span>Status</span>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-slate-950 px-2.5 py-0.5 font-medium text-slate-300 border border-slate-800">
                        {item.status_lanjutan ?? item.status ?? "-"}
                      </span>
                    </div>
                  </div>
                ))}

                {!deadlineTable.isLoading && !visibleDeadlineItems.length ? (
                  <div className="py-8 text-center text-slate-400">
                    Tidak ada FO Deadline.
                  </div>
                ) : null}
              </div>
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
              <p>
                {deadlineTable.isFetching
                  ? "Memperbarui data..."
                  : `Halaman ${deadlineTable.data?.page ?? deadlinePage} dari ${
                      deadlineTable.data?.totalPages ?? 1
                    }`}
              </p>
              <div className="flex gap-2">
                <button
                  className="h-9 rounded-lg border border-slate-700 px-3 text-slate-200 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={deadlinePage <= 1 || deadlineLimit === "all"}
                  onClick={() => setDeadlinePage((current) => Math.max(current - 1, 1))}
                >
                  Previous
                </button>
                <button
                  className="h-9 rounded-lg border border-slate-700 px-3 text-slate-200 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    deadlineLimit === "all" ||
                    deadlinePage >= (deadlineTable.data?.totalPages ?? 1)
                  }
                  onClick={() => setDeadlinePage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}

      {isOverdueOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
          <section className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40">
            <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  FO Overdue
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Total {overdueTable.data?.count ?? 0} form order telah melewati deadline.
                </p>
              </div>
              <button
                aria-label="Tutup modal"
                className="rounded-md p-2 text-slate-400 hover:bg-slate-900 hover:text-white"
                onClick={() => setIsOverdueOpen(false)}
              >
                <X size={20} />
              </button>
            </header>

            <div className="overflow-auto flex-1">
              <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 md:flex-row md:items-center">
                <label className="grid gap-2 text-sm md:w-80">
                  <span className="font-medium text-slate-300">Search</span>
                  <input
                    value={overdueSearch}
                    onChange={(event) => {
                      setOverdueSearch(event.target.value);
                      setOverduePage(1);
                    }}
                    placeholder="Cari No FO atau customer"
                    className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-white outline-none focus:border-cyan-400"
                  />
                </label>

                <label className="grid gap-2 text-sm md:w-44 md:ml-auto">
                  <span className="font-medium text-slate-300">Tampilkan</span>
                  <select
                    value={String(overdueLimit)}
                    onChange={(event) => {
                      const nextValue =
                        event.target.value === "all"
                          ? "all"
                          : Number(event.target.value);
                      setOverdueLimit(nextValue);
                      setOverduePage(1);
                    }}
                    className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-white outline-none focus:border-cyan-400"
                  >
                    {pageSizeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "all" ? "Semua data" : `${option} data`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <table className="hidden lg:table w-full min-w-[820px] text-sm">
                <thead className="sticky top-0 bg-slate-900 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">No FO</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Date Deadline</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {overdueTable.isLoading ? (
                    <tr>
                      <td
                        className="px-5 py-8 text-center text-slate-400"
                        colSpan={6}
                      >
                        Memuat data FO Overdue...
                      </td>
                    </tr>
                  ) : null}

                  {visibleOverdueItems.map((item) => (
                    <tr key={item.no_fo} className="hover:bg-slate-900/70">
                      <td className="px-5 py-4 font-medium text-white">
                        {item.no_fo}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {formatDate(item.doc_date)}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {item.customer ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {item.status_lanjutan ?? item.status ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-rose-300 font-semibold">
                        {formatDate(item.deadline_date ?? null)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          aria-label={`Lihat detail ${item.no_fo}`}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-300"
                          onClick={() => setSelectedFo(item)}
                        >
                          <Eye size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!overdueTable.isLoading &&
                  !visibleOverdueItems.length ? (
                    <tr>
                      <td
                        className="px-5 py-8 text-center text-slate-400"
                        colSpan={6}
                      >
                        Tidak ada FO Overdue.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>

              {/* Responsive Cards for Mobile/Tablet (< 1024px) */}
              <div className="block lg:hidden p-4 space-y-3">
                {overdueTable.isLoading ? (
                  <div className="py-8 text-center text-slate-400">
                    Memuat data FO Overdue...
                  </div>
                ) : null}

                {visibleOverdueItems.map((item) => (
                  <div
                    key={item.no_fo}
                    className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/30 p-4 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/60"
                  >
                    {/* Glowing subtle top gradient bar on card hover */}
                    <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-rose-500/0 via-rose-500/40 to-rose-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                          No. Form Order
                        </div>
                        <div className="font-mono text-sm font-bold text-white tracking-wide">
                          {item.no_fo}
                        </div>
                      </div>
                      
                      <button
                        aria-label={`Lihat detail ${item.no_fo}`}
                        className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors shadow-inner"
                        onClick={() => setSelectedFo(item)}
                      >
                        <Eye size={18} />
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-800/60 pt-3 text-xs">
                      <div>
                        <div className="text-slate-500 mb-1 flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          <span>Date Order</span>
                        </div>
                        <div className="font-medium text-slate-300">
                          {formatDate(item.doc_date)}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500 mb-1 flex items-center gap-1.5">
                          <User size={13} className="text-slate-400" />
                          <span>Customer</span>
                        </div>
                        <div className="font-medium text-slate-300 truncate" title={item.customer ?? "-"}>
                          {item.customer ?? "-"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-800/60 pt-3 text-xs">
                      <div className="text-slate-500 flex items-center gap-1.5">
                        <Calendar size={13} className="text-rose-400" />
                        <span>Date Deadline</span>
                      </div>
                      <span className="font-semibold text-rose-300">
                        {formatDate(item.deadline_date ?? null)}
                      </span>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-800/60 pt-3 text-xs">
                      <div className="text-slate-500 flex items-center gap-1.5">
                        <Activity size={13} className="text-slate-400" />
                        <span>Status</span>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-red-500/5 px-2.5 py-0.5 font-medium text-red-400 border border-red-500/10">
                        {item.status_lanjutan ?? item.status ?? "-"}
                      </span>
                    </div>
                  </div>
                ))}

                {!overdueTable.isLoading && !visibleOverdueItems.length ? (
                  <div className="py-8 text-center text-slate-400">
                    Tidak ada FO Overdue.
                  </div>
                ) : null}
              </div>
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
              <p>
                {overdueTable.isFetching
                  ? "Memperbarui data..."
                  : `Halaman ${overdueTable.data?.page ?? overduePage} dari ${
                      overdueTable.data?.totalPages ?? 1
                    }`}
              </p>
              <div className="flex gap-2">
                <button
                  className="h-9 rounded-lg border border-slate-700 px-3 text-slate-200 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={overduePage <= 1 || overdueLimit === "all"}
                  onClick={() => setOverduePage((current) => Math.max(current - 1, 1))}
                >
                  Previous
                </button>
                <button
                  className="h-9 rounded-lg border border-slate-700 px-3 text-slate-200 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    overdueLimit === "all" ||
                    overduePage >= (overdueTable.data?.totalPages ?? 1)
                  }
                  onClick={() => setOverduePage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}

      {isCompleteOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
          <section className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40">
            <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  FO Complete
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Total {completeTable.data?.count ?? 0} form order selesai.
                </p>
              </div>
              <button
                aria-label="Tutup modal"
                className="rounded-md p-2 text-slate-400 hover:bg-slate-900 hover:text-white"
                onClick={() => setIsCompleteOpen(false)}
              >
                <X size={20} />
              </button>
            </header>

            <div className="overflow-auto flex-1">
              <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <label className="grid gap-2 text-sm md:w-80">
                  <span className="font-medium text-slate-300">Search</span>
                  <input
                    value={completeSearch}
                    onChange={(event) => {
                      setCompleteSearch(event.target.value);
                      setCompletePage(1);
                    }}
                    placeholder="Cari No FO atau customer"
                    className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-white outline-none focus:border-cyan-400"
                  />
                </label>

                <label className="grid gap-2 text-sm md:w-44">
                  <span className="font-medium text-slate-300">Tampilkan</span>
                  <select
                    value={String(completeLimit)}
                    onChange={(event) => {
                      const nextValue =
                        event.target.value === "all"
                          ? "all"
                          : Number(event.target.value);
                      setCompleteLimit(nextValue);
                      setCompletePage(1);
                    }}
                    className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-white outline-none focus:border-cyan-400"
                  >
                    {pageSizeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "all" ? "Semua data" : `${option} data`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <table className="hidden lg:table w-full min-w-[820px] text-sm">
                <thead className="sticky top-0 bg-slate-900 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">No FO</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {completeTable.isLoading ? (
                    <tr>
                      <td
                        className="px-5 py-8 text-center text-slate-400"
                        colSpan={5}
                      >
                        Memuat data FO Complete...
                      </td>
                    </tr>
                  ) : null}

                  {visibleCompleteItems.map((item) => (
                    <tr key={item.no_fo} className="hover:bg-slate-900/70">
                      <td className="px-5 py-4 font-medium text-white">
                        {item.no_fo}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {formatDate(item.doc_date)}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {item.customer ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {item.status_lanjutan ?? item.status ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          aria-label={`Lihat detail ${item.no_fo}`}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-300"
                          onClick={() => setSelectedFo(item)}
                        >
                          <Eye size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!completeTable.isLoading &&
                  !visibleCompleteItems.length ? (
                    <tr>
                      <td
                        className="px-5 py-8 text-center text-slate-400"
                        colSpan={5}
                      >
                        Tidak ada FO Complete.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>

              {/* Responsive Cards for Mobile/Tablet (< 1024px) */}
              <div className="block lg:hidden p-4 space-y-3">
                {completeTable.isLoading ? (
                  <div className="py-8 text-center text-slate-400">
                    Memuat data FO Complete...
                  </div>
                ) : null}

                {visibleCompleteItems.map((item) => (
                  <div
                    key={item.no_fo}
                    className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/30 p-4 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/60"
                  >
                    {/* Glowing subtle top gradient bar on card hover */}
                    <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                          No. Form Order
                        </div>
                        <div className="font-mono text-sm font-bold text-white tracking-wide">
                          {item.no_fo}
                        </div>
                      </div>
                      
                      <button
                        aria-label={`Lihat detail ${item.no_fo}`}
                        className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors shadow-inner"
                        onClick={() => setSelectedFo(item)}
                      >
                        <Eye size={18} />
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-800/60 pt-3 text-xs">
                      <div>
                        <div className="text-slate-500 mb-1 flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          <span>Date</span>
                        </div>
                        <div className="font-medium text-slate-300">
                          {formatDate(item.doc_date)}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500 mb-1 flex items-center gap-1.5">
                          <User size={13} className="text-slate-400" />
                          <span>Customer</span>
                        </div>
                        <div className="font-medium text-slate-300 truncate" title={item.customer ?? "-"}>
                          {item.customer ?? "-"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-slate-800/60 pt-3 text-xs">
                      <div className="text-slate-500 flex items-center gap-1.5">
                        <Activity size={13} className="text-slate-400" />
                        <span>Status</span>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-emerald-500/5 px-2.5 py-0.5 font-medium text-emerald-400 border border-emerald-500/10">
                        {item.status_lanjutan ?? item.status ?? "-"}
                      </span>
                    </div>
                  </div>
                ))}

                {!completeTable.isLoading && !visibleCompleteItems.length ? (
                  <div className="py-8 text-center text-slate-400">
                    Tidak ada FO Complete.
                  </div>
                ) : null}
              </div>
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
              <p>
                {completeTable.isFetching
                  ? "Memperbarui data..."
                  : `Halaman ${completeTable.data?.page ?? completePage} dari ${
                      completeTable.data?.totalPages ?? 1
                    }`}
              </p>
              <div className="flex gap-2">
                <button
                  className="h-9 rounded-lg border border-slate-700 px-3 text-slate-200 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={completePage <= 1 || completeLimit === "all"}
                  onClick={() => setCompletePage((current) => Math.max(current - 1, 1))}
                >
                  Previous
                </button>
                <button
                  className="h-9 rounded-lg border border-slate-700 px-3 text-slate-200 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    completeLimit === "all" ||
                    completePage >= (completeTable.data?.totalPages ?? 1)
                  }
                  onClick={() => setCompletePage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}

      {selectedFo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <section className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900/90 shadow-2xl relative overflow-hidden backdrop-blur-md flex flex-col max-h-[90vh] md:max-h-[85vh]">
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
                          <span className="mt-1 block text-sm font-bold text-emerald-400">
                            {data.qty_order ?? 0} Pcs
                          </span>
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
                              {formatDate(data.order_date)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Deposit Date</span>
                            <span className="mt-0.5 block text-xs text-slate-300">
                              {formatDate(data.deposit_date)}
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
                      <RemainingDeadlineWidget
                        posDate={data.pos_date}
                        deadlineDate={data.deadline_date}
                        qcReadyGudang={data.QC_ReadyGudang}
                      />

                      {/* Status Working / Workflow Stepper */}
                      <div className="rounded-lg bg-slate-950/50 border border-slate-800/40 p-4 space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
                          <Activity size={14} className="text-cyan-400 animate-pulse" />
                          Status Alur Kerja (Working Status)
                        </h3>

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
                                    {data.pos_date ? `Tanggal POS: ${formatIndonesianDate(data.pos_date)}` : "Belum mulai"}
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
                                    {data.Desain_Ready ? `Tanggal Ready: ${formatIndonesianDate(data.Desain_Ready)}` : isOngoing ? "Proses pembuatan desain" : "Menunggu Order Success"}
                                  </p>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Step 3: Layout Step */}
                          {(() => {
                            const isCompleted = !!data.Layout_Ready;
                            const isOngoing = !isCompleted && !!data.Desain_Ready;
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
                                      ? `Tanggal Ready: ${formatIndonesianDate(data.Layout_Ready)}` 
                                      : isOngoing 
                                        ? (data.Start_Layout 
                                          ? `Mulai Layout: ${formatIndonesianDate(data.Start_Layout)}` 
                                          : "Proses layouting") 
                                        : "Menunggu Design Ready"
                                    }
                                  </p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Informasi Pembayaran & Keuangan */}
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
                              (data.sisa_tagihan ?? 0) > 0 ? "text-amber-400" : "text-emerald-400"
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
                                Tgl: {formatDate(data.tgl_um)}
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
                                Tgl: {formatDate(data.tgl_pelunasan)}
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
                    </div>
                  );
                })()
              ) : null}
            </div>

            <footer className="p-6 pt-4 border-t border-slate-800 flex justify-end flex-shrink-0">
              <button
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                onClick={() => setSelectedFo(null)}
              >
                Tutup
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
