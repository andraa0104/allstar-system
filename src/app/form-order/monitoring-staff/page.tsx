"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";
import { Eye, ClipboardList, X } from "lucide-react";
import type { FoDetailData, MonitoringStaffRow } from "@/lib/types";

const pageSizeOptions = [5, 10, 25, 50, 100, "all"] as const;

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
                  <span className="inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                    {tableQuery.data.totalStel.toLocaleString("id-ID")} Stel
                  </span>
                  <span className="inline-flex items-center rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                    {tableQuery.data.totalPcs.toLocaleString("id-ID")} Pcs
                  </span>
                  <span className="inline-flex items-center rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/20">
                    Total: {tableQuery.data.totalQty.toLocaleString("id-ID")} Qty
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
                <th className="px-3 py-2">Pegawai</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {namaPegawai === "" ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-xs text-slate-400 italic">
                    Silakan pilih pegawai terlebih dahulu untuk menampilkan data.
                  </td>
                </tr>
              ) : tableQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-xs text-slate-400 italic">
                    Memuat data monitoring staff...
                  </td>
                </tr>
              ) : null}

              {namaPegawai !== "" && !tableQuery.isLoading && !tableQuery.data?.items?.length ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-xs text-slate-400 italic">
                    Tidak ada data yang cocok dengan kriteria.
                  </td>
                </tr>
              ) : null}

              {tableQuery.data?.items?.map((item) => (
                <tr key={item.no_job} className="transition-colors border-b border-slate-800/60 hover:bg-slate-900/30 text-slate-300">
                  <td className="px-3 py-2 font-mono font-bold tracking-wide text-cyan-400">
                    {item.no_job}
                  </td>
                  <td className="px-3 py-2 font-mono tracking-wide text-white">
                    {item.no_fo}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {formatIndonesianDate(item.order_date)}
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
                    <span className="text-xs font-mono font-bold text-cyan-400 tracking-wide">{item.no_job}</span>
                    <span className="text-[11px] font-mono font-bold text-white tracking-wide">{item.no_fo}</span>
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

              <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-800/40">
                <div>
                  <span className="block text-[9px] uppercase font-semibold text-slate-500">Order Date</span>
                  <span className="text-[11px] text-slate-300 block mt-0.5 leading-relaxed">{formatIndonesianDate(item.order_date)}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-semibold text-slate-500">Qty Order</span>
                  <span className="text-[11px] text-slate-300 font-mono font-bold block mt-0.5 leading-relaxed">{item.qty_order ?? 0} Pcs</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <section className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40">
            <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Detail Form Order
                </h2>
                <p className="font-mono text-sm font-medium text-cyan-400 mt-0.5">
                  {selectedFo.no_fo}
                </p>
              </div>
              <button
                aria-label="Tutup modal"
                className="rounded-md p-2 text-slate-400 hover:bg-slate-900 hover:text-white"
                onClick={() => setSelectedFo(null)}
              >
                <X size={20} />
              </button>
            </header>

            <div className="border-b border-slate-800 px-5 flex gap-6 overflow-x-auto">
              <button
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "summary"
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setActiveTab("summary")}
              >
                Summary Order
              </button>
              <button
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "detail"
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setActiveTab("detail")}
              >
                Data Detail & Size
              </button>
            </div>

            <div className="overflow-auto p-5 space-y-6 flex-1">
              {activeTab === "summary" && (
                <div className="grid md:grid-cols-2 gap-6">
                  {foDetailQuery.isLoading ? (
                    <div className="col-span-2 text-center text-sm text-slate-400 py-10">
                      Memuat summary order...
                    </div>
                  ) : null}

                  {!foDetailQuery.isLoading && foDetailQuery.data ? (
                    <>
                      <div className="space-y-4">
                        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Info Utama
                          </h3>
                          <dl className="space-y-3 text-sm">
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <dt className="text-slate-400">Order Date</dt>
                              <dd className="font-medium text-white">
                                {formatIndonesianDate(foDetailQuery.data.order_date)}
                              </dd>
                            </div>
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <dt className="text-slate-400">Customer</dt>
                              <dd className="font-medium text-white">
                                {foDetailQuery.data.customer ?? "-"}
                              </dd>
                            </div>
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <dt className="text-slate-400">Telp Customer</dt>
                              <dd className="font-medium text-white">
                                {foDetailQuery.data.telp_cus ?? "-"}
                              </dd>
                            </div>
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <dt className="text-slate-400">Qty Order</dt>
                              <dd className="font-medium text-white">
                                {foDetailQuery.data.qty_order ?? "-"} Pcs
                              </dd>
                            </div>
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <dt className="text-slate-400">Jenis Order</dt>
                              <dd className="font-medium text-white">
                                {foDetailQuery.data.jenis_order ?? "-"}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Status Terkini
                          </h3>
                          <dl className="space-y-3 text-sm">
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <dt className="text-slate-400">Status</dt>
                              <dd className="font-bold text-cyan-400">
                                {foDetailQuery.data.status_lanjutan ?? "-"}
                              </dd>
                            </div>
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <dt className="text-slate-400">Last Update</dt>
                              <dd className="font-mono text-xs text-white mt-1">
                                {formatIndonesianDateTime(foDetailQuery.data.datetime_lanjutan)}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Pembayaran & Harga
                          </h3>
                          <dl className="space-y-3 text-sm">
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <dt className="text-slate-400">Total Harga</dt>
                              <dd className="font-medium text-white">
                                {formatRupiah(foDetailQuery.data.totalrp)}
                              </dd>
                            </div>
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <dt className="text-slate-400">Uang Muka (DP)</dt>
                              <dd className="font-medium text-emerald-400">
                                {formatRupiah(foDetailQuery.data.uang_muka)}
                                <span className="block text-[10px] text-slate-500 mt-0.5">
                                  Tgl DP: {formatIndonesianDate(foDetailQuery.data.tgl_um)}
                                </span>
                              </dd>
                            </div>
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <dt className="text-slate-400">Sisa Tagihan</dt>
                              <dd className="font-medium text-rose-400">
                                {formatRupiah(foDetailQuery.data.sisa_tagihan)}
                              </dd>
                            </div>
                            <div className="grid grid-cols-[120px_1fr] gap-2 pt-2 border-t border-slate-800/60">
                              <dt className="text-slate-400">Bayar Lunas</dt>
                              <dd className="font-medium text-white">
                                {formatRupiah(foDetailQuery.data.bayar_lunas)}
                                {foDetailQuery.data.tgl_pelunasan && (
                                  <span className="block text-[10px] text-slate-500 mt-0.5">
                                    Tgl Lunas: {formatIndonesianDate(foDetailQuery.data.tgl_pelunasan)}
                                  </span>
                                )}
                              </dd>
                            </div>
                          </dl>
                        </div>
                        
                        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Remark / Catatan
                          </h3>
                          <div className="text-sm text-slate-300 bg-slate-950 p-3 rounded border border-slate-800 whitespace-pre-wrap">
                            {foDetailQuery.data.remark || <span className="text-slate-600 italic">Tidak ada catatan khusus.</span>}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {activeTab === "detail" && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-slate-300">Cari:</span>
                      <input
                        value={detailSearch}
                        onChange={(e) => {
                          setDetailSearch(e.target.value);
                          setDetailPage(1);
                        }}
                        placeholder="Cari detail, produk, model..."
                        className="h-9 w-64 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-slate-300">Tampilkan:</span>
                      <select
                        value={String(detailLimit)}
                        onChange={(e) => {
                          const nextValue = e.target.value === "all" ? "all" : Number(e.target.value);
                          setDetailLimit(nextValue);
                          setDetailPage(1);
                        }}
                        className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400"
                      >
                        {pageSizeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option === "all" ? "Semua" : option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-slate-950/50 text-xs uppercase text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Produk</th>
                          <th className="px-4 py-3 font-semibold">Detail Item</th>
                          <th className="px-4 py-3 font-semibold">Model</th>
                          <th className="px-4 py-3 font-semibold">Bahan</th>
                          <th className="px-4 py-3 font-semibold">Size</th>
                          <th className="px-4 py-3 font-semibold text-right">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {foDetailItemsQuery.isLoading ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                              Memuat data detail item...
                            </td>
                          </tr>
                        ) : null}

                        {!foDetailItemsQuery.isLoading && !foDetailItemsQuery.data?.items?.length ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                              Tidak ada data detail item.
                            </td>
                          </tr>
                        ) : null}

                        {foDetailItemsQuery.data?.items?.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-900/80 transition-colors">
                            <td className="px-4 py-3 text-slate-300">{item.produk ?? "-"}</td>
                            <td className="px-4 py-3 text-white font-medium">{item.detail_item}</td>
                            <td className="px-4 py-3 text-slate-300">{item.model ?? "-"}</td>
                            <td className="px-4 py-3 text-slate-300">{item.bahan ?? "-"}</td>
                            <td className="px-4 py-3 font-mono text-cyan-400">{item.size ?? "-"}</td>
                            <td className="px-4 py-3 font-mono font-bold text-white text-right">{item.qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>
                      Halaman {foDetailItemsQuery.data?.page ?? detailPage} dari {foDetailItemsQuery.data?.totalPages ?? 1}
                    </span>
                    <div className="flex gap-2">
                      <button
                        className="h-8 rounded border border-slate-700 px-3 hover:bg-slate-800 disabled:opacity-50"
                        disabled={detailPage <= 1 || detailLimit === "all"}
                        onClick={() => setDetailPage(c => c - 1)}
                      >
                        Prev
                      </button>
                      <button
                        className="h-8 rounded border border-slate-700 px-3 hover:bg-slate-800 disabled:opacity-50"
                        disabled={detailLimit === "all" || detailPage >= (foDetailItemsQuery.data?.totalPages ?? 1)}
                        onClick={() => setDetailPage(c => c + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
