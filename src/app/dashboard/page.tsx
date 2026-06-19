import { Activity, Archive, ClipboardList, Timer } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SalesChart } from "@/components/dashboard/sales-chart";

const stats = [
  { label: "Pending Inquiries", value: "-", icon: ClipboardList },
  { label: "Active Deadlines", value: "-", icon: Timer },
  { label: "Completed Archives", value: "-", icon: Archive },
  { label: "Production Health", value: "Ready", icon: Activity },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Ringkasan performa produksi AllStar."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <section
              className="rounded-lg border border-slate-800 bg-slate-900/70 p-5"
              key={stat.label}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{stat.label}</p>
                <Icon size={18} className="text-cyan-300" />
              </div>
              <p className="mt-5 text-3xl font-semibold text-white">
                {stat.value}
              </p>
            </section>
          );
        })}
      </div>

      <div className="mt-5">
        <SalesChart />
      </div>
    </>
  );
}
