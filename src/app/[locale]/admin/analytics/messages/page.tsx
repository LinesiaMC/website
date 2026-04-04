"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { MessageSquare, Search, Activity, ChevronLeft, ChevronRight, Lock, Users, Shield } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
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

const CHAT_TYPES = [
  { value: "", label: { fr: "Tous les types", en: "All types" } },
  { value: "Message", label: { fr: "Chat public", en: "Public chat" } },
  { value: "PrivateMessage", label: { fr: "Messages prives", en: "Private messages" } },
  { value: "FactionChat", label: { fr: "Chat faction", en: "Faction chat" } },
  { value: "StaffChat", label: { fr: "Chat staff", en: "Staff chat" } },
];

function getActionIcon(action: string) {
  switch (action) {
    case "PrivateMessage": return <Lock size={13} className="text-violet" />;
    case "FactionChat": return <Users size={13} className="text-pink" />;
    case "StaffChat": return <Shield size={13} className="text-orange-500" />;
    default: return <MessageSquare size={13} className="text-text-muted" />;
  }
}

function getActionLabel(action: string, locale: string): string {
  const labels: Record<string, { fr: string; en: string }> = {
    Message: { fr: "Public", en: "Public" },
    PrivateMessage: { fr: "Prive", en: "Private" },
    FactionChat: { fr: "Faction", en: "Faction" },
    StaffChat: { fr: "Staff", en: "Staff" },
  };
  return labels[action]?.[locale as "fr" | "en"] || action;
}

function getActionBg(action: string): string {
  switch (action) {
    case "PrivateMessage": return "bg-violet/10 text-violet";
    case "FactionChat": return "bg-pink/10 text-pink";
    case "StaffChat": return "bg-orange-100 text-orange-600";
    default: return "bg-bg-soft text-text-sub";
  }
}

export default function MessagesPage() {
  const { locale } = useParams<{ locale: string }>();
  const { headers } = useAdmin();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [player, setPlayer] = useState("");
  const [chatType, setChatType] = useState("");
  const [searchText, setSearchText] = useState("");

  const limit = 50;
  const api = useRef(createAnalyticsFetcher(headers)).current;

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {
      limit: limit.toString(),
      offset: (page * limit).toString(),
      category: "chat",
    };
    if (player) params.player = player;
    if (chatType) params.action = chatType;
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
  }, [api, page, player, chatType, searchText, locale]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  const handleSearch = () => {
    setPage(0);
    fetchLogs();
  };

  if (error && logs.length === 0) {
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
        <div className="w-10 h-10 rounded-xl bg-violet flex items-center justify-center">
          <MessageSquare size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text">{locale === "fr" ? "Messages" : "Messages"}</h1>
          <p className="text-[12px] text-text-muted">
            {total} {locale === "fr" ? "messages" : "messages"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mc-card p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder={locale === "fr" ? "Rechercher un message..." : "Search message..."}
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
            value={chatType}
            onChange={(e) => { setChatType(e.target.value); setPage(0); }}
            className="px-3 py-2 rounded-lg border border-border bg-white text-[12px] text-text focus:border-pink focus:outline-none"
          >
            {CHAT_TYPES.map(ct => (
              <option key={ct.value} value={ct.value}>
                {ct.label[locale as "fr" | "en"] || ct.label.en}
              </option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            className="px-4 py-2 rounded-lg bg-pink text-white text-[12px] font-medium hover:bg-pink/90 transition-colors"
          >
            {locale === "fr" ? "Rechercher" : "Search"}
          </button>
        </div>
      </div>

      {/* Messages list */}
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
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub">Type</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Destinataire" : "Recipient"}</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub">Message</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-border/50 hover:bg-pink/5 transition-colors"
                  >
                    <td className="px-3 py-2.5">{getActionIcon(log.action)}</td>
                    <td className="px-3 py-2.5 font-medium text-text">{log.player_name || "-"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getActionBg(log.action)}`}>
                        {getActionLabel(log.action, locale)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-text-sub">
                      {log.target_player || "-"}
                    </td>
                    <td className="px-3 py-2.5 text-text-sub max-w-[400px] truncate">{log.detail || "-"}</td>
                    <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">{formatDate(log.timestamp)}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                      {locale === "fr" ? "Aucun message trouve" : "No messages found"}
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
