"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  Phone,
  KeyRound,
  Hash,
  FileText
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { AdminAccount } from "@/lib/types";

const ROLE_OPTIONS = [
  "Admin",
  "User-Penjualan",
  "User-Marketing",
  "Tukang-Print",
  "Tukang-Press",
  "Tukang-Desain",
  "Tukang-QC",
  "Tukang-Layout",
  "Tukang-Cutting",
  "Tukang-LayaniCS",
  "Tukang-PressDTF",
  "Pengawas",
];

export function UserManagement() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  // Filter, sort, pagination states
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sortBy, setSortBy] = useState("kd_user");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminAccount | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Get current user session
  useEffect(() => {
    queueMicrotask(() => {
      const user = getSession();
      if (user) {
        setCurrentUser({ id: user.id });
      }
    });
  }, []);

  // Fetch users with React Query
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page, limit, search, roleFilter, sortBy, sortOrder],
    queryFn: () =>
      api.getAccounts({
        page,
        limit,
        search,
        role: roleFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
  });

  const users: AdminAccount[] = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.count ?? 0;

  // Mutation for adding a user
  const addUserMutation = useMutation({
    mutationFn: api.addAccount,
    onSuccess: (res) => {
      setSuccessMsg(res.message || "User berhasil ditambahkan.");
      setErrorMsg("");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setTimeout(() => {
        setIsAddOpen(false);
        setSuccessMsg("");
      }, 1500);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Gagal menambahkan user.");
    },
  });

  // Mutation for editing a user
  const editUserMutation = useMutation({
    mutationFn: api.updateAccount,
    onSuccess: (res) => {
      setSuccessMsg(res.message || "Data user berhasil diubah.");
      setErrorMsg("");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setTimeout(() => {
        setIsEditOpen(false);
        setEditingUser(null);
        setSuccessMsg("");
      }, 1500);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Gagal mengubah data user.");
    },
  });

  // Mutation for deleting a user
  const deleteUserMutation = useMutation({
    mutationFn: (kd_user: string) => api.deleteAccount(kd_user),
    onSuccess: (res) => {
      setSuccessMsg(res.message || "User berhasil dihapus.");
      setErrorMsg("");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setTimeout(() => setSuccessMsg(""), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Gagal menghapus user.");
      setTimeout(() => setErrorMsg(""), 4000);
    },
  });

  // Trigger sorting
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Submit Add form
  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addUserMutation.mutate({
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      username: String(formData.get("username") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      level: String(formData.get("role") ?? ""),
    });
  };

  // Submit Edit form
  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    const formData = new FormData(e.currentTarget);
    editUserMutation.mutate({
      kd_user: editingUser.kd_user,
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      username: String(formData.get("username") ?? "").trim(),
      level: String(formData.get("role") ?? ""),
    });
  };

  // Delete handler
  const handleDelete = (user: AdminAccount) => {
    if (currentUser && user.kd_user === currentUser.id) {
      alert("Anda tidak dapat menghapus akun Anda sendiri.");
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus user ${user.nm_user} (${user.kd_user})?`)) {
      deleteUserMutation.mutate(user.kd_user);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 backdrop-blur-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-500" />
          <input
            type="text"
            placeholder="Cari nama, username, atau kode user..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-700 bg-slate-950/60 text-xs text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-all placeholder:text-slate-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Role Filter */}
          <div className="relative flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950/60 px-3 h-10 rounded-lg border border-slate-700">
            <Filter size={14} className="text-slate-500" />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-slate-200 outline-none pr-2 cursor-pointer font-medium"
            >
              <option value="" className="bg-slate-950">Semua Role</option>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt} value={opt.toLowerCase()} className="bg-slate-950">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Add user button */}
          <button
            onClick={() => {
              setErrorMsg("");
              setSuccessMsg("");
              setIsAddOpen(true);
            }}
            className="h-10 px-4 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-cyan-500/10"
          >
            <UserPlus size={15} />
            Add New User
          </button>
        </div>
      </div>

      {/* Global alert messages */}
      {successMsg && !isAddOpen && !isEditOpen && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400 font-semibold animate-pulse">
          {successMsg}
        </div>
      )}

      {errorMsg && !isAddOpen && !isEditOpen && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Table grid */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 overflow-hidden backdrop-blur-md shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th
                  onClick={() => handleSort("kd_user")}
                  className="px-5 py-3.5 cursor-pointer hover:bg-slate-900/50 hover:text-white transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    Kode User
                    <ArrowUpDown size={12} className="text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("nm_user")}
                  className="px-5 py-3.5 cursor-pointer hover:bg-slate-900/50 hover:text-white transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    Nama Lengkap
                    <ArrowUpDown size={12} className="text-slate-500" />
                  </div>
                </th>
                <th className="px-5 py-3.5 text-slate-400">No HP</th>
                <th className="px-5 py-3.5 text-slate-400">Username</th>
                <th
                  onClick={() => handleSort("tingkat")}
                  className="px-5 py-3.5 cursor-pointer hover:bg-slate-900/50 hover:text-white transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    Role
                    <ArrowUpDown size={12} className="text-slate-500" />
                  </div>
                </th>
                <th className="px-5 py-3.5 text-right text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                      <span>Memuat data pengguna...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    Tidak ada pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.kd_user}
                    className="hover:bg-slate-800/20 transition-all duration-200"
                  >
                    <td className="px-5 py-4 font-mono text-cyan-400 font-medium">
                      {user.kd_user}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-100">
                      {user.nm_user}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {user.no_hp || "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-300 font-mono">
                      {user.pengguna}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-950 border border-slate-800 text-slate-400">
                        {user.tingkat}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setErrorMsg("");
                            setSuccessMsg("");
                            setIsEditOpen(true);
                          }}
                          className="p-1.5 rounded bg-slate-800/50 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition"
                          title="Edit User"
                        >
                          <Edit2 size={13.5} />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={currentUser?.id === user.kd_user}
                          className={`p-1.5 rounded bg-slate-800/50 transition ${
                            currentUser?.id === user.kd_user
                              ? "opacity-30 cursor-not-allowed text-slate-600"
                              : "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                          }`}
                          title={currentUser?.id === user.kd_user ? "Tidak bisa menghapus diri sendiri" : "Hapus User"}
                        >
                          <Trash2 size={13.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {!isLoading && users.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-t border-slate-800 bg-slate-950/20 text-xs text-slate-400">
            <div>
              Menampilkan <span className="font-semibold text-slate-200">{users.length}</span> dari{" "}
              <span className="font-semibold text-slate-200">{totalCount}</span> user
            </div>

            <div className="flex items-center gap-4">
              {/* Rows Per Page */}
              <div className="flex items-center gap-2">
                <span>Rows:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Prev / Next Page */}
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2">
                  Page <span className="font-semibold text-slate-200">{page}</span> of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADD USER MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <div className="flex items-center gap-2 text-cyan-400">
                <UserPlus size={18} />
                <h3 className="text-sm font-bold text-white">Add New User</h3>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* Note: Kode User is auto generated on backend */}
              <label className="grid gap-1 text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Hash size={13} className="text-slate-500" />
                  Kode User
                </span>
                <input
                  value="AUTO-GENERATED"
                  disabled
                  className="h-9 rounded-lg border border-slate-800 bg-slate-950/50 px-3 text-slate-500 font-mono text-xs cursor-not-allowed select-none outline-none"
                />
              </label>

              {/* Nama Lengkap */}
              <label className="grid gap-1 text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={13} className="text-slate-500" />
                  Nama Lengkap
                </span>
                <input
                  name="name"
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400 transition"
                  required
                />
              </label>

              {/* No HP */}
              <label className="grid gap-1 text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Phone size={13} className="text-slate-500" />
                  No HP
                </span>
                <input
                  name="phone"
                  type="text"
                  placeholder="Contoh: 08123456789"
                  className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400 transition"
                  required
                />
              </label>

              {/* Username */}
              <label className="grid gap-1 text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <User size={13} className="text-slate-500" />
                  Username
                </span>
                <input
                  name="username"
                  type="text"
                  placeholder="Masukkan username"
                  className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400 transition"
                  required
                />
              </label>

              {/* Dropdown Role */}
              <label className="grid gap-1 text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={13} className="text-slate-500" />
                  Role
                </span>
                <select
                  name="role"
                  className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 outline-none focus:border-cyan-400 transition cursor-pointer"
                  required
                >
                  <option value="">Pilih Role</option>
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt.toLowerCase()}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              {/* Password */}
              <label className="grid gap-1 text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound size={13} className="text-slate-500" />
                  Password
                </span>
                <input
                  name="password"
                  type="password"
                  placeholder="Masukkan password awal"
                  className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400 transition"
                  required
                />
              </label>

              {successMsg && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-2.5 text-xs text-emerald-400 font-semibold animate-pulse">
                  {successMsg}
                </div>
              )}

              {errorMsg && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/25 p-2.5 text-xs text-rose-400 font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="h-9 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addUserMutation.isPending}
                  className="h-9 px-4 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-cyan-500/10"
                >
                  <Save size={14} />
                  {addUserMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {isEditOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <div className="flex items-center gap-2 text-cyan-400">
                <Edit2 size={16} />
                <h3 className="text-sm font-bold text-white">Edit User Data</h3>
              </div>
              <button
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingUser(null);
                }}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Kode User (Read-only) */}
              <label className="grid gap-1 text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Hash size={13} className="text-slate-500" />
                  Kode User
                </span>
                <input
                  value={editingUser.kd_user}
                  disabled
                  className="h-9 rounded-lg border border-slate-800 bg-slate-950/50 px-3 text-slate-500 font-mono text-xs cursor-not-allowed select-none outline-none"
                />
              </label>

              {/* Nama Lengkap */}
              <label className="grid gap-1 text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={13} className="text-slate-500" />
                  Nama Lengkap
                </span>
                <input
                  name="name"
                  type="text"
                  defaultValue={editingUser.nm_user}
                  placeholder="Masukkan nama lengkap"
                  className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400 transition"
                  required
                />
              </label>

              {/* No HP */}
              <label className="grid gap-1 text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Phone size={13} className="text-slate-500" />
                  No HP
                </span>
                <input
                  name="phone"
                  type="text"
                  defaultValue={editingUser.no_hp}
                  placeholder="Contoh: 08123456789"
                  className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400 transition"
                  required
                />
              </label>

              {/* Username */}
              <label className="grid gap-1 text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <User size={13} className="text-slate-500" />
                  Username
                </span>
                <input
                  name="username"
                  type="text"
                  defaultValue={editingUser.pengguna}
                  placeholder="Masukkan username"
                  className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400 transition"
                  required
                />
              </label>

              {/* Dropdown Role */}
              <label className="grid gap-1 text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={13} className="text-slate-500" />
                  Role
                </span>
                <select
                  name="role"
                  defaultValue={editingUser.tingkat.toLowerCase()}
                  className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 outline-none focus:border-cyan-400 transition cursor-pointer"
                  required
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt.toLowerCase()}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              {successMsg && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-2.5 text-xs text-emerald-400 font-semibold animate-pulse">
                  {successMsg}
                </div>
              )}

              {errorMsg && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/25 p-2.5 text-xs text-rose-400 font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingUser(null);
                  }}
                  className="h-9 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editUserMutation.isPending}
                  className="h-9 px-4 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-cyan-500/10"
                >
                  <Save size={14} />
                  {editUserMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
