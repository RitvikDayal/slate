import { getAuthenticatedUser } from "@/lib/api/auth";
import { AppShell } from "@/components/layout/app-shell";
import { SyncProvider } from "@/components/providers/sync-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getAuthenticatedUser();
  return (
    <SyncProvider>
      <AppShell user={user}>{children}</AppShell>
    </SyncProvider>
  );
}
