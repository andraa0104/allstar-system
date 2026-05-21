"use client";

import { useMutation } from "@tanstack/react-query";
import { Save, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { clearSession, getSession, setSession } from "@/lib/session";
import type { SessionUser } from "@/lib/types";

export function ProfileSettings() {
  const [session, setLocalSession] = useState<SessionUser | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      const user = getSession();
      setLocalSession(user);
    });
  }, []);

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
      setMessage("Profil berhasil diperbarui.");
    },
  });

  const deleteAccount = useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => {
      clearSession();
      window.location.href = "/login";
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    const form = new FormData(event.currentTarget);
    updateProfile.mutate({
      id: session.id,
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      username: String(form.get("username") ?? ""),
    });
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="text-base font-semibold text-white">Profile</h2>
      <p className="mt-1 text-sm text-slate-400">
        Kelola identitas akun untuk validasi backend.
      </p>

      <form className="mt-5 grid gap-4" onSubmit={submit}>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-slate-200">Name</span>
          <input
            name="name"
            defaultValue={session?.name}
            className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-cyan-400"
            required
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-slate-200">Phone</span>
          <input
            name="phone"
            defaultValue={session?.phone}
            className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-cyan-400"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-slate-200">Username</span>
          <input
            name="username"
            defaultValue={session?.username}
            className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-cyan-400"
            required
          />
        </label>

        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {updateProfile.error ? (
          <p className="text-sm text-red-300">{updateProfile.error.message}</p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
            disabled={updateProfile.isPending}
          >
            <Save size={17} />
            Save Profile
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-400/40 px-4 text-sm font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-60"
            disabled={!session || deleteAccount.isPending}
            onClick={() => session && deleteAccount.mutate(session.id)}
          >
            <Trash2 size={17} />
            Delete Account
          </button>
        </div>
      </form>
    </section>
  );
}
