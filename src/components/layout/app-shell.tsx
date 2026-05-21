"use client";

import clsx from "clsx";
import { LogOut, Menu, PanelLeftClose, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { navigation } from "@/lib/navigation";
import { clearSession, getSession } from "@/lib/session";
import type { SessionUser } from "@/lib/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    queueMicrotask(() => setUser(getSession()));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setIsSidebarVisible(window.matchMedia("(min-width: 1024px)").matches);
    });
  }, []);

  function logout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-800 bg-slate-950/98 transition-transform duration-200",
          isSidebarVisible ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center border-b border-slate-800 px-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-white p-1.5">
              <Image
                src="/allstar-logo.jpg"
                alt="AllStar logo"
                width={38}
                height={38}
                className="h-full w-full object-contain"
                priority
              />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-wide">
                AllStar
              </span>
              <span className="block text-xs text-slate-400">
                Textile & Sportswear
              </span>
            </span>
          </Link>
        </div>

        <nav className="space-y-1 px-4 py-5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/20"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {isSidebarVisible ? (
        <button
          aria-label="Tutup navigasi"
          className="fixed inset-0 z-30 bg-slate-950/70 lg:hidden"
          onClick={() => setIsSidebarVisible(false)}
        />
      ) : null}

      <div
        className={clsx(
          "transition-[padding] duration-200",
          isSidebarVisible ? "lg:pl-72" : "lg:pl-0",
        )}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              aria-label={
                isSidebarVisible ? "Sembunyikan navigasi" : "Buka navigasi"
              }
              className="rounded-md p-2 text-slate-300 hover:bg-slate-900 hover:text-white"
              onClick={() => setIsSidebarVisible((visible) => !visible)}
            >
              {isSidebarVisible ? (
                <PanelLeftClose size={20} />
              ) : (
                <Menu size={20} />
              )}
            </button>
            <div className="hidden h-10 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm text-slate-500 md:flex">
              <Search size={16} />
              <span>FO, customer, deadline</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-white">
                {user?.name || user?.username || "Operator"}
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {user?.role ?? "staff"}
              </p>
            </div>
            <button
              aria-label="Logout"
              className="rounded-lg border border-slate-800 p-2 text-slate-300 hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200"
              onClick={logout}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
