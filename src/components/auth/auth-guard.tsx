"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/session";
import type { SessionUser } from "@/lib/types";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const session = getSession();
      setUser(session);
      setIsReady(true);

      if (!session && pathname !== "/login") {
        router.replace("/login");
      }

      if (session && pathname === "/login") {
        router.replace("/dashboard");
      }
    });
  }, [pathname, router]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-300">
        Memuat sesi...
      </div>
    );
  }

  if (!user && pathname !== "/login") {
    return null;
  }

  return children;
}
