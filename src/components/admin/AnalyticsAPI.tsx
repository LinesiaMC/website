"use client";

// Shared hook/helper for analytics API calls
export function createAnalyticsFetcher(headers: () => Record<string, string>) {
  return async function fetchAnalytics(path: string, params?: Record<string, string>) {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    const res = await fetch(`/api/analytics/${path}${query}`, { headers: headers() });
    if (!res.ok) throw new Error(`Analytics API error: ${res.status}`);
    return res.json();
  };
}

export function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return "0s";
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s`;
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function formatDate(ts: number): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}
