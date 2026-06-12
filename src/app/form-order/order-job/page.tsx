"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  ShieldAlert,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { FoDetailData, FoOutstandingRow, FoListRow } from "@/lib/types";

const pipelineCards = [
  {
    title: "FO Job",
    description: "Form order yang masih menunggu tindak lanjut.",
    icon: ClipboardList,
    tone: "text-amber-200",
    type: "outstanding",
  },
  {
    title: "Deadline",
    description: "Order aktif yang perlu dipantau berdasarkan tanggal deadline.",
    icon: Timer,
    tone: "text-cyan-200",
    type: "deadline",
  },
  {
    title: "Overdue",
    description: "Order aktif yang telah melewati batas deadline pengerjaan.",
    icon: AlertTriangle,
    tone: "text-rose-300",
    type: "overdue",
  },
  {
    title: "Job Complete",
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

function toLocalISOString(date: Date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
}

function parsePreviousDate(input: string | Date | null | undefined): Date {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  const normalized = input.replace(" ", "T");
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return new Date();
  return d;
}

function formatIndonesianDateTime(input: string | Date | null) {
  if (!input) {
    return "-";
  }

  let dateStr = "";
  if (input instanceof Date) {
    dateStr = input.toISOString();
  } else {
    dateStr = String(input);
  }

  // Normalize separator
  dateStr = dateStr.replace("T", " ");

  // Expected formats: "2026-05-12 16:52:00" or "2026-05-12 16:52:00.000000"
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

function formatIndonesianDate(input: string | Date | null) {
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

function formatRupiah(value: number | string | null) {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num)) return "-";
  return "Rp. " + num.toLocaleString("id-ID");
}

function renderPaymentStatus(dpValue: number | string | null | undefined, remainingValue: number | string | null | undefined) {
  const dp = dpValue !== null && dpValue !== undefined && dpValue !== "" ? Number(dpValue) : 0;
  const remaining = remainingValue !== null && remainingValue !== undefined && remainingValue !== "" ? Number(remainingValue) : 0;

  if (dp === 0) {
    return (
      <span className="ml-2 inline-flex items-center rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400 border border-red-500/20">
        Belum Bayar
      </span>
    );
  }
  if (remaining === 0) {
    return (
      <span className="ml-2 inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
        Lunas
      </span>
    );
  }
  if (dp !== remaining && dp > 0 && remaining > 0) {
    return (
      <span className="ml-2 inline-flex items-center rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">
        Belum Lunas
      </span>
    );
  }
  return null;
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

export default function OrderJobPage() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setSession(getSession());
    });
  }, []);

  // Fetch live permissions for the logged-in user
  const { data: userPerms, isLoading: isLoadingPerms } = useQuery({
    queryKey: ["my-job-privilege", session?.id],
    queryFn: () => api.getPermissions(session?.id),
    enabled: !!session?.id,
  });

  const [isOutstandingOpen, setIsOutstandingOpen] = useState(false);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const [isOverdueOpen, setIsOverdueOpen] = useState(false);
  const [selectedFo, setSelectedFo] = useState<FoOutstandingRow | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFo, setEditFo] = useState<{ no_fo: string; customer: string; qty_order?: number } | null>(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [selectedPegawai, setSelectedPegawai] = useState("NN");
  const [namaPenerima, setNamaPenerima] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [dateNextJob, setDateNextJob] = useState("");
  const [isTimeEdited, setIsTimeEdited] = useState(false);

  useEffect(() => {
    if (!isEditModalOpen) {
      setModalError("");
      setModalSuccess("");
      setSelectedPegawai("NN");
      setNamaPenerima("");
      setKeterangan("");
      setDateNextJob("");
      setIsTimeEdited(false);
    } else if (session?.name) {
      const nameUpper = session.name.trim().toUpperCase();
      const validNames = [
        "ALDO", "BEN", "JIHAN", "FINA", "FANI", "EGY", "IVAN", "IZAMI", "IKHA", 
        "NOVAN", "NATRIS", "NASRIL", "PUSPA", "RISKY", "REINA", "SAFA", "SAID", 
        "SYAHNI", "YOHAND", "KARIM-PENJAHIT", "ADI-PENJAHIT", "SANDY-PENJAHIT", 
        "ALIF-PENJAHIT", "DIDIN-PENJAHIT"
      ];
      if (validNames.includes(nameUpper)) {
        setSelectedPegawai(nameUpper);
      } else {
        setSelectedPegawai("NN");
      }
    }
  }, [isEditModalOpen, session]);

  const handleUpdateJob = async (nextJobVal?: string) => {
    if (!editFo?.no_fo || !session?.username) return;
    if (nextJobVal === "Produk diterima Customer" && !namaPenerima.trim()) {
      setModalError("Nama Penerima wajib diisi.");
      return;
    }
    setIsUpdating(true);
    setModalError("");
    setModalSuccess("");
    try {
      const res = await api.updateJob({
        no_fo: editFo.no_fo,
        username: session.username,
        nama_pegawai: selectedPegawai,
        nama_penerima: nextJobVal === "Produk diterima Customer" ? namaPenerima : undefined,
        keterangan: keterangan.trim() || undefined,
        datetime_lanjutan: dateNextJob || undefined,
      });
      setModalSuccess(res.message || "Pekerjaan berhasil diperbarui!");
      showToast(res.message || "Pekerjaan berhasil diperbarui!", "success");
      queryClient.invalidateQueries();
      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditFo(null);
      }, 1500);
    } catch (err: any) {
      const errMsg = err.message || "Gagal memperbarui pekerjaan.";
      setModalError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Queries for Edit Modal
  const editFoDetailQuery = useQuery({
    queryKey: ["edit-fo-detail", editFo?.no_fo],
    queryFn: () => api.getFoDetail(editFo!.no_fo),
    enabled: isEditModalOpen && !!editFo?.no_fo,
  });

  const editFoDetailsQuery = useQuery({
    queryKey: ["edit-fo-details", editFo?.no_fo],
    queryFn: () => api.getFoDetailItems({ no_fo: editFo!.no_fo, limit: "all" }),
    enabled: isEditModalOpen && !!editFo?.no_fo,
  });

  useEffect(() => {
    if (isEditModalOpen && editFoDetailQuery.data) {
      const now = new Date();
      setDateNextJob(toLocalISOString(now));
      setIsTimeEdited(false);
    }
  }, [isEditModalOpen, editFoDetailQuery.data]);

  useEffect(() => {
    if (!isEditModalOpen || isTimeEdited) return;

    const interval = setInterval(() => {
      setDateNextJob((prev) => {
        if (!prev) return prev;
        const now = new Date();
        const datePart = prev.split("T")[0];
        const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        return `${datePart}T${currentHourMin}`;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isEditModalOpen, isTimeEdited]);

  const [activeTab, setActiveTab] = useState<"summary" | "detail" | "job">("summary");
  const [detailSearch, setDetailSearch] = useState("");
  const [detailLimit, setDetailLimit] = useState<number | "all">(5);
  const [detailPage, setDetailPage] = useState(1);

  // Check live access for "Order Job" V permission
  const hasAccess = (() => {
    if (!session) return false;
    // Admins are superusers and always bypass view limitations
    if (session.role.toLowerCase() === "admin") return true;

    if (!userPerms?.permissions) {
      return true; // Default fallback if no custom privilege JSON exists
    }
    return !!userPerms.permissions["Order Job"]?.V;
  })();

  const usernameFilter = session?.role?.toLowerCase() !== "admin" ? session?.username : undefined;

  const [jobSearch, setJobSearch] = useState("");
  const [jobLimit, setJobLimit] = useState<number | "all">(5);
  const [jobPage, setJobPage] = useState(1);

  const [showDetailFilters, setShowDetailFilters] = useState(false);
  const [showJobFilters, setShowJobFilters] = useState(false);

  useEffect(() => {
    if (selectedFo) {
      setActiveTab("summary");
      setDetailSearch("");
      setDetailLimit(5);
      setDetailPage(1);
      setJobSearch("");
      setJobLimit(5);
      setJobPage(1);
      setShowDetailFilters(false);
      setShowJobFilters(false);
    }
  }, [selectedFo]);

  // States for Outstanding Modal
  const [outstandingPage, setOutstandingPage] = useState(1);
  const [outstandingLimit, setOutstandingLimit] = useState<number | "all">(5);
  const [outstandingSearch, setOutstandingSearch] = useState("");
  const [outstandingStatusCategory, setOutstandingStatusCategory] = useState<number>(0);

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
  const [completeFilterType, setCompleteFilterType] = useState<string>("today");
  const [completeStartDate, setCompleteStartDate] = useState<string>("");
  const [completeEndDate, setCompleteEndDate] = useState<string>("");

  // States for general FO List
  const [foListPage, setFoListPage] = useState(1);
  const [foListLimit, setFoListLimit] = useState<number | "all">(5);
  const [foListSearch, setFoListSearch] = useState("");
  const [foListSearchBy, setFoListSearchBy] = useState<string>("no_fo");
  const [foListStatusCategory, setFoListStatusCategory] = useState<number>(0);

  useEffect(() => {
    if (session) {
      const role = session.role?.toLowerCase();
      if (role === "tukang-desain") {
        setFoListStatusCategory(6);
      } else if (role === "tukang-layout") {
        setFoListStatusCategory(0);
      } else if (role === "pengawas") {
        setFoListStatusCategory(0);
      } else if (role === "tukang-print") {
        setFoListStatusCategory(0);
      } else if (role === "tukang-press" || role === "tukang-pressdtf") {
        setFoListStatusCategory(0);
      } else if (role === "tukang-cutting") {
        setFoListStatusCategory(0);
      } else if (role === "tukang-qc") {
        setFoListStatusCategory(0);
      } else if (role === "tukang-layanics") {
        setFoListStatusCategory(21);
      } else {
        setFoListStatusCategory(0);
      }
    }
  }, [session]);

  const outstandingSummary = useQuery({
    queryKey: ["fo-outstanding-summary", usernameFilter],
    queryFn: () => api.getFoOutstanding({ page: 1, limit: 5, username: usernameFilter }),
  });

  const deadlineSummary = useQuery({
    queryKey: ["fo-deadline-summary", usernameFilter],
    queryFn: () => api.getFoDeadlineSummary({ page: 1, limit: 5, username: usernameFilter }),
  });

  const overdueSummary = useQuery({
    queryKey: ["fo-overdue-summary", usernameFilter],
    queryFn: () => api.getFoOverdue({ page: 1, limit: 5, username: usernameFilter }),
  });

  const completeSummary = useQuery({
    queryKey: ["fo-complete-summary", completeFilterType, completeStartDate, completeEndDate, usernameFilter],
    queryFn: () => api.getFoComplete({ page: 1, limit: 5, filter_type: completeFilterType, start_date: completeStartDate, end_date: completeEndDate, username: usernameFilter }),
  });

  const outstandingTable = useQuery({
    queryKey: ["fo-outstanding", outstandingPage, outstandingLimit, outstandingSearch, outstandingStatusCategory, usernameFilter],
    queryFn: () =>
      api.getFoOutstanding({
        page: outstandingPage,
        limit: outstandingLimit,
        search: outstandingSearch,
        username: usernameFilter,
        status_category: outstandingStatusCategory,
      }),
    enabled: isOutstandingOpen,
  });

  const deadlineTable = useQuery({
    queryKey: ["fo-deadline", deadlinePage, deadlineLimit, deadlineSearch, deadlineType, usernameFilter],
    queryFn: () =>
      api.getFoDeadlineSummary({
        page: deadlinePage,
        limit: deadlineLimit,
        search: deadlineSearch,
        deadline_type: deadlineType,
        username: usernameFilter,
      }),
    enabled: isDeadlineOpen,
  });

  const overdueTable = useQuery({
    queryKey: ["fo-overdue", overduePage, overdueLimit, overdueSearch, usernameFilter],
    queryFn: () =>
      api.getFoOverdue({
        page: overduePage,
        limit: overdueLimit,
        search: overdueSearch,
        username: usernameFilter,
      }),
    enabled: isOverdueOpen,
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
    if (selectedFo?.no_fo) {
      queryClient.resetQueries({ queryKey: ["fo-detail", selectedFo.no_fo] });
      queryClient.resetQueries({ queryKey: ["fo-detail-items", selectedFo.no_fo] });
      queryClient.resetQueries({ queryKey: ["fo-job-details", selectedFo.no_fo] });
    }
  }, [selectedFo?.no_fo, queryClient]);

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
    queryKey: ["fo-complete", completePage, completeLimit, completeSearch, completeFilterType, completeStartDate, completeEndDate, usernameFilter],
    queryFn: () =>
      api.getFoComplete({
        page: completePage,
        limit: completeLimit,
        search: completeSearch,
        filter_type: completeFilterType,
        start_date: completeStartDate,
        end_date: completeEndDate,
        username: usernameFilter,
      }),
    enabled: isCompleteOpen,
  });

  const visibleCompleteItems = (completeTable.data?.items ?? []).filter(
    (item, index, rows) =>
      matchesSearch(item, completeSearch) &&
      rows.findIndex((row) => row.no_fo === item.no_fo) === index,
  );

  const foListTable = useQuery({
    queryKey: ["fo-list", foListPage, foListLimit, foListSearch, foListSearchBy, foListStatusCategory, usernameFilter],
    queryFn: () =>
      api.getFoList({
        page: foListPage,
        limit: foListLimit,
        search: foListSearch,
        search_by: foListSearchBy,
        status_category: foListStatusCategory,
        username: usernameFilter,
      }),
  });

  if (isLoadingPerms) {
    return (
      <div className="flex items-center justify-center p-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (userPerms?.permissions && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/10 backdrop-blur-md max-w-2xl mx-auto my-12 shadow-xl shadow-slate-950/20">
        <ShieldAlert size={48} className="text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-base font-bold text-white mb-2">Access Denied (403)</h2>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          Anda tidak memiliki hak akses (View Privilege) untuk menu **Order Job**. Hubungi administrator utama Anda untuk meminta izin otorisasi.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Order Job"
        description="Kelola alur FO dari outstanding, deadline, sampai complete dalam sub menu order job."
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
              <div
                key={card.title}
                className="rounded-lg border border-slate-800 bg-slate-900/70 p-5 text-left shadow-sm shadow-slate-950/20 hover:border-cyan-400/30 hover:bg-slate-900/90 relative group flex flex-col justify-between min-h-[190px] transition-all duration-300"
              >
                {/* Header & Icon */}
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`flex size-11 items-center justify-center rounded-lg bg-slate-950 ${card.tone}`}
                  >
                    <Icon size={22} />
                  </div>
                  <button
                    onClick={() => setIsCompleteOpen(true)}
                    className="flex size-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/30 transition shadow-inner"
                    title="Lihat Detail Modal"
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>

                {/* Filter Selector */}
                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={completeFilterType}
                    onChange={(e) => {
                      setCompleteFilterType(e.target.value);
                      if (e.target.value !== "date_range") {
                        setCompleteStartDate("");
                        setCompleteEndDate("");
                      }
                      setCompletePage(1);
                    }}
                    className="w-32 h-7 rounded-md border border-slate-800 bg-slate-950 px-1.5 text-[11px] text-slate-300 outline-none focus:border-cyan-500/40 transition"
                  >
                    <option value="today">Hari Ini</option>
                    <option value="this_week">Minggu Ini</option>
                    <option value="this_month">Bulan Ini</option>
                    <option value="this_year">Tahun Ini</option>
                    <option value="date_range">Range Tanggal</option>
                    <option value="all">Semua Data</option>
                  </select>

                  {completeFilterType === "date_range" && (
                    <div className="mt-2 flex gap-1 items-center max-w-[200px]">
                      <input
                        type="date"
                        value={completeStartDate}
                        onChange={(e) => {
                          setCompleteStartDate(e.target.value);
                          setCompletePage(1);
                        }}
                        className="w-24 h-6 rounded-md border border-slate-800 bg-slate-950 px-1 text-[9px] text-slate-300 outline-none focus:border-cyan-500/40"
                      />
                      <span className="text-[9px] text-slate-500">to</span>
                      <input
                        type="date"
                        value={completeEndDate}
                        onChange={(e) => {
                          setCompleteEndDate(e.target.value);
                          setCompletePage(1);
                        }}
                        className="w-24 h-6 rounded-md border border-slate-800 bg-slate-950 px-1 text-[9px] text-slate-300 outline-none focus:border-cyan-500/40"
                      />
                    </div>
                  )}
                </div>

                {/* Count & Title */}
                <div 
                  className="mt-4 flex items-end justify-between gap-4 cursor-pointer pt-3 border-t border-slate-800/40" 
                  onClick={() => setIsCompleteOpen(true)}
                >
                  <h2 className="text-lg font-semibold text-white">
                    {card.title}
                  </h2>
                  <span className="text-3xl font-bold text-emerald-400 font-mono tracking-tight leading-none">
                    {completeSummary.isLoading
                      ? "-"
                      : completeSummary.data?.count ?? 0}
                  </span>
                </div>
              </div>
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

      {/* General FO List Table Section */}
      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl shadow-slate-950/20">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ClipboardList className="text-cyan-400 size-5" />
              Daftar Form Order (FO)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Daftar lengkap seluruh Form Order (FO) dari database dengan penyaringan dinamis.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Kategori Status filter dropdown */}
            {(session?.role?.toLowerCase() === "admin" ||
              session?.role?.toLowerCase() === "tukang-qc" ||
              session?.role?.toLowerCase() === "pengawas" ||
              session?.role?.toLowerCase() === "tukang-layout" ||
              session?.role?.toLowerCase() === "tukang-print" ||
              session?.role?.toLowerCase() === "tukang-press" ||
              session?.role?.toLowerCase() === "tukang-pressdtf" ||
              session?.role?.toLowerCase() === "tukang-cutting" ||
              session?.role?.toLowerCase() === "tukang-layanics") && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">Status:</span>
                <select
                  value={foListStatusCategory}
                  onChange={(e) => {
                    setFoListStatusCategory(Number(e.target.value));
                    setFoListPage(1);
                  }}
                  className="h-9 max-w-[200px] rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400 truncate"
                >
                  {(() => {
                    const role = session?.role?.toLowerCase();
                    if (role === "tukang-cutting") {
                      return (
                        <>
                          <option value={0}>Semua Data (Ready Cutting, Start Cutting)</option>
                          <option value={14}>Ready Cutting</option>
                          <option value={15}>Start Cutting</option>
                        </>
                      );
                    }
                    if (role === "tukang-pressdtf") {
                      return (
                        <>
                          <option value={0}>Semua Data</option>
                          <option value={12}>Siap Press</option>
                          <option value={13}>Proses Press</option>
                        </>
                      );
                    }
                    if (role === "tukang-press") {
                      return (
                        <>
                          <option value={0}>Semua Data (Ready to Press, Proses Press)</option>
                          <option value={12}>Ready to Press</option>
                          <option value={13}>Proses Press</option>
                        </>
                      );
                    }
                    if (role === "tukang-print") {
                      return (
                        <>
                          <option value={0}>Semua Data (Layout Ready, Start Print)</option>
                          <option value={9}>Layout Ready</option>
                          <option value={11}>Start Print</option>
                        </>
                      );
                    }
                    if (role === "tukang-layout") {
                      return (
                        <>
                          <option value={0}>Semua Data (Desain Ready, Start Layout)</option>
                          <option value={7}>Desain Ready</option>
                          <option value={8}>Start Layout</option>
                        </>
                      );
                    }
                    if (role === "tukang-qc") {
                      return (
                        <>
                          <option value={0}>Semua Data (Jahit, QC, Packing)</option>
                          <option value={16}>Ready Jahit</option>
                          <option value={17}>Proses Jahit</option>
                          <option value={18}>Ready QC</option>
                          <option value={19}>Start QC</option>
                          <option value={20}>Ready Packing</option>
                        </>
                      );
                    }
                    if (role === "pengawas") {
                      return (
                        <>
                          <option value={0}>Semua Data (Print Ready, Cutting Ready, Persiapan Kain, Proses Printing)</option>
                          <option value={9}>Layout Print Ready</option>
                          <option value={14}>Kain Ready Cutting</option>
                          <option value={10}>Persiapan Kain</option>
                          <option value={11}>Proses Printing</option>
                        </>
                      );
                    }
                    if (role === "tukang-layanics") {
                      return (
                        <>
                          <option value={21}>Packing Selesai</option>
                          <option value={22}>Final Cust</option>
                        </>
                      );
                    }
                    return (
                      <>
                        <option value={0}>FO ALL</option>
                        <option value={1}>FO DP - Antrian</option>
                        <option value={2}>FO DP + Non DP Antrian</option>
                        <option value={3}>FO Belum DP</option>
                        <option value={4}>DP - Belum KLaim</option>
                        <option value={5}>Belum KLaim - FinalQC</option>
                        <option value={6}>Proses Desain</option>
                        <option value={7}>Desain Ready</option>
                        <option value={8}>Proses Susun Layout</option>
                        <option value={9}>Layout Print Ready</option>
                        <option value={10}>Proses Persiapan Bahan Kain</option>
                        <option value={11}>Proses Printing</option>
                        <option value={12}>Ready to Press</option>
                        <option value={13}>Proses Press</option>
                        <option value={14}>Kain Ready Cutting</option>
                        <option value={15}>Proses Cutting</option>
                        <option value={16}>Ready Jahit</option>
                        <option value={17}>Proses Jahit</option>
                        <option value={18}>Ready QC</option>
                        <option value={19}>Proses QC</option>
                        <option value={20}>Ready Packing</option>
                        <option value={21}>Packing Selesai</option>
                        <option value={22}>Final Cust</option>
                      </>
                    );
                  })()}
                </select>
              </div>
            )}

            {/* Search filter dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Cari:</span>
              <select
                value={foListSearchBy}
                onChange={(e) => {
                  setFoListSearchBy(e.target.value);
                  setFoListSearch("");
                  setFoListPage(1);
                }}
                className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400"
              >
                <option value="no_fo">Nomor Order</option>
                <option value="customer">Customer</option>
                <option value="post_date">Post Date</option>
                <option value="deadline_date">Deadline Date</option>
              </select>
            </div>

            {/* Search Input supporting search filter */}
            <input
              type="text"
              value={foListSearch}
              onChange={(e) => {
                setFoListSearch(e.target.value);
                setFoListPage(1);
              }}
              placeholder={
                foListSearchBy === "post_date" || foListSearchBy === "deadline_date"
                  ? "Format wajib: yyyy-mm-dd"
                  : "Cari data..."
              }
              className="h-9 w-60 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
            />

            {/* Page Size Select */}
            <div className="flex items-center gap-2">
              <select
                value={String(foListLimit)}
                onChange={(e) => {
                  const nextValue = e.target.value === "all" ? "all" : Number(e.target.value);
                  setFoListLimit(nextValue);
                  setFoListPage(1);
                }}
                className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400"
              >
                {[5, 10, 25, 50, 100].map((option) => (
                  <option key={option} value={option}>
                    {option} data
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Table representation for Desktop screens */}
        <div className="hidden lg:block overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-950/40">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">No FO</th>
                <th className="px-5 py-3.5">Order Date</th>
                <th className="px-5 py-3.5">Deadline</th>
                <th className="px-5 py-3.5">Update</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Qty</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {foListTable.isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-xs text-slate-400 italic">
                    Memuat daftar Form Order...
                  </td>
                </tr>
              ) : null}

              {!foListTable.isLoading && !foListTable.data?.items?.length ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-xs text-slate-400 italic">
                    Tidak ada Form Order yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : null}

              {foListTable.data?.items?.map((item: FoListRow) => (
                <tr 
                  key={item.no_fo} 
                  className={`transition-colors border-b border-slate-800/60 ${
                    getDeadlineStyle(item.deadline_date, item.status_lanjutan) || "hover:bg-slate-900/30 text-slate-300"
                  }`}
                >
                  <td className="px-5 py-4 font-mono font-bold text-white tracking-wide">
                    {item.no_fo}
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    {formatIndonesianDate(item.order_date)}
                  </td>
                  <td className="px-5 py-4 text-rose-300 font-medium">
                    {formatIndonesianDate(item.deadline_date)}
                  </td>
                  <td className="px-5 py-4 text-slate-400 text-xs font-mono">
                    {formatIndonesianDateTime(item.datetime_lanjutan)}
                  </td>
                  <td className="px-5 py-4 text-slate-300 font-medium" title={item.customer ?? ""}>
                    {item.customer ?? "-"}
                    {renderPaymentStatus(item.uang_muka, item.sisa_tagihan)}
                  </td>
                  <td className="px-5 py-4 text-slate-300 font-mono font-semibold">
                    {item.qty_order ?? "-"}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                      item.status_lanjutan === "Produk diterima Customer"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : item.status_lanjutan === "Selesai Packing, Siap diAmbil"
                        ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    }`}>
                      {item.status_lanjutan ?? "-"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                       <button
                         aria-label={`Update order ${item.no_fo}`}
                         className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300 transition-colors shadow-inner mr-1.5"
                         onClick={() => {
                           setEditFo({
                             no_fo: item.no_fo,
                             customer: item.customer ?? "",
                             qty_order: Number(item.qty_order) || 0,
                           });
                           setIsEditModalOpen(true);
                         }}
                       >
                         <Pencil size={14} />
                       </button>
                       <button
                         aria-label={`Lihat detail ${item.no_fo}`}
                         className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors shadow-inner"
                         onClick={() => setSelectedFo(item as any)}
                       >
                         <Eye size={15} />
                       </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* List view for Mobile & Tablet screens */}
        <div className="lg:hidden space-y-3.5">
          {foListTable.isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-400 italic text-xs border border-slate-800 bg-slate-950/20 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
              <span>Memuat daftar Form Order...</span>
            </div>
          ) : null}

          {!foListTable.isLoading && !foListTable.data?.items?.length ? (
            <div className="text-center text-xs text-slate-400 italic py-12 border border-slate-800 bg-slate-950/20 rounded-lg">
              Tidak ada Form Order yang cocok dengan kriteria pencarian.
            </div>
          ) : null}

          {foListTable.data?.items?.map((item: FoListRow) => (
            <div 
              key={item.no_fo} 
              className={`rounded-lg border p-4 space-y-3 shadow-md transition-colors ${
                getDeadlineStyle(item.deadline_date, item.status_lanjutan) || "border-slate-800/80 bg-slate-950/30 hover:border-slate-700/60 text-slate-300"
              }`}
            >
              <div className="flex justify-between items-start gap-3">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">No FO</span>
                  <span className="text-xs font-mono font-bold text-white tracking-wide block mt-0.5">{item.no_fo}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                    item.status_lanjutan === "Produk diterima Customer"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : item.status_lanjutan === "Selesai Packing, Siap diAmbil"
                      ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  }`}>
                    {item.status_lanjutan ?? "-"}
                  </span>
                     <button
                       aria-label={`Update order ${item.no_fo}`}
                       className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300 transition-colors shadow-inner mr-1.5"
                       onClick={() => {
                         setEditFo({
                           no_fo: item.no_fo,
                           customer: item.customer ?? "",
                           qty_order: Number(item.qty_order) || 0,
                         });
                         setIsEditModalOpen(true);
                       }}
                     >
                       <Pencil size={13} />
                     </button>
                     <button
                       aria-label={`Lihat detail ${item.no_fo}`}
                       className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors shadow-inner"
                       onClick={() => setSelectedFo(item as any)}
                     >
                       <Eye size={14} />
                     </button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Customer</span>
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className="text-xs text-slate-200 font-semibold leading-relaxed block break-words" title={item.customer ?? ""}>
                    {item.customer ?? "-"}
                  </span>
                  {renderPaymentStatus(item.uang_muka, item.sisa_tagihan)}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2.5 border-t border-slate-800/40">
                <div>
                  <span className="block text-[9px] uppercase font-semibold text-slate-500">Order Date</span>
                  <span className="text-[11px] text-slate-300 block mt-0.5 leading-relaxed">{formatIndonesianDate(item.order_date)}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-semibold text-slate-500">Deadline</span>
                  <span className="text-[11px] text-rose-300 font-medium block mt-0.5 leading-relaxed">{formatIndonesianDate(item.deadline_date)}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-semibold text-slate-500">Qty Order</span>
                  <span className="text-[11px] text-slate-300 font-mono font-bold block mt-0.5 leading-relaxed">{item.qty_order ?? "-"} Pcs</span>
                </div>
              </div>

              {item.datetime_lanjutan && (
                <div className="pt-2 border-t border-slate-800/40 flex justify-between items-center text-[10px] text-slate-500">
                  <span>Last Update:</span>
                  <span className="font-mono">{formatIndonesianDateTime(item.datetime_lanjutan)}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Paginator footer */}
        <footer className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400">
          <p>
            {foListTable.isFetching
              ? "Memperbarui data..."
              : `Menampilkan ${foListTable.data?.items?.length ?? 0} dari total ${foListTable.data?.count ?? 0} data. Halaman ${foListTable.data?.page ?? foListPage} dari ${foListTable.data?.totalPages ?? 1}`}
          </p>
          <div className="flex gap-2">
            <button
              className="h-8 rounded-lg border border-slate-800 bg-slate-900 px-3 text-slate-300 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              disabled={foListPage <= 1 || foListLimit === "all"}
              onClick={() => setFoListPage((curr) => Math.max(curr - 1, 1))}
            >
              Previous
            </button>
            <button
              className="h-8 rounded-lg border border-slate-800 bg-slate-900 px-3 text-slate-300 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              disabled={foListLimit === "all" || foListPage >= (foListTable.data?.totalPages ?? 1)}
              onClick={() => setFoListPage((curr) => curr + 1)}
            >
              Next
            </button>
          </div>
        </footer>
      </section>

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

                {session?.role?.toLowerCase() === "tukang-pressdtf" && (
                  <label className="grid gap-2 text-sm md:w-56">
                    <span className="font-medium text-slate-300">Status</span>
                    <select
                      value={outstandingStatusCategory}
                      onChange={(event) => {
                        setOutstandingStatusCategory(Number(event.target.value));
                        setOutstandingPage(1);
                      }}
                      className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-white outline-none focus:border-cyan-400"
                    >
                      <option value={0}>Semua Data</option>
                      <option value={12}>Siap Press</option>
                      <option value={13}>Proses Press</option>
                    </select>
                  </label>
                )}

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
                        {renderPaymentStatus(item.uang_muka, item.sisa_tagihan)}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {item.status_lanjutan ?? item.status ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          aria-label={`Update order ${item.no_fo}`}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300 transition-colors shadow-inner mr-1.5"
                          onClick={() => {
                            setEditFo({
                              no_fo: item.no_fo,
                              customer: item.customer ?? "",
                              qty_order: Number((item as any).qty_order) || 0,
                            });
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Pencil size={15} />
                        </button>
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
                      
                      <div className="flex gap-2 items-center">
                        <button
                          aria-label={`Update order ${item.no_fo}`}
                          className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300 transition-colors shadow-inner"
                          onClick={() => {
                            setEditFo({
                              no_fo: item.no_fo,
                              customer: item.customer ?? "",
                              qty_order: Number((item as any).qty_order) || 0,
                            });
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                        aria-label={`Lihat detail ${item.no_fo}`}
                        className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors shadow-inner"
                        onClick={() => setSelectedFo(item)}
                      >
                        <Eye size={18} />
                      </button>
                      </div>
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
                        <div className="font-medium text-slate-300 flex flex-wrap gap-1 items-center" title={item.customer ?? "-"}>
                          <span>{item.customer ?? "-"}</span>
                          {renderPaymentStatus(item.uang_muka, item.sisa_tagihan)}
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
                    <th className="px-5 py-3 font-medium">Deadline</th>
                    <th className="px-5 py-3 font-medium">Remaining</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Status</th>
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
                        {formatDate(item.deadline_date ?? null)}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {item.deadline_days ? `${item.deadline_days} Hari` : "-"}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {item.customer ?? "-"}
                        {renderPaymentStatus(item.uang_muka, item.sisa_tagihan)}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {item.status_lanjutan ?? item.status ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          aria-label={`Update order ${item.no_fo}`}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300 transition-colors shadow-inner mr-1.5"
                          onClick={() => {
                            setEditFo({
                              no_fo: item.no_fo,
                              customer: item.customer ?? "",
                              qty_order: Number((item as any).qty_order) || 0,
                            });
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Pencil size={15} />
                        </button>
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
                      
                      <div className="flex gap-2 items-center">
                        <button
                          aria-label={`Update order ${item.no_fo}`}
                          className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300 transition-colors shadow-inner"
                          onClick={() => {
                            setEditFo({
                              no_fo: item.no_fo,
                              customer: item.customer ?? "",
                              qty_order: Number((item as any).qty_order) || 0,
                            });
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                        aria-label={`Lihat detail ${item.no_fo}`}
                        className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors shadow-inner"
                        onClick={() => setSelectedFo(item)}
                      >
                        <Eye size={18} />
                      </button>
                      </div>
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
                        <div className="font-medium text-slate-300 flex flex-wrap gap-1 items-center" title={item.customer ?? "-"}>
                          <span>{item.customer ?? "-"}</span>
                          {renderPaymentStatus(item.uang_muka, item.sisa_tagihan)}
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
              </div>              <table className="hidden lg:table w-full min-w-[820px] text-sm">
                <thead className="sticky top-0 bg-slate-900 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">No FO</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Deadline</th>
                    <th className="px-5 py-3 font-medium">Overdue</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {overdueTable.isLoading ? (
                    <tr>
                      <td
                        className="px-5 py-8 text-center text-slate-400"
                        colSpan={7}
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
                      <td className="px-5 py-4 text-rose-300 font-semibold">
                        {formatDate(item.deadline_date ?? null)}
                      </td>
                      <td className="px-5 py-4 text-red-400 font-bold">
                        {item.deadline_days ? `${item.deadline_days} Hari` : "-"}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {item.customer ?? "-"}
                        {renderPaymentStatus(item.uang_muka, item.sisa_tagihan)}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {item.status_lanjutan ?? item.status ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          aria-label={`Update order ${item.no_fo}`}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300 transition-colors shadow-inner mr-1.5"
                          onClick={() => {
                            setEditFo({
                              no_fo: item.no_fo,
                              customer: item.customer ?? "",
                              qty_order: Number((item as any).qty_order) || 0,
                            });
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Pencil size={15} />
                        </button>
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
                        colSpan={7}
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
                      
                      <div className="flex gap-2 items-center">
                        <button
                          aria-label={`Update order ${item.no_fo}`}
                          className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300 transition-colors shadow-inner"
                          onClick={() => {
                            setEditFo({
                              no_fo: item.no_fo,
                              customer: item.customer ?? "",
                              qty_order: Number((item as any).qty_order) || 0,
                            });
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                        aria-label={`Lihat detail ${item.no_fo}`}
                        className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors shadow-inner"
                        onClick={() => setSelectedFo(item)}
                      >
                        <Eye size={18} />
                      </button>
                      </div>
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
                        <div className="font-medium text-slate-300 flex flex-wrap gap-1 items-center" title={item.customer ?? "-"}>
                          <span>{item.customer ?? "-"}</span>
                          {renderPaymentStatus(item.uang_muka, item.sisa_tagihan)}
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
                        <AlertTriangle size={13} className="text-red-400" />
                        <span>Deadline Overdue</span>
                      </div>
                      <span className="font-bold text-red-400 animate-pulse">
                        {item.deadline_days ? `${item.deadline_days} Hari` : "-"}
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
              <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 md:flex-row md:items-center">
                <label className="grid gap-2 text-sm md:w-60">
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
                  <span className="font-medium text-slate-300">Filter Tanggal</span>
                  <select
                    value={completeFilterType}
                    onChange={(event) => {
                      setCompleteFilterType(event.target.value);
                      if (event.target.value !== "date_range") {
                        setCompleteStartDate("");
                        setCompleteEndDate("");
                      }
                      setCompletePage(1);
                    }}
                    className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-white outline-none focus:border-cyan-400"
                  >
                    <option value="today">Hari Ini</option>
                    <option value="this_week">Minggu Ini</option>
                    <option value="this_month">Bulan Ini</option>
                    <option value="this_year">Tahun Ini</option>
                    <option value="date_range">Range Tanggal</option>
                    <option value="all">Semua Data</option>
                  </select>
                </label>

                {completeFilterType === "date_range" && (
                  <>
                    <label className="grid gap-2 text-sm md:w-36">
                      <span className="font-medium text-slate-300">Mulai</span>
                      <input
                        type="date"
                        value={completeStartDate}
                        onChange={(e) => {
                          setCompleteStartDate(e.target.value);
                          setCompletePage(1);
                        }}
                        className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-white outline-none focus:border-cyan-400"
                      />
                    </label>
                    <label className="grid gap-2 text-sm md:w-36">
                      <span className="font-medium text-slate-300">Sampai</span>
                      <input
                        type="date"
                        value={completeEndDate}
                        onChange={(e) => {
                          setCompleteEndDate(e.target.value);
                          setCompletePage(1);
                        }}
                        className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-white outline-none focus:border-cyan-400"
                      />
                    </label>
                  </>
                )}

                <label className="grid gap-2 text-sm md:w-32 md:ml-auto">
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
                        {renderPaymentStatus(item.uang_muka, item.sisa_tagihan)}
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
                        <div className="font-medium text-slate-300 flex flex-wrap gap-1 items-center" title={item.customer ?? "-"}>
                          <span>{item.customer ?? "-"}</span>
                          {renderPaymentStatus(item.uang_muka, item.sisa_tagihan)}
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
                              <ClipboardList size={14} className="text-cyan-400" />
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
                })() // Force recompilation
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {/* Update Order Job Modal */}
      {isEditModalOpen && editFo ? (
        (() => {
          const nextJobVal = (() => {
            if (editFoDetailQuery.isLoading) return "Loading...";
            if (!editFoDetailQuery.data) return "-";
            
            const foData = editFoDetailQuery.data;
            const isNull = (val: any) => val === null || val === undefined || val === "";
            const userRole = (session?.role || "").trim().toLowerCase();

            if (userRole === "tukang-pressdtf" && foData.jenis_order === "JERSEY") {
              return "-";
            }
            if (userRole === "pengawas" && foData.jenis_order === "DTF ONLY") {
              return "-";
            }

            if (userRole === "tukang-desain") {
              if (isNull(foData.Desain_Ready)) return "Desain Ready";
            }
            if (userRole === "tukang-layout") {
              if (isNull(foData.Start_Layout) && !isNull(foData.Desain_Ready)) {
                return "Start Layout";
              }
              if (isNull(foData.Layout_Ready) && !isNull(foData.Start_Layout)) {
                return "Layout Ready";
              }
            }
            if (userRole === "pengawas" || userRole === "tukang-print") {
              if (isNull(foData.Ambil_Kain) && !isNull(foData.Layout_Ready) && userRole === "pengawas") {
                return "Ambil Kain";
              }
              if (isNull(foData.Start_Print) && !isNull(foData.Layout_Ready) && !isNull(foData.Ambil_Kain) && userRole === "tukang-print" && foData.jenis_order !== "DTF ONLY") {
                return "Start PrintOut";
              }
              if (isNull(foData.Start_Print) && !isNull(foData.Layout_Ready) && userRole === "tukang-print" && foData.jenis_order === "DTF ONLY") {
                return "Start PrintOut";
              }
              if (isNull(foData.Kain_ReadyPress) && !isNull(foData.Ambil_Kain) && userRole === "pengawas") {
                return "Bahan Kain/Kaos DTF Ready";
              }
              if (isNull(foData.Print_ReadyPress) && !isNull(foData.Start_Print) && userRole === "tukang-print" && foData.jenis_order !== "DTF ONLY") {
                return "PrintOut Ready";
              }
              if (isNull(foData.Print_ReadyPress) && !isNull(foData.Start_Print) && userRole === "tukang-print" && foData.jenis_order === "DTF ONLY") {
                return "Printout DTF Selesai";
              }
            }
            if (userRole === "tukang-press" || userRole === "tukang-pressdtf") {
              if (isNull(foData.Start_Press) && !isNull(foData.Kain_ReadyPress) && !isNull(foData.Print_ReadyPress)) {
                return "Start Press";
              }
              if (isNull(foData.Press_ReadyCut) && !isNull(foData.Start_Press)) {
                if (userRole === "tukang-press") return "Kain Ready Cutting";
                return "Kaos/Jersey Siap QC";
              }
            }
            if (userRole === "tukang-cutting") {
              if (isNull(foData.Start_Cut) && !isNull(foData.Press_ReadyCut)) {
                return "Start Cutting";
              }
              if (isNull(foData.Cut_ReadyJahit) && !isNull(foData.Start_Cut)) {
                return "Kain Ready Jahit";
              }
            }
            if (userRole === "tukang-qc") {
              if (isNull(foData.Start_Jahit) && !isNull(foData.Cut_ReadyJahit)) {
                return "Start Jahit";
              }
              if (isNull(foData.Jahit_ReadyQC) && !isNull(foData.Start_Jahit)) {
                return "Produk Ready QC";
              }
              if (isNull(foData.Start_QC) && !isNull(foData.Jahit_ReadyQC)) {
                return "Start QC";
              }
              if (isNull(foData.FinalQC_Packiing) && !isNull(foData.Start_QC)) {
                return "Siap Packing";
              }
              if (isNull(foData.QC_ReadyGudang) && !isNull(foData.FinalQC_Packiing)) {
                return "Selesai Packing, Siap diAmbil";
              }
            }
            if (userRole === "tukang-layanics") {
              if (isNull(foData.Final_Cust) && !isNull(foData.QC_ReadyGudang)) {
                return "Produk diterima Customer";
              }
            }

            return "-";
          })();

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
              <section className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900/90 shadow-2xl relative overflow-hidden backdrop-blur-md flex flex-col max-h-[90vh]">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"></div>
            
            <header className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-slate-800 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Pencil className="text-amber-400 size-5" />
                  Update Order Job
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Detail informasi penugasan pekerjaan Form Order.
                </p>
              </div>
              <button
                aria-label="Tutup update modal"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditFo(null);
                }}
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
              {modalError ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-red-900/30 bg-red-950/20 text-xs text-red-200">
                  <ShieldAlert className="size-4 text-red-400 shrink-0" />
                  <span>{modalError}</span>
                </div>
              ) : null}

              {modalSuccess ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-900/30 bg-emerald-950/20 text-xs text-emerald-200">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span>{modalSuccess}</span>
                </div>
              ) : null}

              <div className="space-y-4">
                {/* No FO */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">No FO</label>
                  <input
                    type="text"
                    value={editFo.no_fo}
                    readOnly
                    className="w-full h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>

                {/* Nama Customer */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nama Customer</label>
                  <input
                    type="text"
                    value={editFo.customer || "-"}
                    readOnly
                    className="w-full h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>

                
                {/* Qty & Breakdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Qty</label>
                  
                  {editFoDetailsQuery.isLoading || editFoDetailQuery.isLoading ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-850 bg-slate-950/40 text-xs text-slate-400 italic">
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-amber-400"></div>
                      <span>Menghitung jumlah produk...</span>
                    </div>
                  ) : (
                    (() => {
                      const totalQty = editFoDetailQuery.data?.qty_order ?? editFo.qty_order ?? 0;
                      const detailItems = editFoDetailsQuery.data?.items ?? [];
                      const hasSetelan = detailItems.some(item => 
                        item.produk && item.produk.toUpperCase().includes("SETELAN")
                      );
                      const hasNonSetelan = detailItems.some(item => 
                        !item.produk || !item.produk.toUpperCase().includes("SETELAN")
                      );

                      if (hasSetelan && !hasNonSetelan) {
                        return (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={`${totalQty} Stel`}
                              readOnly
                              className="w-full h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-500 outline-none cursor-not-allowed font-semibold"
                            />
                            <p className="text-[11px] text-slate-400 italic">
                              * Semua produk memiliki item SETELAN, total qty otomatis menggunakan satuan Stel.
                            </p>
                          </div>
                        );
                      } else if (!hasSetelan) {
                        return (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={`${totalQty} Pcs`}
                              readOnly
                              className="w-full h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-500 outline-none cursor-not-allowed font-semibold"
                            />
                            <p className="text-[11px] text-slate-400 italic">
                              * Produk ini tidak memiliki item SETELAN, total qty otomatis menggunakan satuan Pcs.
                            </p>
                          </div>
                        );
                      } else {
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
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={`${totalQty}`}
                              readOnly
                              className="w-full h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-500 outline-none cursor-not-allowed font-bold"
                            />
                            
                            <div className="rounded-lg bg-slate-950 p-4 border border-slate-800/80 space-y-2">
                              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Breakdown Detail Qty:
                              </span>
                              <div className="flex justify-between items-center text-xs border-b border-slate-850 pb-2">
                                <span className="text-slate-400">Total Qty (SETELAN):</span>
                                <span className="font-bold text-amber-400 font-mono">{setelanQty} Stel</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Total Qty (Bukan SETELAN):</span>
                                <span className="font-bold text-slate-200 font-mono">{nonSetelanQty} Pcs</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })()
                  )}
                </div>

                {/* Jenis Order */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Jenis Order</label>
                  <input
                    type="text"
                    value={editFoDetailQuery.isLoading ? "Loading..." : (editFoDetailQuery.data?.jenis_order || "-")}
                    readOnly
                    className="w-full h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-500 outline-none cursor-not-allowed font-semibold text-slate-300"
                  />
                </div>

                {/* Previous Job */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Previous Job</label>
                  <input
                    type="text"
                    value={editFoDetailQuery.isLoading ? "Loading..." : (editFoDetailQuery.data?.status_lanjutan || "Desain Belum Tersedia")}
                    readOnly
                    className="w-full h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-500 outline-none cursor-not-allowed font-semibold text-amber-200"
                  />
                </div>
                {/* Date Previous Job */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Date Previous Job</label>
                  <input
                    type="text"
                    value={
                      editFoDetailQuery.isLoading
                        ? "Loading..."
                        : (editFoDetailQuery.data?.status_lanjutan
                            ? formatIndonesianDateTime(editFoDetailQuery.data?.datetime_lanjutan ?? null)
                            : formatIndonesianDate(editFoDetailQuery.data?.order_date ?? null))
                    }
                    readOnly
                    className="w-full h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>

                {/* Next Job */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Next Job</label>
                  <input
                    type="text"
                    value={nextJobVal}
                    readOnly
                    className="w-full h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-emerald-400 outline-none cursor-not-allowed font-bold"
                  />
                </div>

                 {/* Date Next Job */}
                 {nextJobVal !== "-" && !editFoDetailQuery.isLoading && (() => {
                   const referenceDate = new Date();
                   
                   const dMinus1 = new Date(referenceDate);
                   dMinus1.setDate(dMinus1.getDate() - 1);
                   
                   const dZero = new Date(referenceDate);
                   
                   const dPlus1 = new Date(referenceDate);
                   dPlus1.setDate(dPlus1.getDate() + 1);

                   const selectedDateObj = dateNextJob ? new Date(dateNextJob) : new Date();
                   const isSameDay = (d1: Date, d2: Date) => 
                     d1.getFullYear() === d2.getFullYear() &&
                     d1.getMonth() === d2.getMonth() &&
                     d1.getDate() === d2.getDate();

                   const getTimeString = (dateTimeStr: string) => {
                     if (!dateTimeStr) {
                       const now = new Date();
                       return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                     }
                     const parts = dateTimeStr.split("T");
                     if (parts[1]) return parts[1].slice(0, 5);
                     const now = new Date();
                     return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                   };

                   const handleDateSelect = (targetDate: Date) => {
                     const currentTime = getTimeString(dateNextJob);
                     const year = targetDate.getFullYear();
                     const month = String(targetDate.getMonth() + 1).padStart(2, '0');
                     const day = String(targetDate.getDate()).padStart(2, '0');
                     setDateNextJob(`${year}-${month}-${day}T${currentTime}`);
                   };

                   const handleTimeChange = (timeStr: string) => {
                     const currentDatePart = dateNextJob ? dateNextJob.split("T")[0] : toLocalISOString(new Date()).split("T")[0];
                     setDateNextJob(`${currentDatePart}T${timeStr}`);
                     setIsTimeEdited(true);
                   };

                   return (
                     <div className="space-y-3">
                       <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Waktu Selesai Job (Date Next Job)</label>
                       
                       <div className="grid grid-cols-3 gap-2">
                         <button
                           type="button"
                           onClick={() => handleDateSelect(dMinus1)}
                           className={`p-2 rounded-lg border text-center transition flex flex-col items-center justify-center ${
                             isSameDay(selectedDateObj, dMinus1)
                               ? "border-amber-500 bg-amber-500/10 text-amber-200"
                               : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                           }`}
                         >
                           <span className="text-[9px] font-bold uppercase tracking-wider">H-1 (Kemarin)</span>
                           <span className="text-[11px] font-mono mt-0.5">{formatIndonesianDate(dMinus1)}</span>
                         </button>
                         
                         <button
                           type="button"
                           onClick={() => handleDateSelect(dZero)}
                           className={`p-2 rounded-lg border text-center transition flex flex-col items-center justify-center ${
                             isSameDay(selectedDateObj, dZero)
                               ? "border-amber-500 bg-amber-500/10 text-amber-200"
                               : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                           }`}
                         >
                           <span className="text-[9px] font-bold uppercase tracking-wider">H0 (Hari Status)</span>
                           <span className="text-[11px] font-mono mt-0.5">{formatIndonesianDate(dZero)}</span>
                         </button>

                         <button
                           type="button"
                           onClick={() => handleDateSelect(dPlus1)}
                           className={`p-2 rounded-lg border text-center transition flex flex-col items-center justify-center ${
                             isSameDay(selectedDateObj, dPlus1)
                               ? "border-amber-500 bg-amber-500/10 text-amber-200"
                               : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                           }`}
                         >
                           <span className="text-[9px] font-bold uppercase tracking-wider">H+1 (Besok)</span>
                           <span className="text-[11px] font-mono mt-0.5">{formatIndonesianDate(dPlus1)}</span>
                         </button>
                       </div>

                       <div className="flex items-center gap-3 bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                         <span className="text-xs text-slate-400 font-medium shrink-0">Pukul / Jam Selesai:</span>
                         <input
                           type="time"
                           value={getTimeString(dateNextJob)}
                           onChange={(e) => handleTimeChange(e.target.value)}
                           className="flex-1 h-9 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
                           disabled={isUpdating}
                           required
                         />
                       </div>
                       
                       <span className="text-[10px] text-slate-500 mt-1 block">
                         Toleransi batas waktu pengerjaan: H-1 s.d H+1 dari status sebelumnya.
                       </span>
                     </div>
                   );
                 })()}

                {/* Nama Pegawai */}
                {nextJobVal !== "-" && !editFoDetailQuery.isLoading ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nama Pegawai</label>
                    <select
                      value={selectedPegawai}
                      onChange={(e) => setSelectedPegawai(e.target.value)}
                      className="w-full h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                      disabled={isUpdating}
                    >
                      {[
                        "ALDO", "BEN", "JIHAN", "FINA", "FANI", "EGY", "IVAN", "IZAMI", "IKHA", 
                        "NOVAN", "NATRIS", "NASRIL", "PUSPA", "RISKY", "REINA", "SAFA", "SAID", 
                        "SYAHNI", "YOHAND", "KARIM-PENJAHIT", "ADI-PENJAHIT", "SANDY-PENJAHIT", 
                        "ALIF-PENJAHIT", "DIDIN-PENJAHIT", "NN"
                      ].map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {/* Nama Penerima */}
                {nextJobVal === "Produk diterima Customer" && !editFoDetailQuery.isLoading ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nama Penerima</label>
                    <input
                      type="text"
                      value={namaPenerima}
                      onChange={(e) => setNamaPenerima(e.target.value)}
                      placeholder="Masukkan nama penerima barang"
                      className="w-full h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                      disabled={isUpdating}
                      required
                    />
                  </div>
                ) : null}

                {/* Keterangan */}
                {nextJobVal !== "-" && !editFoDetailQuery.isLoading ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Keterangan</label>
                    <textarea
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      placeholder="Masukkan keterangan pekerjaan jika ada"
                      className="w-full min-h-[80px] rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-200 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition resize-none"
                      disabled={isUpdating}
                    />
                  </div>
                ) : null}

                
              </div>
            </div>

            <footer className="p-6 pt-4 border-t border-slate-800 flex justify-end gap-3 flex-shrink-0">
              <button
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditFo(null);
                }}
                disabled={isUpdating}
              >
                Tutup
              </button>

              {nextJobVal !== "-" && !editFoDetailQuery.isLoading ? (
                <button
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800/50 disabled:text-slate-400 rounded-lg transition flex items-center gap-2"
                  onClick={() => handleUpdateJob(nextJobVal)}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Update Job</span>
                  )}
                </button>
              ) : null}
            </footer>
          </section>
        </div>
          );
        })()
      ) : null}

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
          <div className="fixed bottom-5 right-5 z-[9999] animate-slide-in-right">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 ${
              toast.type === "success" 
                ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-200" 
                : "bg-rose-950/90 border-rose-500/30 text-rose-200"
            }`}>
              {toast.type === "success" ? (
                <Check className="size-5 text-emerald-400 shrink-0" />
              ) : (
                <X className="size-5 text-rose-400 shrink-0" />
              )}
              <div className="text-sm font-medium">{toast.message}</div>
              <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75 transition-opacity">
                <X className="size-4 opacity-60" />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
