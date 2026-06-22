"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Palette, Sun, Moon } from "lucide-react";

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
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
          <Palette size={20} />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Appearance & Theme</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pilih preferensi tema visual aplikasi. Perubahan akan disimpan secara otomatis.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Light Theme Option */}
          <button
            onClick={() => setTheme("light")}
            className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 text-left w-full
              ${
                theme === "light"
                  ? "border-cyan-400 bg-cyan-400/5 shadow-lg shadow-cyan-500/10"
                  : "border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900"
              }
            `}
          >
            <div className={`p-3 rounded-full ${theme === "light" ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
              <Sun size={24} />
            </div>
            <div className="text-center">
              <div className="font-bold text-sm text-white mb-1">Terang / Light</div>
              <div className="text-xs text-slate-400">Tampilan bersih dengan latar belakang terang</div>
            </div>
            {theme === "light" && (
              <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
            )}
          </button>

          {/* Dark Theme Option */}
          <button
            onClick={() => setTheme("dark")}
            className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 text-left w-full
              ${
                theme === "dark"
                  ? "border-cyan-400 bg-cyan-400/5 shadow-lg shadow-cyan-500/10"
                  : "border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900"
              }
            `}
          >
            <div className={`p-3 rounded-full ${theme === "dark" ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
              <Moon size={24} />
            </div>
            <div className="text-center">
              <div className="font-bold text-sm text-white mb-1">Gelap / Dark</div>
              <div className="text-xs text-slate-400">Tampilan redup yang nyaman untuk mata (Default Sistem Sebelumnya)</div>
            </div>
            {theme === "dark" && (
              <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
