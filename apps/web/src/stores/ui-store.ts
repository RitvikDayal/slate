"use client";

import { create } from "zustand";

type ActiveView = "inbox" | "today" | "upcoming" | "list" | "calendar" | "chat" | "reports" | "settings";

interface UIStore {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  detailPanelOpen: boolean;
  activeView: ActiveView;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setDetailPanelOpen: (open: boolean) => void;
  setActiveView: (view: ActiveView) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  detailPanelOpen: false,
  activeView: "today",

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebarCollapsed: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),
  setActiveView: (view) => set({ activeView: view }),
}));
