import type { User } from "@supabase/supabase-js";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function AppShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-950 text-white">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-end border-b border-slate-800 px-4">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
