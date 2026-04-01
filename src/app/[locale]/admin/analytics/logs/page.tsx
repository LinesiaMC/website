"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { ScrollText, Search, Activity, ChevronLeft, ChevronRight, AlertTriangle, Info } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { createAnalyticsFetcher, formatDate } from "@/components/admin/AnalyticsAPI";

interface LogEntry {
  id: number;
  player_uuid: string;
  player_name: string;
  category: string;
  action: string;
  detail: string | null;
  item_name: string | null;
  item_count: number | null;
  item_uid: string | null;
  target_player: string | null;
  world: string | null;
  x: number | null;
  y: number | null;
  z: number | null;
  level: string;
  timestamp: number;
  server_id: string | null;
}

interface LogStats {
  totalLogs: number;
  logsLast24h: number;
  warnings: number;
  warningsLast24h: number;
  topPlayers: { player_name: string; count: number }[];
  topItems: { item_name: string; count: number }[];
  topActions: { action: string; count: number }[];
}

export default function LogsPage() {
  const { locale } = useParams<{ locale: string }>();
  return (
    <AdminShell locale={locale}>
      {({ headers }) => <LogsContent headers={headers} locale={locale} />}
    </AdminShell>
  );
}

function LogsContent({ headers, locale }: { headers: () => Record<string, string>; locale: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [player, setPlayer] = useState("");
  const [category, setCategory] = useState("");
  const [action, setAction] = useState("");
  const [item, setItem] = useState("");
  const [level, setLevel] = useState("");
  const [searchText, setSearchText] = useState("");

  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const limit = 50;
  const api = useRef(createAnalyticsFetcher(headers)).current;

  // Load categories + stats once
  useEffect(() => {
    Promise.all([
      api("logs/categories"),
      api("logs/stats"),
    ]).then(([cats, s]) => {
      setCategories(cats);
      setStats(s);
    }).catch(() => {});
  }, [api]);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {
      limit: limit.toString(),
      offset: (page * limit).toString(),
    };
    if (player) params.player = player;
    if (category) params.category = category;
    if (action) params.action = action;
    if (item) params.item = item;
    if (level) params.level = level;
    if (searchText) params.search = searchText;

    api("logs", params)
      .then((data) => {
        setLogs(data.logs);
        setTotal(data.total);
        setLoading(false);
      })
      .catch(() => {
        setError(locale === "fr" ? "Erreur de chargement" : "Loading error");
        setLoading(false);
      });
  }, [api, page, player, category, action, item, level, searchText, locale]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  const handleSearch = () => {
    setPage(0);
    fetchLogs();
  };

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="mc-card p-8 text-center">
          <p className="text-[14px] text-text-sub">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-pink flex items-center justify-center">
          <ScrollText size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text">Logs</h1>
          <p className="text-[12px] text-text-muted">{total} {locale === "fr" ? "entrees" : "entries"}</p>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="mc-card px-4 py-3">
            <p className="text-[11px] text-text-muted">{locale === "fr" ? "Total logs" : "Total Logs"}</p>
            <p className="text-[18px] font-bold text-text">{stats.totalLogs.toLocaleString()}</p>
          </div>
          <div className="mc-card px-4 py-3">
            <p className="text-[11px] text-text-muted">{locale === "fr" ? "Logs (24h)" : "Logs (24h)"}</p>
            <p className="text-[18px] font-bold text-text">{stats.logsLast24h.toLocaleString()}</p>
          </div>
          <div className="mc-card px-4 py-3">
            <p className="text-[11px] text-text-muted">{locale === "fr" ? "Alertes" : "Warnings"}</p>
            <p className="text-[18px] font-bold text-orange-500">{stats.warnings.toLocaleString()}</p>
          </div>
          <div className="mc-card px-4 py-3">
            <p className="text-[11px] text-text-muted">{locale === "fr" ? "Alertes (24h)" : "Warnings (24h)"}</p>
            <p className="text-[18px] font-bold text-orange-500">{stats.warningsLast24h.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mc-card p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder={locale === "fr" ? "Recherche..." : "Search..."}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-white text-[12px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none"
            />
          </div>
          <input
            type="text"
            placeholder={locale === "fr" ? "Joueur" : "Player"}
            value={player}
            onChange={(e) => setPlayer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="px-3 py-2 rounded-lg border border-border bg-white text-[12px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none"
          />
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(0); }}
            className="px-3 py-2 rounded-lg border border-border bg-white text-[12px] text-text focus:border-pink focus:outline-none"
          >
            <option value="">{locale === "fr" ? "Categorie" : "Category"}</option>
            {categories.map(c => (
              <option key={c.category} value={c.category}>{c.category} ({c.count})</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="px-3 py-2 rounded-lg border border-border bg-white text-[12px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none"
          />
          <input
            type="text"
            placeholder="Item"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="px-3 py-2 rounded-lg border border-border bg-white text-[12px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none"
          />
          <select
            value={level}
            onChange={(e) => { setLevel(e.target.value); setPage(0); }}
            className="px-3 py-2 rounded-lg border border-border bg-white text-[12px] text-text focus:border-pink focus:outline-none"
          >
            <option value="">{locale === "fr" ? "Niveau" : "Level"}</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
          </select>
        </div>
      </div>

      {/* Logs table */}
      <div className="mc-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Activity size={24} className="text-pink mx-auto animate-pulse" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border bg-bg-soft">
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub w-8"></th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Joueur" : "Player"}</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Categorie" : "Category"}</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub">Action</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Detail" : "Detail"}</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub">Item</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Monde" : "World"}</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className={`border-b border-border/50 ${log.level === "warning" ? "bg-orange-50/50" : ""}`}>
                    <td className="px-3 py-2">
                      {log.level === "warning" ? (
                        <AlertTriangle size={13} className="text-orange-500" />
                      ) : (
                        <Info size={13} className="text-text-muted" />
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium text-text">{log.player_name || "-"}</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded bg-bg-soft text-[11px] font-semibold text-text-sub">
                        {log.category}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-text-sub">{log.action}</td>
                    <td className="px-3 py-2 text-text-sub max-w-[200px] truncate">{log.detail || "-"}</td>
                    <td className="px-3 py-2 text-text-sub">
                      {log.item_name ? (
                        <span>
                          {log.item_name}
                          {log.item_count && log.item_count > 1 ? <span className="text-text-muted"> x{log.item_count}</span> : ""}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-3 py-2 text-text-sub">{log.world || "-"}</td>
                    <td className="px-3 py-2 text-text-muted whitespace-nowrap">{formatDate(log.timestamp)}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-text-muted">
                      {locale === "fr" ? "Aucun log trouve" : "No logs found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-[12px] text-text-muted">
            {page * limit + 1}-{Math.min((page + 1) * limit, total)} / {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg border border-border bg-white text-text-sub hover:bg-bg-soft disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[12px] text-text-sub">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg border border-border bg-white text-text-sub hover:bg-bg-soft disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
