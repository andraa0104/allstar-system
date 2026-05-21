"use client";

import { CalendarClock, Factory, Hash, UserRound } from "lucide-react";
import type { ProductionOrder } from "@/lib/types";

function value(...items: Array<string | number | undefined>) {
  return items.find((item) => item !== undefined && String(item).trim() !== "");
}

function formatDate(input?: string) {
  if (!input) {
    return "Belum diset";
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function OrderCard({ order }: { order: ProductionOrder }) {
  const customer = value(order.customer, order.customer_name, order.client);
  const product = value(order.product, order.item);
  const orderNumber = value(order.order_number, order.no_order, order.id);
  const quantity = value(order.quantity, order.qty);
  const deadline = value(order.deadline, order.due_date);
  const progress =
    typeof order.progress === "number"
      ? Math.min(Math.max(order.progress, 0), 100)
      : undefined;

  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900/70 p-5 shadow-sm shadow-slate-950/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-cyan-300">
            <Hash size={14} />
            {orderNumber}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            {product ?? "Produksi Sportswear"}
          </h2>
        </div>
        <span className="rounded-md border border-slate-700 px-2 py-1 text-xs font-medium text-slate-300">
          {order.status ?? "FO"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <UserRound size={16} className="text-slate-500" />
          <span>{customer ?? "Customer belum tersedia"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Factory size={16} className="text-slate-500" />
          <span>{quantity ? `${quantity} pcs` : "Qty belum tersedia"}</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className="text-slate-500" />
          <span>{formatDate(String(deadline ?? ""))}</span>
        </div>
      </div>

      {progress !== undefined ? (
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs text-slate-400">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-cyan-400"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      {order.notes ? (
        <p className="mt-4 border-t border-slate-800 pt-4 text-sm leading-6 text-slate-400">
          {order.notes}
        </p>
      ) : null}
    </article>
  );
}
