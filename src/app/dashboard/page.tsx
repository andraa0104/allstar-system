"use client";

import { useEffect, useState } from "react";
import { Activity, Archive, ClipboardList, Timer } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { EmployeeSalaryCard } from "@/components/dashboard/employee-salary-card";
import { getSession, isAdmin } from "@/lib/session";
import type { SessionUser } from "@/lib/types";

const stats = [
  { label: "Pending Inquiries", value: "-", icon: ClipboardList },
  { label: "Active Deadlines", value: "-", icon: Timer },
  { label: "Completed Archives", value: "-", icon: Archive },
  { label: "Production Health", value: "Ready", icon: Activity },
];

export default function DashboardPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getSession());
    setMounted(true);
  }, []);

  // For roles other than admin, show the salary card
  const isUserAdmin = mounted ? isAdmin(user) : false;
  const showSalaryCard = mounted && !!user && !isUserAdmin;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={
          showSalaryCard
            ? `Selamat datang, ${user?.name || user?.username}. Berikut ringkasan performa dan informasi kompensasi Anda.`
            : "Ringkasan performa produksi AllStar."
        }
      />

      {/* Salary Card for non-admin roles */}
      {showSalaryCard && (
        <EmployeeSalaryCard user={user} />
      )}

      {/* Production stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <section
              className="rounded-lg border border-slate-800 bg-slate-900/70 p-5 shadow-sm transition-all hover:shadow-md"
              key={stat.label}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Icon size={18} />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-white font-mono">
                {stat.value}
              </p>
            </section>
          );
        })}
      </div>

      <div className="mt-6">
        <SalesChart />
      </div>
    </>
  );
}
