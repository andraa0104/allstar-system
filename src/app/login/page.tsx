"use client";

import { useMutation } from "@tanstack/react-query";
import { Eye, LockKeyhole, LogIn, UserRound } from "lucide-react";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const login = useMutation({
    mutationFn: api.login,
    onSuccess: (user) => {
      setSession(user);
      router.replace("/dashboard");
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    login.mutate({
      username: String(form.get("username") ?? ""),
      password: String(form.get("password") ?? ""),
    });
  }

  return (
    <main className="flex min-h-screen bg-slate-950 text-white">
      <section className="hidden flex-1 border-r border-slate-800 bg-slate-900/40 px-10 py-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-lg bg-white p-1.5">
            <Image
              src="/allstar-logo.jpg"
              alt="AllStar logo"
              width={42}
              height={42}
              className="h-full w-full object-contain"
              priority
            />
          </span>
          <div>
            <p className="font-semibold">AllStar</p>
            <p className="text-sm text-slate-400">Textile & Sportswear</p>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
            Integrated Management System
          </p>
          <h1 className="text-5xl font-semibold leading-tight tracking-tight">
            Platform operasional terpadu untuk pertumbuhan AllStar.
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-400">
            Sistem ini disiapkan untuk mengelola proses bisnis inti secara
            bertahap, mulai dari produksi, akun pengguna, kontrol akses, hingga
            modul operasional lain yang akan dikembangkan.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          {["Modular", "Scalable", "Role-Based"].map((item) => (
            <div className="rounded-lg border border-slate-800 p-4" key={item}>
              <p className="font-medium text-slate-200">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30">
          <div className="mb-8">
            <div className="mb-5 flex size-14 items-center justify-center rounded-lg bg-white p-2 lg:hidden">
              <Image
                src="/allstar-logo.jpg"
                alt="AllStar logo"
                width={48}
                height={48}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Masuk ke AllStar
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Akses sistem manajemen internal menggunakan akun yang terdaftar.
            </p>
          </div>

          <form className="grid gap-4" onSubmit={submit}>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-200">Username</span>
              <div className="flex h-11 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 focus-within:border-cyan-400">
                <UserRound size={17} className="text-slate-500" />
                <input
                  name="username"
                  className="w-full bg-transparent text-white outline-none"
                  autoComplete="username"
                  required
                />
              </div>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-200">Password</span>
              <div className="flex h-11 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 focus-within:border-cyan-400">
                <LockKeyhole size={17} className="text-slate-500" />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="w-full bg-transparent text-white outline-none"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  aria-label="Tampilkan password"
                  className="text-slate-500 hover:text-slate-200"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  <Eye size={17} />
                </button>
              </div>
            </label>

            {login.error ? (
              <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {login.error.message}
              </p>
            ) : null}

            <button
              className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
              disabled={login.isPending}
            >
              <LogIn size={17} />
              {login.isPending ? "Memproses..." : "Login"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
