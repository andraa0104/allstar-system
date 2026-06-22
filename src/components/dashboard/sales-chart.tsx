"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";

type ChartData = {
  date_label: string;
  total: number;
  omset: number;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const omsetFormatted = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(data.omset || 0);

    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/95 p-3 shadow-lg">
        <p className="mb-2 text-sm font-semibold text-white">{label}</p>
        <p className="text-sm text-cyan-300">Total FO: <span className="font-medium text-white">{data.total}</span></p>
        <p className="text-sm text-emerald-400">Omset: <span className="font-medium text-white">{omsetFormatted}</span></p>
      </div>
    );
  }
  return null;
};

type RangeOption = "1w" | "1m" | "3m" | "6m" | "1y";

export function SalesChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeOption>("1w");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const response = await api.getSalesChart(range);
        setData(response.data || []);
      } catch (error) {
        console.error("Error fetching sales chart:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [range]);

  const ranges: { label: string; value: RangeOption }[] = [
    { label: "1 Minggu", value: "1w" },
    { label: "1 Bulan", value: "1m" },
    { label: "3 Bulan", value: "3m" },
    { label: "6 Bulan", value: "6m" },
    { label: "1 Tahun", value: "1y" },
  ];

  return (
    <section className="mt-5 rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Grafik Penjualan</h2>
          <p className="text-sm text-slate-400">Total Form Order berdasarkan waktu</p>
        </div>
        <div className="flex w-full overflow-x-auto rounded-lg bg-slate-800/50 p-1 sm:w-auto no-scrollbar">
          <div className="flex w-max min-w-full">
            {ranges.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all flex-1 sm:flex-none ${
                  range === r.value
                    ? "bg-cyan-500/20 text-cyan-300 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[350px] w-full sm:h-[300px]">
        {loading ? (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          </div>
        ) : data.length > 0 ? (
          <>
            {/* Desktop View */}
            <div className="hidden h-full w-full sm:block">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ top: 25, right: 10, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--slate-800)" vertical={false} />
                  <XAxis
                    dataKey="date_label"
                    stroke="var(--slate-500)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                    minTickGap={20}
                  />
                  <YAxis
                    stroke="var(--slate-500)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total FO"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                  >
                    <LabelList dataKey="total" position="top" fill="var(--cyan-400)" fontSize={10} />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Mobile/Tablet View */}
            <div className="block h-full w-full sm:hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--slate-800)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="date_label"
                    type="category"
                    stroke="var(--slate-500)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip cursor={{ fill: "var(--slate-800)", opacity: 0.5 }} content={<CustomTooltip />} />
                  <Bar
                    dataKey="total"
                    name="Total FO"
                    fill="#06b6d4"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                  >
                    <LabelList dataKey="total" position="right" fill="var(--cyan-400)" fontSize={10} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <p className="text-sm text-slate-500">Tidak ada data untuk rentang waktu ini.</p>
          </div>
        )}
      </div>
    </section>
  );
}
