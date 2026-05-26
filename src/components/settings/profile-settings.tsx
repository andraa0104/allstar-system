"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Save, User, Phone, Shield, Hash, FileText } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getSession, setSession } from "@/lib/session";
import type { SessionUser } from "@/lib/types";

export function ProfileSettings() {
  const [session, setLocalSession] = useState<SessionUser | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      const user = getSession();
      setLocalSession(user);
    });
  }, []);

  // Self-healing check: Query database for live user credentials
  const { data: dbUserData } = useQuery({
    queryKey: ["live-profile-sync", session?.username],
    queryFn: () => api.getAccounts({ search: session?.username }),
    enabled: !!session?.username,
  });

  useEffect(() => {
    if (session && dbUserData?.items) {
      const dbUser = dbUserData.items.find(
        (u) => u.pengguna.toLowerCase() === session.username.toLowerCase()
      );
      if (dbUser) {
        const isIdMismatch = session.id !== dbUser.kd_user;
        const isRoleMismatch = session.role.toLowerCase() !== dbUser.tingkat.toLowerCase();

        if (isIdMismatch || isRoleMismatch) {
          const nextSession = {
            ...session,
            id: dbUser.kd_user,
            role: dbUser.tingkat.toLowerCase(),
            name: dbUser.nm_user,
            phone: dbUser.no_hp,
          };
          setSession(nextSession);
          setLocalSession(nextSession);
          // Auto-reload to immediately propagate admin privileges & tabs
          window.location.reload();
        }
      }
    }
  }, [dbUserData, session]);

  const updateProfile = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: (_, variables) => {
      if (!session) return;
      const nextSession = {
        ...session,
        name: variables.name,
        phone: variables.phone,
        username: variables.username,
      };
      setSession(nextSession);
      setLocalSession(nextSession);
      setSuccessMessage("Data berhasil disimpan.");
      setErrorMessage("");
      setTimeout(() => setSuccessMessage(""), 4000);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Gagal menyimpan perubahan.");
      setSuccessMessage("");
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    const form = new FormData(event.currentTarget);
    updateProfile.mutate({
      id: session.id,
      name: String(form.get("name") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      username: String(form.get("username") ?? "").trim(),
    });
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-md shadow-xl shadow-slate-950/20 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4 mb-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
          <User size={20} />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Detail Account</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola profil pribadi dan identitas akun Anda di sistem.
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Kode User (Read-only) */}
          <label className="grid gap-1.5 text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Hash size={13} className="text-slate-500" />
              Kode User
            </span>
            <input
              value={session.id}
              disabled
              className="h-10 rounded-lg border border-slate-800 bg-slate-950/50 px-3 text-slate-500 font-mono text-xs cursor-not-allowed select-none outline-none font-semibold uppercase tracking-wider"
            />
          </label>

          {/* Role (Read-only) */}
          <label className="grid gap-1.5 text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Shield size={13} className="text-slate-500" />
              Role
            </span>
            <input
              value={session.role.toUpperCase()}
              disabled
              className="h-10 rounded-lg border border-slate-800 bg-slate-950/50 px-3 text-slate-500 font-semibold text-xs cursor-not-allowed select-none outline-none"
            />
          </label>
        </div>

        {/* Nama Lengkap */}
        <label className="grid gap-1.5 text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={13} className="text-slate-400" />
            Nama Lengkap
          </span>
          <input
            name="name"
            defaultValue={session.name}
            placeholder="Masukkan nama lengkap"
            className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400 transition-all duration-300 placeholder:text-slate-600 font-semibold"
            required
          />
        </label>

        {/* No HP */}
        <label className="grid gap-1.5 text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Phone size={13} className="text-slate-400" />
            No HP
          </span>
          <input
            name="phone"
            defaultValue={session.phone}
            placeholder="Masukkan nomor handphone"
            className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400 transition-all duration-300 placeholder:text-slate-600 font-semibold"
          />
        </label>

        {/* Username */}
        <label className="grid gap-1.5 text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <User size={13} className="text-slate-400" />
            Username
          </span>
          <input
            name="username"
            defaultValue={session.username}
            placeholder="Masukkan username"
            className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400 transition-all duration-300 placeholder:text-slate-600 font-semibold"
            required
          />
        </label>

        {successMessage && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-3 text-xs text-emerald-400 font-semibold animate-pulse">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-400 font-semibold">
            {errorMessage}
          </div>
        )}

        <div className="pt-2">
          <button
            className="inline-flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-cyan-400 px-5 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-60 transition shadow-lg shadow-cyan-500/10"
            disabled={updateProfile.isPending}
          >
            <Save size={15} />
            Save Profile
          </button>
        </div>
      </form>
    </section>
  );
}
