"use client";

import { useMutation } from "@tanstack/react-query";
import { KeyRound, Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { clearSession, getSession } from "@/lib/session";

export function SecuritySettings() {
  const [userId, setUserId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    queueMicrotask(() => setUserId(getSession()?.id ?? ""));
  }, []);

  const mutation = useMutation({
    mutationFn: api.changePassword,
    onSuccess: () => {
      setSuccessMessage("Password berhasil diubah. Mengalihkan ke halaman login...");
      setErrorMessage("");
      setTimeout(() => {
        clearSession();
        window.location.href = "/login";
      }, 2000);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Gagal mengubah password.");
      setSuccessMessage("");
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;

    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    // Validations:
    if (newPassword === currentPassword) {
      setErrorMessage("Password baru tidak boleh sama dengan password saat ini.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Konfirmasi password baru tidak cocok.");
      return;
    }

    setErrorMessage("");
    mutation.mutate({
      id: userId,
      currentPassword,
      newPassword,
    });
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-md shadow-xl shadow-slate-950/20 max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4 mb-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
          <KeyRound size={20} />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Change Password</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Amankan akun Anda dengan mengganti password secara berkala.
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={submit}>
        {/* Current Password */}
        <label className="grid gap-1.5 text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider">
            Current Password
          </span>
          <input
            name="currentPassword"
            type="password"
            placeholder="Masukkan password saat ini"
            className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400 transition-all duration-300 placeholder:text-slate-600"
            required
          />
        </label>

        {/* New Password */}
        <label className="grid gap-1.5 text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider">
            New Password
          </span>
          <input
            name="newPassword"
            type="password"
            placeholder="Masukkan password baru"
            className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400 transition-all duration-300 placeholder:text-slate-600"
            required
          />
        </label>

        {/* Confirm New Password */}
        <label className="grid gap-1.5 text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider">
            Confirm New Password
          </span>
          <input
            name="confirmPassword"
            type="password"
            placeholder="Konfirmasi password baru"
            className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400 transition-all duration-300 placeholder:text-slate-600"
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
            disabled={mutation.isPending || !userId}
          >
            <Save size={15} />
            Save Password
          </button>
        </div>
      </form>
    </section>
  );
}
