"use client";

import { PageHeader } from "@/components/layout/page-header";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { SecuritySettings } from "@/components/settings/security-settings";
import { UserManagement } from "@/components/settings/user-management";
import { PrivilegeAccess } from "@/components/settings/privilege-access";
import { WhatsAppSettings } from "@/components/settings/whatsapp-settings";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/session";
import type { SessionUser } from "@/lib/types";
import { User, KeyRound, Users, ShieldAlert, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    queueMicrotask(() => {
      const user = getSession();
      setSession(user);
    });
  }, []);

  // Live Access Control view query for settings menu V flag
  const { data: userPerms, isLoading: isLoadingPerms } = useQuery({
    queryKey: ["my-settings-privilege", session?.id],
    queryFn: () => api.getPermissions(session?.id),
    enabled: !!session?.id,
  });

  if (!session || isLoadingPerms) {
    return (
      <div className="flex items-center justify-center p-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  // Check live access for "System Settings" V permission
  const hasAccess = (() => {
    if (!session) return false;
    // Admins are superusers and always bypass view limitations
    if (session.role.toLowerCase() === "admin") return true;

    if (!userPerms?.permissions) {
      return false; // Non-admins do not have settings access by default
    }
    return !!userPerms.permissions["System Settings"]?.V;
  })();

  if (userPerms?.permissions && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/10 backdrop-blur-md max-w-2xl mx-auto my-12 shadow-xl shadow-slate-950/20">
        <ShieldAlert size={48} className="text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-base font-bold text-white mb-2">Access Denied (403)</h2>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          Anda tidak memiliki hak akses (View Privilege) untuk menu **System Settings**. Hubungi administrator utama Anda untuk meminta izin otorisasi.
        </p>
      </div>
    );
  }

  const isAdmin = session.role.toLowerCase() === "admin";

  const tabs = [
    { id: "profile", label: "Detail Account", icon: User, allowed: true },
    { id: "security", label: "Change Password", icon: KeyRound, allowed: true },
    { id: "users", label: "User Management", icon: Users, allowed: isAdmin },
    { id: "privilege", label: "Privilege Access", icon: ShieldAlert, allowed: isAdmin },
    { id: "whatsapp", label: "WhatsApp Gateway", icon: MessageSquare, allowed: isAdmin },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        description="Kelola detail profil pribadi, ubah keamanan password, dan konfigurasi hak akses modul sistem."
      />

      {/* Tabs navigation bar */}
      <div className="border-b border-slate-800/80 bg-slate-900/20 rounded-xl p-1.5 flex flex-wrap gap-2 backdrop-blur-sm max-w-4xl">
        {tabs
          .filter((t) => t.allowed)
          .map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                  isActive
                    ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/10 scale-102"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
      </div>

      {/* Tabs panels */}
      <div className="animate-fade-in py-2">
        {activeTab === "profile" && <ProfileSettings />}
        {activeTab === "security" && <SecuritySettings />}
        {activeTab === "users" && isAdmin && <UserManagement />}
        {activeTab === "privilege" && isAdmin && <PrivilegeAccess />}
        {activeTab === "whatsapp" && isAdmin && <WhatsAppSettings />}
      </div>
    </div>
  );
}
