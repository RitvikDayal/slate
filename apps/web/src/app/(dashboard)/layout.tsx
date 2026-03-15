import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { AppShell } from "@/components/layout/app-shell";
import { SyncProvider } from "@/components/providers/sync-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, error } = await getAuthenticatedUser();

  // In production, redirect unauthenticated users to login
  if (error || !user?.id) {
    redirect("/login");
  }

  return (
    <SyncProvider>
      <AppShell user={user}>{children}</AppShell>
    </SyncProvider>
  );
}
