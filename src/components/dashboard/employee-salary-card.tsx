"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Banknote,
  Briefcase,
  Building2,
  FileQuestion,
  Info,
  RefreshCw,
  Sparkles,
  Utensils,
  Car,
  Coins,
} from "lucide-react";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { SessionUser } from "@/lib/types";

type PeriodType = "hari" | "minggu" | "bulan";

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function EmployeeSalaryCard({ user }: { user?: SessionUser | null }) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("bulan");

  // Determine user to query (prop or session)
  const currentUser = user || getSession();
  const username = currentUser?.username || "";
  const kd_user = currentUser?.id || "";

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["my-salary", username, kd_user],
    queryFn: () => api.getMySalary({ username, kd_user }),
    enabled: Boolean(username || kd_user),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  if (isLoading) {
    return (
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
        <div className="flex animate-pulse items-center justify-between border-b border-slate-800 pb-5">
          <div className="space-y-2">
            <div className="h-6 w-48 rounded-lg bg-slate-800" />
            <div className="h-4 w-64 rounded bg-slate-800" />
          </div>
          <div className="h-10 w-60 rounded-xl bg-slate-800" />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-slate-800/60" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mb-6 rounded-2xl border border-rose-500/30 bg-slate-900/60 p-6 text-rose-400 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-rose-400" />
            <p className="text-sm font-medium">Gagal memuat rincian salary.</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const karyawan = data?.karyawan;

  // If user is not mapped in database yet
  if (!karyawan) {
    return (
      <div className="mb-6 rounded-2xl border border-amber-500/30 bg-slate-900/60 p-6 shadow-sm backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <FileQuestion className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-white">
              Data Salary Karyawan Belum Dihubungkan
            </h3>
            <p className="text-sm text-slate-400">
              Akun <span className="font-semibold text-amber-400">{username}</span> belum memiliki profil yang terdaftar di data karyawan sistem.
            </p>
            <p className="text-xs text-slate-500">
              Silakan hubungi bagian HRD atau Administrator untuk melengkapi data karyawan Anda.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const breakdown = karyawan.breakdown;
  const config = karyawan.config;

  const currentRates =
    selectedPeriod === "hari"
      ? breakdown.daily
      : selectedPeriod === "minggu"
      ? breakdown.weekly
      : breakdown.monthly;

  const periodLabel =
    selectedPeriod === "hari"
      ? "Per Hari"
      : selectedPeriod === "minggu"
      ? "Per Minggu"
      : "Per Bulan";

  const periodNote =
    selectedPeriod === "hari"
      ? "Perhitungan harian aktif (1 hari kerja)"
      : selectedPeriod === "minggu"
      ? "Perhitungan mingguan (estimasi 6 hari kerja operasional)"
      : "Perhitungan bulanan penuh (basis 26 hari kerja operasional)";

  const total = currentRates.total || 1;
  const basicPercent = Math.round((currentRates.basic / total) * 100);
  const makanPercent = Math.round((currentRates.makan / total) * 100);
  const transportPercent = Math.round((currentRates.transport / total) * 100);

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-sm backdrop-blur-sm transition-all">
      {/* Top Bar Header */}
      <div className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-white">
                Rincian Kompensasi & Gaji
              </h2>
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                <Sparkles className="h-3 w-3" />
                {karyawan.id_karyawan}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-400">
              <span className="font-semibold text-white">
                {karyawan.nm_karyawan}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 font-medium">
                <Building2 className="h-3 w-3 text-slate-400" />
                {karyawan.dept || "PRODUKSI"}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 font-medium">
                <Briefcase className="h-3 w-3 text-slate-400" />
                {karyawan.jabatan || "KARYAWAN"}
              </span>
            </div>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1.5 self-start rounded-xl border border-slate-800 bg-slate-800/50 p-1 sm:self-center">
          <button
            type="button"
            onClick={() => setSelectedPeriod("hari")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              selectedPeriod === "hari"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Per Hari
          </button>
          <button
            type="button"
            onClick={() => setSelectedPeriod("minggu")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              selectedPeriod === "minggu"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Per Minggu
          </button>
          <button
            type="button"
            onClick={() => setSelectedPeriod("bulan")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              selectedPeriod === "bulan"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Per Bulan
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh data salary"
            className="ml-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-5">
        {/* Total Compensation Highlight Banner */}
        <div className="relative mb-5 overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Total Kompensasi
                </span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                  {periodLabel}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                  {formatRupiah(currentRates.total)}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  /{selectedPeriod === "hari" ? "hari kerja" : selectedPeriod === "minggu" ? "minggu" : "bulan"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {periodNote}
              </p>
            </div>

            {/* Total Ratio Bar */}
            <div className="flex flex-col gap-1.5 sm:w-72">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                <span>Komposisi:</span>
                <span>Basic {basicPercent}% • Makan {makanPercent}% • Trans {transportPercent}%</span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  style={{ width: `${basicPercent}%` }}
                  title={`Gaji Pokok: ${basicPercent}%`}
                  className="bg-cyan-500 transition-all duration-500"
                />
                <div
                  style={{ width: `${makanPercent}%` }}
                  title={`Insentif Makan: ${makanPercent}%`}
                  className="bg-amber-500 transition-all duration-500"
                />
                <div
                  style={{ width: `${transportPercent}%` }}
                  title={`Insentif Transport: ${transportPercent}%`}
                  className="bg-purple-500 transition-all duration-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3 Detail Cards (Basic, Makan, Transport) */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* 1. Basic Salary Card */}
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 p-4.5 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Gaji Pokok (Basic)
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
                <Banknote className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-white font-mono">
                {formatRupiah(currentRates.basic)}
              </p>
              <p className="text-xs text-slate-400">
                per {selectedPeriod} ({basicPercent}% dari total)
              </p>
            </div>

            {/* Formula / Configuration Badge */}
            <div className="mt-3.5 rounded-lg border border-slate-800 bg-slate-800/40 p-2.5 text-[11px]">
              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-400">Basis:</span>
                <span className="font-semibold text-cyan-400">
                  {formatRupiah(config.basic_salary)} / {config.salary_period}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-slate-400">
                <span>Operasi:</span>
                <span className="font-medium text-white">
                  {config.salary_operator === "bagi" ? "÷ Dibagi" : "× Dikali"} {config.salary_factor}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Makan Allowance Card */}
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 p-4.5 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Insentif Makan
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
                <Utensils className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-white font-mono">
                {formatRupiah(currentRates.makan)}
              </p>
              <p className="text-xs text-slate-400">
                per {selectedPeriod} ({makanPercent}% dari total)
              </p>
            </div>

            {/* Formula / Configuration Badge */}
            <div className="mt-3.5 rounded-lg border border-slate-800 bg-slate-800/40 p-2.5 text-[11px]">
              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-400">Basis:</span>
                <span className="font-semibold text-amber-400">
                  {formatRupiah(config.makan_nominal)} / {config.makan_period}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-slate-400">
                <span>Operasi:</span>
                <span className="font-medium text-white">
                  {config.makan_operator === "bagi" ? "÷ Dibagi" : "× Dikali"} {config.makan_factor}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Transport Allowance Card */}
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 p-4.5 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                Insentif Transport
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-purple-500/20 bg-purple-500/10 text-purple-400">
                <Car className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-white font-mono">
                {formatRupiah(currentRates.transport)}
              </p>
              <p className="text-xs text-slate-400">
                per {selectedPeriod} ({transportPercent}% dari total)
              </p>
            </div>

            {/* Formula / Configuration Badge */}
            <div className="mt-3.5 rounded-lg border border-slate-800 bg-slate-800/40 p-2.5 text-[11px]">
              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-400">Basis:</span>
                <span className="font-semibold text-purple-400">
                  {formatRupiah(config.transport_nominal)} / {config.transport_period}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-slate-400">
                <span>Operasi:</span>
                <span className="font-medium text-white">
                  {config.transport_operator === "bagi" ? "÷ Dibagi" : "× Dikali"} {config.transport_factor}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
