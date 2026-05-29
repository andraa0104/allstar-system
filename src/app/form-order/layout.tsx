import { AppShell } from "@/components/layout/app-shell";

export default function FormOrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
