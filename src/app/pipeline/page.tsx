"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  ArrowRight,
  ClipboardList,
  Eye,
  Timer,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { api } from "@/lib/api";
import type { FoOutstandingRow } from "@/lib/types";

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
    href: "/pipeline/active",
    icon: Timer,
    tone: "text-cyan-200",
  },
  {
    title: "FO Complete",
    description: "Arsip order selesai untuk histori dan referensi produksi.",
    href: "/pipeline/completed",
    icon: Archive,
    tone: "text-emerald-200",
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
  const [selectedFo, setSelectedFo] = useState<FoOutstandingRow | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number | "all">(5);
  const [search, setSearch] = useState("");

  const outstandingSummary = useQuery({
    queryKey: ["fo-outstanding-summary"],
    queryFn: () => api.getFoOutstanding({ page: 1, limit: 5 }),
  });

  const outstandingTable = useQuery({
    queryKey: ["fo-outstanding", page, limit, search],
    queryFn: () =>
      api.getFoOutstanding({
        page,
        limit,
        search,
      }),
    enabled: isOutstandingOpen,
  });

  const visibleOutstandingItems = (outstandingTable.data?.items ?? []).filter(
    (item, index, rows) =>
      matchesSearch(item, search) &&
      rows.findIndex((row) => row.no_fo === item.no_fo) === index,
  );

  return (
    <>
      <PageHeader
        title="Production Pipeline"
        description="Kelola alur FO dari outstanding, deadline, sampai complete dalam satu modul produksi."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {pipelineCards.map((card) => {
          const Icon = card.icon;
          const isOutstanding = card.type === "outstanding";
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
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {card.description}
              </p>
              {isOutstanding && outstandingSummary.isError ? (
                <p className="mt-3 text-sm text-red-300">
                  {outstandingSummary.error.message}
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

          return (
            <Link
              key={card.href}
              href={card.href ?? "#"}
              className="group rounded-lg border border-slate-800 bg-slate-900/70 p-5 shadow-sm shadow-slate-950/20 hover:border-cyan-400/40 hover:bg-slate-900"
            >
              {content}
            </Link>
          );
        })}
      </div>

      {isOutstandingOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
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

            <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <label className="grid gap-2 text-sm md:w-80">
                <span className="font-medium text-slate-300">Search</span>
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari No FO atau customer"
                  className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-white outline-none focus:border-cyan-400"
                />
              </label>

              <label className="grid gap-2 text-sm md:w-44">
                <span className="font-medium text-slate-300">Tampilkan</span>
                <select
                  value={String(limit)}
                  onChange={(event) => {
                    const nextValue =
                      event.target.value === "all"
                        ? "all"
                        : Number(event.target.value);
                    setLimit(nextValue);
                    setPage(1);
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

            <div className="overflow-auto">
              <table className="w-full min-w-[820px] text-sm">
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
                        {item.status_lanjutan ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          aria-label={`Lihat detail ${item.no_fo}`}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-200"
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
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
              <p>
                {outstandingTable.isFetching
                  ? "Memperbarui data..."
                  : `Halaman ${outstandingTable.data?.page ?? page} dari ${
                      outstandingTable.data?.totalPages ?? 1
                    }`}
              </p>
              <div className="flex gap-2">
                <button
                  className="h-9 rounded-lg border border-slate-700 px-3 text-slate-200 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={page <= 1 || limit === "all"}
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                >
                  Previous
                </button>
                <button
                  className="h-9 rounded-lg border border-slate-700 px-3 text-slate-200 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    limit === "all" ||
                    page >= (outstandingTable.data?.totalPages ?? 1)
                  }
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}

      {selectedFo ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4">
          <section className="w-full max-w-lg rounded-lg border border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Detail Form Order
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Detail untuk {selectedFo.no_fo} akan dibuat pada tahap
                  berikutnya.
                </p>
              </div>
              <button
                aria-label="Tutup detail"
                className="rounded-md p-2 text-slate-400 hover:bg-slate-900 hover:text-white"
                onClick={() => setSelectedFo(null)}
              >
                <X size={20} />
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
