"use client";

import clsx from "clsx";
import { LogOut, Menu, PanelLeftClose, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { navigation } from "@/lib/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
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

  // Fetch live permissions for the logged-in user to dynamically control sidebar menu visibility
  const { data: userPerms } = useQuery({
    queryKey: ["my-permissions", user?.id],
    queryFn: () => api.getPermissions(user?.id),
    enabled: !!user?.id,
  });

  // Fetch live profile to obtain LastOnline timestamp fresh from the database
  const { data: profileSync } = useQuery({
    queryKey: ["app-shell-profile-sync", user?.username],
    queryFn: () => api.getAccounts({ search: user?.username }),
    enabled: !!user?.username,
  });

  const myProfile = profileSync?.items?.find(
    (u) => u.pengguna.toLowerCase() === user?.username?.toLowerCase()
  );
  const lastOnlineVal = myProfile?.LastOnline ? myProfile.LastOnline : null;

  // Sync LastOnline automatically on browser or tab close
  useEffect(() => {
    if (!user?.id) return;

    const handleUnload = () => {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/auth/logout`;
      const blob = new Blob([JSON.stringify({ id: user.id })], { type: "application/json" });
      navigator.sendBeacon(url, blob);
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [user]);

  async function logout() {
    if (user?.id) {
      try {
        await api.logout(user.id);
      } catch (err) {
        console.error("Gagal update last online di server:", err);
      }
    }
    clearSession();
    window.location.href = "/login";
  }

  // Filter helper based on V (View) permission or default fallbacks
  const hasMenuAccess = (label: string) => {
    if (!user) return false;
    // Admins are superusers and always have absolute menu access
    if (user.role.toLowerCase() === "admin") return true;

    if (!userPerms?.permissions) {
      return true;
    }
    const modulePerms = userPerms.permissions[label];
    return !!modulePerms?.V;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-800 bg-slate-950/98 transition-transform duration-200",
          isSidebarVisible ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center border-b border-slate-800 px-5">
          <a href="/dashboard" className="flex items-center gap-3">
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
          </a>
        </div>

        <nav className="space-y-1 px-4 py-5">
          {navigation
            .filter((item) => hasMenuAccess(item.label))
            .map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <a
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
                </a>
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
          </div>

          <div className="flex items-center gap-3">
            {lastOnlineVal && (
              <div className="text-right border-r border-slate-800 pr-3 select-none">
                <p className="text-[8px] sm:text-[9px] uppercase font-semibold text-slate-500 tracking-wider">Last Online (WITA)</p>
                <p className="text-[10px] sm:text-xs text-slate-400 font-mono font-medium">{lastOnlineVal}</p>
              </div>
            )}
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
