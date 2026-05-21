import { PageHeader } from "@/components/layout/page-header";
import { AdminPanel } from "@/components/settings/admin-panel";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { SecuritySettings } from "@/components/settings/security-settings";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="System Settings"
        description="Profil, keamanan akun, dan pengaturan RBAC untuk admin."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <ProfileSettings />
        <SecuritySettings />
      </div>

      <div className="mt-5">
        <AdminPanel />
      </div>
    </>
  );
}
