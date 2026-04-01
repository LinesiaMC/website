"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Users, Search, ChevronLeft, ChevronRight, Activity } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { createAnalyticsFetcher, formatDuration, formatDate } from "@/components/admin/AnalyticsAPI";

interface Player {
  uuid: string;
  username: string;
  platform: string;
  first_seen: number;
  last_seen: number;
  total_playtime: number;
  session_count: number;
}

export default function PlayersPage() {
  const { locale } = useParams<{ locale: string }>();
  return (
    <AdminShell locale={locale}>
      {({ headers }) => <PlayersContent headers={headers} locale={locale} />}
    </AdminShell>
  );
}

function PlayersContent({ headers, locale }: { headers: () => Record<string, string>; locale: string }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("last_seen");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 30;
  const api = useRef(createAnalyticsFetcher(headers)).current;

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {
      limit: limit.toString(),
      offset: (page * limit).toString(),
      sort,
      order: "DESC",
    };
    if (search) params.search = search;

    api("players", params)
      .then((data) => {
        setPlayers(data.players);
        setTotal(data.total);
        setLoading(false);
      })
      .catch(() => {
        setError(locale === "fr" ? "Erreur de chargement" : "Loading error");
        setLoading(false);
      });
  }, [api, page, search, sort, locale]);

  const totalPages = Math.ceil(total / limit);

  const platformBadge = (p: string) => {
    const colors: Record<string, string> = {
      iOS: "bg-blue-50 text-blue-600",
      Android: "bg-green-50 text-green-600",
      Windows: "bg-purple-50 text-purple-600",
      Unknown: "bg-gray-100 text-gray-500",
    };
    return colors[p] || colors.Unknown;
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="mc-card p-8 text-center">
          <p className="text-[14px] text-text-sub">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink flex items-center justify-center">
            <Users size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text">{locale === "fr" ? "Joueurs" : "Players"}</h1>
            <p className="text-[12px] text-text-muted">{total} {locale === "fr" ? "joueurs" : "players"}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder={locale === "fr" ? "Rechercher un joueur..." : "Search player..."}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] text-text focus:border-pink focus:outline-none"
        >
          <option value="last_seen">{locale === "fr" ? "Derniere connexion" : "Last Seen"}</option>
          <option value="first_seen">{locale === "fr" ? "Premiere connexion" : "First Seen"}</option>
          <option value="total_playtime">{locale === "fr" ? "Temps de jeu" : "Playtime"}</option>
          <option value="session_count">Sessions</option>
          <option value="username">{locale === "fr" ? "Nom" : "Name"}</option>
        </select>
      </div>

      {/* Table */}
      <div className="mc-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Activity size={24} className="text-pink mx-auto animate-pulse" />
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-bg-soft">
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Joueur" : "Player"}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Plateforme" : "Platform"}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Temps de jeu" : "Playtime"}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">Sessions</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Derniere connexion" : "Last Seen"}</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.uuid} className="border-b border-border/50 hover:bg-bg-soft/50 transition-colors">
                  <td className="px-4 py-3">
                    <a
                      href={`/${locale}/admin/analytics/players/${p.uuid}`}
                      className="font-semibold text-text hover:text-pink transition-colors"
                    >
                      {p.username}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold ${platformBadge(p.platform)}`}>
                      {p.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-sub">{formatDuration(p.total_playtime)}</td>
                  <td className="px-4 py-3 text-text-sub">{p.session_count}</td>
                  <td className="px-4 py-3 text-text-sub">{formatDate(p.last_seen)}</td>
                </tr>
              ))}
              {players.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                    {locale === "fr" ? "Aucun joueur trouve" : "No players found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
