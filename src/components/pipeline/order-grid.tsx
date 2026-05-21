"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Boxes } from "lucide-react";
import { api } from "@/lib/api";
import type { OrderStatus } from "@/lib/types";
import { OrderCard } from "./order-card";

const copy = {
  pending: {
    empty: "Belum ada pending inquiry.",
    error: "Gagal memuat pending inquiry.",
  },
  active: {
    empty: "Belum ada deadline aktif.",
    error: "Gagal memuat deadline aktif.",
  },
  completed: {
    empty: "Belum ada arsip selesai.",
    error: "Gagal memuat arsip selesai.",
  },
};

export function OrderGrid({ status }: { status: OrderStatus }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["orders", status],
    queryFn: () => api.getOrders(status),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-lg border border-slate-800 bg-slate-900/70"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-5 text-red-100">
        <div className="flex items-center gap-3 font-medium">
          <AlertCircle size={18} />
          {copy[status].error}
        </div>
        <p className="mt-2 text-sm text-red-100/70">
          {error instanceof Error ? error.message : "Periksa koneksi API VPS."}
        </p>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
        <Boxes className="text-slate-500" size={42} />
        <h2 className="mt-4 text-base font-semibold text-white">
          {copy[status].empty}
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Data akan muncul otomatis setelah backend mengembalikan order pada
          status ini.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.map((order) => (
        <OrderCard key={String(order.id)} order={order} />
      ))}
    </div>
  );
}
