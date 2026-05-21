"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, UserPlus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getSession, isAdmin } from "@/lib/session";
import type { PermissionMatrix } from "@/lib/types";

const defaultModules = ["Dashboard", "Pending Inquiries", "Active Deadlines", "Completed Archives", "Settings"];
const defaultRoles = ["admin", "manager", "staff", "production"];

export function AdminPanel() {
  const queryClient = useQueryClient();
  const [canManage, setCanManage] = useState(false);
  const [draft, setDraft] = useState<PermissionMatrix>({});
  const [accountMessage, setAccountMessage] = useState("");

  useEffect(() => {
    queueMicrotask(() => setCanManage(isAdmin(getSession())));
  }, []);

  const permissions = useQuery({
    queryKey: ["permissions"],
    queryFn: api.getPermissions,
    enabled: canManage,
  });

  useEffect(() => {
    queueMicrotask(() => {
      if (permissions.data) {
        setDraft(permissions.data);
        return;
      }

      const initial = Object.fromEntries(
        defaultModules.map((module) => [
          module,
          Object.fromEntries(defaultRoles.map((role) => [role, role === "admin"])),
        ]),
      ) as PermissionMatrix;
      setDraft(initial);
    });
  }, [permissions.data]);

  const addAccount = useMutation({
    mutationFn: api.addAccount,
    onSuccess: () => setAccountMessage("Akun berhasil ditambahkan."),
  });

  const savePermissions = useMutation({
    mutationFn: api.updatePermissions,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["permissions"] }),
  });

  if (!canManage) {
    return null;
  }

  const modules = Object.keys(draft).length ? Object.keys(draft) : defaultModules;
  const roles = Array.from(
    new Set([
      ...defaultRoles,
      ...modules.flatMap((module) => Object.keys(draft[module] ?? {})),
    ]),
  );

  function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    addAccount.mutate({
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      username: String(form.get("username") ?? ""),
      password: String(form.get("password") ?? ""),
      level: String(form.get("level") ?? ""),
    });
    event.currentTarget.reset();
  }

  function toggle(module: string, role: string) {
    setDraft((current) => ({
      ...current,
      [module]: {
        ...(current[module] ?? {}),
        [role]: !(current[module]?.[role] ?? false),
      },
    }));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          <UserPlus size={18} />
          Add Account
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Buat akses operator baru berdasarkan level kerja.
        </p>

        <form className="mt-5 grid gap-4" onSubmit={submitAccount}>
          {[
            ["name", "Name", "text"],
            ["phone", "Phone", "text"],
            ["username", "Username", "text"],
            ["password", "Password", "password"],
          ].map(([name, label, type]) => (
            <label className="grid gap-2 text-sm" key={name}>
              <span className="font-medium text-slate-200">{label}</span>
              <input
                name={name}
                type={type}
                className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-cyan-400"
                required={name !== "phone"}
              />
            </label>
          ))}

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-slate-200">Level</span>
            <select
              name="level"
              className="h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-cyan-400"
            >
              {defaultRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          {accountMessage ? (
            <p className="text-sm text-emerald-300">{accountMessage}</p>
          ) : null}
          {addAccount.error ? (
            <p className="text-sm text-red-300">{addAccount.error.message}</p>
          ) : null}

          <button
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
            disabled={addAccount.isPending}
          >
            <UserPlus size={17} />
            Add Account
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/70">
        <div className="border-b border-slate-800 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <ShieldCheck size={18} />
            Setting Role
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Permission matrix modul terhadap role akun.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-slate-950/60 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Module</th>
                {roles.map((role) => (
                  <th className="px-5 py-3 font-medium" key={role}>
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {modules.map((module) => (
                <tr key={module}>
                  <td className="px-5 py-4 font-medium text-slate-200">
                    {module}
                  </td>
                  {roles.map((role) => (
                    <td className="px-5 py-4" key={`${module}-${role}`}>
                      <input
                        aria-label={`${module} ${role}`}
                        type="checkbox"
                        checked={draft[module]?.[role] ?? false}
                        onChange={() => toggle(module, role)}
                        className="size-4 accent-cyan-400"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
          {savePermissions.error ? (
            <p className="text-sm text-red-300">{savePermissions.error.message}</p>
          ) : (
            <p className="text-sm text-slate-400">
              {permissions.isLoading ? "Memuat matrix..." : "Perubahan disimpan ke API admin."}
            </p>
          )}
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
            disabled={savePermissions.isPending}
            onClick={() => savePermissions.mutate(draft)}
          >
            <ShieldCheck size={17} />
            Save Matrix
          </button>
        </div>
      </section>
    </div>
  );
}
