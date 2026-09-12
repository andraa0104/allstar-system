"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  DollarSign,
  Tag,
  AlertTriangle,
  Search,
  RefreshCw,
  BadgeDollarSign,
} from "lucide-react";
import { api } from "@/lib/api";
import type { KategoriPakaian, TarifUpah } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildTree(flat: KategoriPakaian[]): KategoriPakaian[] {
  const map = new Map<number, KategoriPakaian>();
  const roots: KategoriPakaian[] = [];
  flat.forEach((item) => map.set(item.id, { ...item, children: [] }));
  flat.forEach((item) => {
    const node = map.get(item.id)!;
    if (item.parent_id === null || item.parent_id === undefined) {
      roots.push(node);
    } else {
      const parent = map.get(item.parent_id);
      if (parent) parent.children!.push(node);
    }
  });
  return roots;
}

function buildBreadcrumb(flat: KategoriPakaian[], targetId: number): string {
  const map = new Map<number, KategoriPakaian>();
  flat.forEach((item) => map.set(item.id, item));
  const parts: string[] = [];
  let cur = map.get(targetId);
  while (cur) {
    parts.unshift(cur.nama);
    cur = cur.parent_id != null ? map.get(cur.parent_id) : undefined;
  }
  return parts.join(" / ");
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatInputNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

function parseInputNumber(formatted: string): number {
  return parseInt(formatted.replace(/\./g, "").replace(/\D/g, "")) || 0;
}

// ─── Toast ─────────────────────────────────────────────────────────────────

type Toast = { id: number; type: "success" | "error"; message: string };
let toastIdCounter = 0;

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((type: "success" | "error", message: string) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);
  return { toasts, show };
}

// ─── Autocomplete Input ────────────────────────────────────────────────────

function AutocompleteInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (value.trim().length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await api.suggestWageCategories(value.trim());
        setSuggestions(res.suggestions || []);
        setOpen((res.suggestions?.length ?? 0) > 0);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [value]);

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder || "Nama kategori..."}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
          {suggestions.map((s) => (
            <li
              key={s}
              onMouseDown={() => {
                onChange(s);
                setOpen(false);
              }}
              className="cursor-pointer px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Tree Node ─────────────────────────────────────────────────────────────

function TreeNode({
  node,
  depth,
  selectedId,
  onSelect,
  onAddChild,
  onRename,
  onDelete,
}: {
  node: KategoriPakaian;
  depth: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAddChild: (parentId: number) => void;
  onRename: (node: KategoriPakaian) => void;
  onDelete: (node: KategoriPakaian) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isSelected = node.id === selectedId;

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-lg py-1.5 pl-${Math.min(depth * 4, 16) + 2} pr-2 transition-colors cursor-pointer ${
          isSelected
            ? "bg-cyan-500/20 border border-cyan-500/40"
            : "hover:bg-slate-800/60"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        {/* Expand toggle */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="flex-shrink-0 text-slate-500 hover:text-white"
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <span className="h-3.5 w-3.5 inline-block" />
          )}
        </button>

        {/* Folder icon */}
        {hasChildren
          ? <FolderOpen className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? "text-cyan-400" : "text-amber-400/70"}`} />
          : <Folder className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? "text-cyan-400" : "text-slate-500"}`} />
        }

        {/* Name */}
        <span className={`flex-1 truncate text-sm ${isSelected ? "font-semibold text-cyan-300" : "text-slate-300"}`}>
          {node.nama}
        </span>

        {/* Actions (hover only) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            title="Tambah anak"
            onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
            className="rounded p-0.5 text-slate-500 hover:bg-emerald-500/20 hover:text-emerald-400"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            type="button"
            title="Rename"
            onClick={(e) => { e.stopPropagation(); onRename(node); }}
            className="rounded p-0.5 text-slate-500 hover:bg-cyan-500/20 hover:text-cyan-400"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            title="Hapus"
            onClick={(e) => { e.stopPropagation(); onDelete(node); }}
            className="rounded p-0.5 text-slate-500 hover:bg-rose-500/20 hover:text-rose-400"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Wage Rate Row ─────────────────────────────────────────────────────────

function WageRateRow({
  rate,
  onEdit,
  onDelete,
}: {
  rate: TarifUpah;
  onEdit: (rate: TarifUpah) => void;
  onDelete: (rate: TarifUpah) => void;
}) {
  return (
    <tr className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-white">{rate.jobdesk}</td>
      <td className="px-4 py-3 text-sm font-mono font-semibold text-emerald-400">
        {formatRupiah(Number(rate.harga))}
      </td>
      <td className="px-4 py-3 text-xs text-slate-400">pcs</td>
      <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{rate.keterangan || "—"}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(rate)}
            className="rounded p-1 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors"
            title="Edit tarif"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(rate)}
            className="rounded p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
            title="Hapus tarif"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function WageRateSettings() {
  const queryClient = useQueryClient();
  const { toasts, show } = useToast();

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Category modal state
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catModalMode, setCatModalMode] = useState<"add" | "rename">("add");
  const [catModalParentId, setCatModalParentId] = useState<number | null>(null);
  const [catModalName, setCatModalName] = useState("");
  const [catEditTarget, setCatEditTarget] = useState<KategoriPakaian | null>(null);

  // Delete category modal
  const [deleteCatTarget, setDeleteCatTarget] = useState<KategoriPakaian | null>(null);

  // Rate form state
  const [rateFormOpen, setRateFormOpen] = useState(false);
  const [rateEditTarget, setRateEditTarget] = useState<TarifUpah | null>(null);
  const [rateJobdesk, setRateJobdesk] = useState("");
  const [rateHarga, setRateHarga] = useState("");
  const [rateKet, setRateKet] = useState("");

  // Delete rate modal
  const [deleteRateTarget, setDeleteRateTarget] = useState<TarifUpah | null>(null);

  // ─ Queries ─────────────────────────────────────────────────────────────

  const {
    data: catData,
    isLoading: catLoading,
    refetch: refetchCats,
  } = useQuery({
    queryKey: ["wage-categories"],
    queryFn: () => api.getWageCategories(),
    staleTime: 30000,
  });

  const {
    data: rateData,
    isLoading: rateLoading,
    refetch: refetchRates,
  } = useQuery({
    queryKey: ["wage-rates", selectedCategoryId],
    queryFn: () =>
      api.getWageRates(selectedCategoryId ? { kategori_id: selectedCategoryId } : undefined),
    enabled: selectedCategoryId !== null,
  });

  const flatCategories = catData?.items ?? [];
  const tree = buildTree(flatCategories);
  const jobdeskOptions = rateData?.jobdesk_options ?? [];
  const rates = rateData?.items ?? [];

  const selectedCategory = flatCategories.find((c) => c.id === selectedCategoryId) ?? null;
  const breadcrumb = selectedCategoryId
    ? buildBreadcrumb(flatCategories, selectedCategoryId)
    : "";

  // ─ Mutations ───────────────────────────────────────────────────────────

  const createCatMutation = useMutation({
    mutationFn: api.createWageCategory,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["wage-categories"] });
      show("success", res.message || "Kategori ditambahkan.");
      setCatModalOpen(false);
      setCatModalName("");
    },
    onError: (err: any) => show("error", err?.message || "Gagal menambah kategori."),
  });

  const updateCatMutation = useMutation({
    mutationFn: api.updateWageCategory,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["wage-categories"] });
      show("success", res.message || "Kategori diperbarui.");
      setCatModalOpen(false);
      setCatModalName("");
    },
    onError: (err: any) => show("error", err?.message || "Gagal memperbarui kategori."),
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id: number) => api.deleteWageCategory(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["wage-categories"] });
      show("success", res.message || "Kategori dihapus.");
      if (deleteCatTarget?.id === selectedCategoryId) setSelectedCategoryId(null);
      setDeleteCatTarget(null);
    },
    onError: (err: any) => show("error", err?.message || "Gagal menghapus kategori."),
  });

  const createRateMutation = useMutation({
    mutationFn: api.createWageRate,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["wage-rates"] });
      show("success", res.message || "Tarif ditambahkan.");
      setRateFormOpen(false);
      resetRateForm();
    },
    onError: (err: any) => show("error", err?.message || "Gagal menambah tarif."),
  });

  const updateRateMutation = useMutation({
    mutationFn: api.updateWageRate,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["wage-rates"] });
      show("success", res.message || "Tarif diperbarui.");
      setRateFormOpen(false);
      resetRateForm();
    },
    onError: (err: any) => show("error", err?.message || "Gagal memperbarui tarif."),
  });

  const deleteRateMutation = useMutation({
    mutationFn: (id: number) => api.deleteWageRate(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["wage-rates"] });
      show("success", res.message || "Tarif dihapus.");
      setDeleteRateTarget(null);
    },
    onError: (err: any) => show("error", err?.message || "Gagal menghapus tarif."),
  });

  // ─ Handlers ────────────────────────────────────────────────────────────

  function resetRateForm() {
    setRateEditTarget(null);
    setRateJobdesk("");
    setRateHarga("");
    setRateKet("");
  }

  function openAddChild(parentId: number) {
    setCatModalMode("add");
    setCatModalParentId(parentId);
    setCatModalName("");
    setCatEditTarget(null);
    setCatModalOpen(true);
  }

  function openRename(node: KategoriPakaian) {
    setCatModalMode("rename");
    setCatModalParentId(node.parent_id);
    setCatModalName(node.nama);
    setCatEditTarget(node);
    setCatModalOpen(true);
  }

  function openAddRoot() {
    setCatModalMode("add");
    setCatModalParentId(null);
    setCatModalName("");
    setCatEditTarget(null);
    setCatModalOpen(true);
  }

  function submitCatModal() {
    if (!catModalName.trim()) return;
    if (catModalMode === "add") {
      createCatMutation.mutate({ parent_id: catModalParentId, nama: catModalName.trim() });
    } else if (catEditTarget) {
      updateCatMutation.mutate({ id: catEditTarget.id, nama: catModalName.trim() });
    }
  }

  function openEditRate(rate: TarifUpah) {
    setRateEditTarget(rate);
    setRateJobdesk(rate.jobdesk);
    setRateHarga(formatInputNumber(String(rate.harga)));
    setRateKet(rate.keterangan || "");
    setRateFormOpen(true);
  }

  function openAddRate() {
    resetRateForm();
    setRateFormOpen(true);
  }

  function submitRate() {
    if (!selectedCategoryId) return;
    const harga = parseInputNumber(rateHarga);
    if (!rateJobdesk || harga < 0) return;
    if (rateEditTarget) {
      updateRateMutation.mutate({ id: rateEditTarget.id, harga, keterangan: rateKet.trim() || null });
    } else {
      createRateMutation.mutate({
        kategori_id: selectedCategoryId,
        jobdesk: rateJobdesk,
        harga,
        keterangan: rateKet.trim() || null,
      });
    }
  }

  const isCatMutating = createCatMutation.isPending || updateCatMutation.isPending;
  const isRateMutating = createRateMutation.isPending || updateRateMutation.isPending;

  // ─ Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur-sm transition-all ${
              t.type === "success"
                ? "border-emerald-500/40 bg-slate-900/95 text-emerald-300"
                : "border-rose-500/40 bg-slate-900/95 text-rose-300"
            }`}
          >
            {t.type === "success" ? "✅ " : "❌ "}{t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <BadgeDollarSign className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Tarif Upah Kinerja</h3>
            <p className="text-xs text-slate-400">
              Kelola hierarki kategori pakaian dan tarif upah per jobdesk
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { refetchCats(); refetchRates(); }}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Main two-pane layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">

        {/* LEFT PANE: Category Tree */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">Kategori Pakaian</span>
            </div>
            <button
              type="button"
              onClick={openAddRoot}
              title="Tambah kategori root"
              className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Tambah Root
            </button>
          </div>

          <div className="min-h-[300px] max-h-[600px] overflow-y-auto p-2">
            {catLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : tree.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center">
                <Folder className="h-10 w-10 mb-2 text-slate-700" />
                <p className="text-sm">Belum ada kategori.</p>
                <p className="text-xs">Klik "+ Tambah Root" untuk memulai.</p>
              </div>
            ) : (
              tree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedId={selectedCategoryId}
                  onSelect={(id) => setSelectedCategoryId(id)}
                  onAddChild={openAddChild}
                  onRename={openRename}
                  onDelete={(node) => setDeleteCatTarget(node)}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANE: Wage Rates */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          {!selectedCategoryId ? (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center text-slate-500">
              <DollarSign className="mb-3 h-12 w-12 text-slate-700" />
              <p className="text-sm font-medium text-slate-400">Pilih kategori di panel kiri</p>
              <p className="text-xs text-slate-500 mt-1">untuk melihat atau mengatur tarif upah</p>
            </div>
          ) : (
            <>
              {/* Rate panel header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-white truncate">
                      {selectedCategory?.nama}
                    </span>
                  </div>
                  {breadcrumb && (
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      📂 {breadcrumb}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={openAddRate}
                  className="flex-shrink-0 flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Tarif
                </button>
              </div>

              {/* Rate form (inline) */}
              {rateFormOpen && (
                <div className="border-b border-slate-800 bg-slate-800/40 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {rateEditTarget ? "Edit Tarif" : "Tambah Tarif Baru"}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {/* Jobdesk select */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">
                        Jobdesk
                      </label>
                      {rateEditTarget ? (
                        <input
                          type="text"
                          value={rateJobdesk}
                          readOnly
                          className="w-full rounded-lg border border-slate-700 bg-slate-700/50 px-3 py-2 text-sm text-slate-300"
                        />
                      ) : (
                        <select
                          value={rateJobdesk}
                          onChange={(e) => setRateJobdesk(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="">— Pilih Jobdesk —</option>
                          {jobdeskOptions.map((j) => (
                            <option key={j} value={j}>{j}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Harga */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">
                        Harga (Rp / pcs)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                        <input
                          type="text"
                          value={rateHarga}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\./g, "").replace(/\D/g, "");
                            if (raw === "" || raw === "0") {
                              setRateHarga(raw);
                            } else {
                              setRateHarga(Number(raw).toLocaleString("id-ID"));
                            }
                          }}
                          onFocus={(e) => {
                            if (e.target.value === "0") setRateHarga("");
                          }}
                          placeholder="0"
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                    </div>

                    {/* Keterangan */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">
                        Keterangan <span className="text-slate-600">(opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={rateKet}
                        onChange={(e) => setRateKet(e.target.value)}
                        placeholder="Opsional..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={submitRate}
                      disabled={isRateMutating || !rateJobdesk || !rateHarga}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                    >
                      {isRateMutating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      {rateEditTarget ? "Simpan Perubahan" : "Tambahkan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRateFormOpen(false); resetRateForm(); }}
                      className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* Rate table */}
              {rateLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : rates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center">
                  <DollarSign className="h-10 w-10 mb-2 text-slate-700" />
                  <p className="text-sm">Belum ada tarif upah</p>
                  <p className="text-xs">untuk kategori ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">Jobdesk</th>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">Harga</th>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">Satuan</th>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">Keterangan</th>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rates.map((rate) => (
                        <WageRateRow
                          key={rate.id}
                          rate={rate}
                          onEdit={openEditRate}
                          onDelete={(r) => setDeleteRateTarget(r)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal: Add / Rename Category */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="mb-1 text-base font-bold text-white">
              {catModalMode === "add" ? "Tambah Kategori" : "Rename Kategori"}
            </h3>
            <p className="mb-4 text-xs text-slate-400">
              {catModalMode === "add" && catModalParentId
                ? `Anak dari: ${buildBreadcrumb(flatCategories, catModalParentId)}`
                : catModalMode === "add"
                ? "Kategori Root (induk utama)"
                : `Rename: ${catEditTarget?.nama}`}
            </p>

            <AutocompleteInput
              value={catModalName}
              onChange={setCatModalName}
              placeholder="Nama kategori..."
            />

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={submitCatModal}
                disabled={isCatMutating || !catModalName.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-cyan-600 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50 transition-colors"
              >
                {isCatMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {catModalMode === "add" ? "Tambahkan" : "Simpan"}
              </button>
              <button
                type="button"
                onClick={() => { setCatModalOpen(false); setCatModalName(""); }}
                className="flex items-center gap-1 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Category */}
      {deleteCatTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-rose-900/60 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mb-1 text-base font-bold text-white">Hapus Kategori?</h3>
            <p className="mb-1 text-sm text-slate-300">
              <span className="font-semibold text-rose-300">{deleteCatTarget.nama}</span>
            </p>
            <p className="mb-4 text-xs text-slate-500">
              Seluruh subkategori dan tarif upah yang terdaftar di dalam kategori ini akan ikut terhapus secara permanen.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => deleteCatMutation.mutate(deleteCatTarget.id)}
                disabled={deleteCatMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors"
              >
                {deleteCatMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Hapus
              </button>
              <button
                type="button"
                onClick={() => setDeleteCatTarget(null)}
                className="flex-1 rounded-xl border border-slate-700 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Rate */}
      {deleteRateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-rose-900/60 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mb-1 text-base font-bold text-white">Hapus Tarif?</h3>
            <p className="mb-4 text-sm text-slate-400">
              Tarif <span className="font-semibold text-white">{deleteRateTarget.jobdesk}</span> —{" "}
              <span className="font-mono text-emerald-400">{formatRupiah(Number(deleteRateTarget.harga))}</span>{" "}
              akan dihapus permanen.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => deleteRateMutation.mutate(deleteRateTarget.id)}
                disabled={deleteRateMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors"
              >
                {deleteRateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Hapus
              </button>
              <button
                type="button"
                onClick={() => setDeleteRateTarget(null)}
                className="flex-1 rounded-xl border border-slate-700 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
