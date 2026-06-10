"use client";

import { useEffect, useState } from "react";
import { MessageSquare, RefreshCw, CheckCircle2, AlertTriangle, QrCode, Wifi, WifiOff } from "lucide-react";
import { api } from "@/lib/api";

export function WhatsAppSettings() {
  const [status, setStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  async function handleLogout() {
    if (!confirm("Apakah Anda yakin ingin keluar dari WhatsApp? Sesi perangkat ini akan dihapus.")) {
      return;
    }
    setLogoutLoading(true);
    try {
      await api.logoutWhatsApp();
      await fetchStatus();
    } catch (err: any) {
      setError("Gagal melakukan logout dari WhatsApp.");
    } finally {
      setLogoutLoading(false);
    }
  }

  async function fetchStatus() {
    setLoading(true);
    try {
      const data = await api.getWhatsAppStatus();
      setStatus(data.status as any);
      setQrCode(data.qr);
      setError(data.error || null);
    } catch (err: any) {
      setStatus("disconnected");
      setQrCode(null);
      setError("Gagal menghubungi server backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();

    // Auto-refresh status every 10 seconds if disconnected to detect QR scan automatically
    const interval = setInterval(() => {
      fetchStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-md shadow-xl shadow-slate-950/20 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <MessageSquare size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">WhatsApp Gateway</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Kelola koneksi otomatisasi WhatsApp Blast untuk pemberitahuan pelanggan.
            </p>
          </div>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400 hover:text-white disabled:opacity-50 transition duration-300"
          title="Perbarui Status"
        >
          <RefreshCw size={15} className={`${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Status Alert Banner */}
        <div
          className={`flex items-start gap-3 rounded-lg border p-4 ${
            status === "connected"
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
              : status === "connecting"
              ? "bg-amber-500/10 border-amber-500/25 text-amber-400 animate-pulse"
              : "bg-rose-500/10 border-rose-500/25 text-rose-400"
          }`}
        >
          {status === "connected" ? (
            <Wifi size={20} className="shrink-0 mt-0.5" />
          ) : (
            <WifiOff size={20} className="shrink-0 mt-0.5" />
          )}

          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Status Koneksi: {status === "connected" ? "Terhubung" : status === "connecting" ? "Menghubungkan..." : "Terputus"}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {status === "connected"
                ? "Sistem WhatsApp Blast aktif. Pesan otomatis akan dikirim ke customer saat status FO menjadi 'PRODUK READY DIGUDANG, SELESAI DIPACKING'."
                : status === "connecting"
                ? "Sistem sedang mencoba terhubung ke WhatsApp. Mohon tunggu..."
                : "Sistem WhatsApp Blast nonaktif. Silakan scan QR code di bawah menggunakan aplikasi WhatsApp Anda untuk menghubungkan kembali."}
            </p>
          </div>
        </div>

        {/* QR Code Section (Only if disconnected) */}
        {status !== "connected" && (
          <div className="flex flex-col items-center justify-center p-6 border border-slate-800 rounded-xl bg-slate-950/40">
            {qrCode ? (
              <div className="space-y-6 text-center max-w-sm">
                <div className="flex flex-col items-center justify-center">
                  <div className="p-4 bg-white rounded-xl shadow-lg inline-block">
                    <img src={qrCode} alt="WhatsApp QR Code" className="w-56 h-56" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3">
                    <QrCode size={12} /> Scan QR Code diatas
                  </span>
                </div>

                <div className="text-left space-y-2 border-t border-slate-800/80 pt-4">
                  <h4 className="text-xs font-bold text-slate-300">Petunjuk Menghubungkan:</h4>
                  <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1">
                    <li>Buka aplikasi WhatsApp di HP Anda.</li>
                    <li>Ketuk <b>Menu</b> (titik tiga) atau masuk ke <b>Pengaturan</b>.</li>
                    <li>Pilih <b>Perangkat Tertaut</b> {`->`} <b>Tautkan Perangkat</b>.</li>
                    <li>Arahkan kamera HP Anda ke QR Code di atas.</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 max-w-sm space-y-3">
                <AlertTriangle className="text-amber-500 mx-auto" size={32} />
                <h4 className="text-xs font-bold text-white">Layanan WhatsApp Belum Siap</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {error || "WhatsApp background service belum berjalan atau sesi sedang diinisialisasi. Silakan jalankan program whatsapp-service di server terlebih dahulu."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Connected Details Block */}
        {status === "connected" && (
          <div className="border border-slate-800/80 rounded-xl p-4 bg-slate-950/20 space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                Sistem Siap Beroperasi
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Anda tidak perlu melakukan tindakan apa pun sekarang. Ketika pekerjaan diperbarui di modul produksi ke status selesai dipacking, server akan memproses pengiriman notifikasi otomatis secara real-time.
              </p>
            </div>
            
            <div className="pt-2.5 border-t border-slate-800/60 flex justify-end">
              <button
                onClick={handleLogout}
                disabled={logoutLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg disabled:opacity-50 transition duration-300"
              >
                {logoutLoading ? "Keluar..." : "Keluar dari WhatsApp"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
