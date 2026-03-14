"use client";
import { useEffect } from "react";
import { startSyncListener } from "@/lib/sync";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const cleanup = startSyncListener();
    return cleanup;
  }, []);
  return <>{children}</>;
}
