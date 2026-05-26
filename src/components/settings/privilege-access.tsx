"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ShieldCheck, User, Save, Lock, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { AdminAccount } from "@/lib/types";

const MODULE_OPTIONS = [
  "Dashboard",
  "Production Pipeline",
  "System Settings",
];

const PERMISSION_FLAGS = [
  { flag: "V", label: "View (V)", desc: "Melihat & mengakses menu" },
  { flag: "C", label: "Create (C)", desc: "Membuat data baru" },
  { flag: "U", label: "Update (U)", desc: "Mengubah/mengedit data" },
  { flag: "D", label: "Delete (D)", desc: "Menghapus data" },
];

export function PrivilegeAccess() {
  const [selectedKdUser, setSelectedKdUser] = useState("");
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Get all users for the dropdown
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["all-users-list"],
    queryFn: () => api.getAccounts({ limit: 100000 }), // Get all users for dropdown
  });

  const users: AdminAccount[] = usersData?.items ?? [];

  // Get permissions for selected user
  const { data: permissionData, isLoading: isLoadingPermissions, refetch } = useQuery({
    queryKey: ["user-permissions", selectedKdUser],
    queryFn: () => api.getPermissions(selectedKdUser),
    enabled: !!selectedKdUser,
  });

  // Sync permissions when query returns
  useEffect(() => {
    if (permissionData?.permissions) {
      setPermissionsMatrix(permissionData.permissions);
    } else {
      // Default empty state
      const defaultState: Record<string, Record<string, boolean>> = {};
      MODULE_OPTIONS.forEach((mod) => {
        defaultState[mod] = { V: false, C: false, U: false, D: false };
      });
      setPermissionsMatrix(defaultState);
    }
  }, [permissionData]);

  // Save permissions mutation
  const savePermissionsMutation = useMutation({
    mutationFn: (payload: { kd_user: string; permissions: Record<string, Record<string, boolean>> }) =>
      api.updatePermissions(payload),
    onSuccess: (res) => {
      setSuccessMsg(res.message || "Privilege access berhasil diubah.");
      setErrorMsg("");
      refetch();
      setTimeout(() => setSuccessMsg(""), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Gagal menyimpan privilege access.");
    },
  });

  // Toggle helper
  const handleToggle = (module: string, flag: string) => {
    setPermissionsMatrix((prev) => {
      const modulePerms = prev[module] || { V: false, C: false, U: false, D: false };
      return {
        ...prev,
        [module]: {
          ...modulePerms,
          [flag]: !modulePerms[flag],
        },
      };
    });
  };

  const handleSave = () => {
    if (!selectedKdUser) return;
    savePermissionsMutation.mutate({
      kd_user: selectedKdUser,
      permissions: permissionsMatrix,
    });
  };

  return (
    <div className="space-y-5">
      {/* Selector card */}
      <section className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-6 backdrop-blur-md shadow-xl max-w-3xl mx-auto w-full">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800/80 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Privilege Access Control</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Atur otorisasi akses menu (CRUD) berdasarkan user yang dipilih.
              </p>
            </div>
          </div>

          {/* User selector dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 hidden sm:inline">
              Pilih User:
            </label>
            <div className="relative flex items-center bg-slate-950 px-3 h-10 rounded-lg border border-slate-700 w-full sm:w-64">
              <User size={14} className="text-slate-500 mr-2" />
              <select
                value={selectedKdUser}
                onChange={(e) => {
                  setSelectedKdUser(e.target.value);
                  setSuccessMsg("");
                  setErrorMsg("");
                }}
                className="bg-transparent text-xs text-slate-200 outline-none w-full cursor-pointer font-medium"
              >
                <option value="" className="bg-slate-950">-- Pilih Pengguna --</option>
                {isLoadingUsers ? (
                  <option disabled className="bg-slate-950">Loading users...</option>
                ) : (
                  users.map((u) => (
                    <option key={u.kd_user} value={u.kd_user} className="bg-slate-950">
                      {u.kd_user} - {u.nm_user} ({u.tingkat})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Global messages inside */}
        {successMsg && (
          <div className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-3 text-xs text-emerald-400 font-semibold animate-pulse">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 rounded-lg bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-400 font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Permissions Grid */}
        {!selectedKdUser ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 border border-dashed border-slate-800 rounded-lg bg-slate-950/20">
            <Lock size={32} className="text-slate-700 mb-3 animate-pulse" />
            <span className="text-xs font-semibold text-slate-400">Pilih pengguna untuk mengatur hak akses menu</span>
          </div>
        ) : isLoadingPermissions ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-3"></div>
            <span className="text-xs">Memuat hak akses user...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {MODULE_OPTIONS.map((module) => {
              const modulePerms = permissionsMatrix[module] || { V: false, C: false, U: false, D: false };
              return (
                <div key={module} className="rounded-xl border border-slate-800 bg-slate-950/50 overflow-hidden shadow-inner">
                  {/* Module header */}
                  <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-3 border-b border-slate-800">
                    <Settings size={14} className="text-cyan-400" />
                    <span className="text-xs font-bold text-slate-200">{module}</span>
                  </div>

                  {/* Matrix Checkboxes */}
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {PERMISSION_FLAGS.map(({ flag, label, desc }) => {
                      const isChecked = !!modulePerms[flag];
                      return (
                        <label
                          key={flag}
                          className={`flex flex-col p-3 rounded-lg border transition cursor-pointer select-none ${
                            isChecked
                              ? "bg-cyan-500/5 border-cyan-500/30 text-white"
                              : "bg-slate-900/20 border-slate-800/80 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggle(module, flag)}
                              className="size-4 rounded border-slate-700 bg-slate-950 text-cyan-400 focus:ring-0 focus:ring-offset-0 accent-cyan-400 cursor-pointer"
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 leading-tight">
                            {desc}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Save bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                {permissionData?.updated_at ? (
                  <>
                    <span>Terakhir diupdate:</span>
                    <span className="font-semibold text-slate-300">
                      {new Date(permissionData.updated_at).toLocaleString("id-ID")}
                    </span>
                  </>
                ) : (
                  <span>Belum ada privilege khusus (menggunakan default sistem)</span>
                )}
              </div>

              <button
                onClick={handleSave}
                disabled={savePermissionsMutation.isPending}
                className="h-10 px-5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-cyan-500/10"
              >
                <Save size={15} />
                {savePermissionsMutation.isPending ? "Menyimpan..." : "Save Privilege"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
