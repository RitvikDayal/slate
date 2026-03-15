"use client";

import { useMemo, useEffect, useState } from "react";

function getCSSVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function oklchToHex(oklch: string): string {
  // Use canvas to convert oklch to hex
  if (typeof document === "undefined") return "#888888";
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "#888888";
    ctx.fillStyle = oklch;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } catch {
    return "#888888";
  }
}

export function useChartColors() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return useMemo(() => {
    if (!mounted) {
      return {
        chart1: "#7c3aed",
        chart2: "#22c55e",
        chart3: "#ef4444",
        chart4: "#3b82f6",
        chart5: "#ec4899",
        grid: "#333",
        axis: "#666",
        tooltipBg: "#1a1a2e",
        tooltipBorder: "#333",
        tooltipText: "#fff",
        success: "#22c55e",
        warning: "#f59e0b",
        primary: "#7c3aed",
      };
    }

    return {
      chart1: oklchToHex(getCSSVar("--chart-1")),
      chart2: oklchToHex(getCSSVar("--chart-2")),
      chart3: oklchToHex(getCSSVar("--chart-3")),
      chart4: oklchToHex(getCSSVar("--chart-4")),
      chart5: oklchToHex(getCSSVar("--chart-5")),
      grid: oklchToHex(getCSSVar("--chart-grid")),
      axis: oklchToHex(getCSSVar("--chart-axis")),
      tooltipBg: oklchToHex(getCSSVar("--chart-tooltip-bg")),
      tooltipBorder: oklchToHex(getCSSVar("--chart-tooltip-border")),
      tooltipText: oklchToHex(getCSSVar("--chart-tooltip-text")),
      success: oklchToHex(getCSSVar("--success")),
      warning: oklchToHex(getCSSVar("--warning")),
      primary: oklchToHex(getCSSVar("--primary")),
    };
  }, [mounted]);
}
