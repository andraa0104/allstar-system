"use client";

import { useMutation } from "@tanstack/react-query";
import { KeyRound, Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";

export function SecuritySettings() {
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    queueMicrotask(() => setUserId(getSession()?.id ?? ""));
  }, []);

  const mutation = useMutation({
    mutationFn: api.changePassword,
    onSuccess: () => setMessage("Password berhasil diperbarui."),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate({
      id: userId,
      currentPassword: String(form.get("currentPassword") ?? ""),
      newPassword: String(form.get("newPassword") ?? ""),
    });
    event.currentTarget.reset();
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <KeyRound size={18} />
        Security
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        Update password akun yang sedang aktif.
      </p>

      <form className="mt-5 grid gap-4" onSubmit={submit}>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-slate-200">Current Password</span>
          <input
            name="currentPassword"
            type="password"
            className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-cyan-400"
            required
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-slate-200">New Password</span>
          <input
            name="newPassword"
            type="password"
            minLength={6}
            className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-cyan-400"
            required
          />
        </label>

        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {mutation.error ? (
          <p className="text-sm text-red-300">{mutation.error.message}</p>
        ) : null}

        <button
          className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
          disabled={mutation.isPending || !userId}
        >
          <Save size={17} />
          Save Password
        </button>
      </form>
    </section>
  );
}
