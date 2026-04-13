"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Trophy, Search, Clock, Users, ChevronLeft, ChevronRight, Activity } from "lucide-react";

interface Row {
  uuid: string;
  username: string;
  platform: string;
  total_playtime: number;
  session_count: number;
  last_seen: number;
  first_seen: number;
}

const SORTS = [
  { key: "total_playtime", fr: "Temps de jeu",       en: "Playtime" },
  { key: "session_count",  fr: "Nombre de sessions", en: "Sessions" },
  { key: "last_seen",      fr: "Dernière connexion", en: "Last seen" },
  { key: "first_seen",     fr: "Ancienneté",         en: "Oldest" },
];

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h >= 24) return `${Math.floor(h / 24)}j ${h % 24}h`;
  return `${h}h ${m}m`;
}
function formatDate(ts: number, locale: string): string {
  return new Date(ts).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { day: "2-digit", month: "short", year: "numeric" });
}

export default function LeaderboardPage() {
  const { locale } = useParams<{ locale: string }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("total_playtime");
  const [loading, setLoading] = useState(true);
  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      sort, limit: String(limit), offset: String(page * limit),
    });
    if (search) params.set("search", search);
    const res = await fetch(`/api/leaderboard?${params.toString()}`);
    const j = await res.json();
    setRows(j.players || []);
    setTotal(j.total || 0);
    setLoading(false);
  }, [sort, page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setTimeout(() => setPage(0), 0); return () => clearTimeout(t); }, [search, sort]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-bg-soft pt-[110px] pb-16 px-4">
      <div className="max-w-[900px] mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink/10 text-pink text-[12px] font-semibold mb-3">
            <Trophy size={13} />{locale === "fr" ? "Classement" : "Leaderboard"}
          </div>
          <h1 className="text-3xl font-bold text-text mb-2">
            {locale === "fr" ? "Top joueurs Linesia" : "Top Linesia players"}
          </h1>
          <p className="text-[14px] text-text-sub">
            {locale === "fr" ? "Recherche un joueur ou consulte les meilleurs du serveur." : "Search a player or browse the top of the server."}
          </p>
        </div>

        <div className="mc-card p-4 mb-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={locale === "fr" ? "Rechercher un pseudo..." : "Search a name..."}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none"
              />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none">
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{locale === "fr" ? s.fr : s.en}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mc-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><Activity size={24} className="text-pink mx-auto animate-pulse" /></div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-text-muted text-[13px]">
              {locale === "fr" ? "Aucun joueur trouvé" : "No players found"}
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-bg-soft">
                  <th className="text-left px-4 py-3 font-semibold text-text-sub w-12">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Joueur" : "Player"}</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-sub"><Clock size={12} className="inline mr-1" />{locale === "fr" ? "Temps" : "Time"}</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-sub"><Users size={12} className="inline mr-1" />Sessions</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-sub hidden md:table-cell">{locale === "fr" ? "Vue" : "Last"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.uuid} className="border-b border-border/50 hover:bg-bg-soft/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-text-muted">{page * limit + i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/${locale}/leaderboard/${r.uuid}`} className="font-semibold text-text hover:text-pink transition-colors">
                        {r.username}
                      </Link>
                      <span className="ml-2 text-[11px] text-text-muted">{r.platform}</span>
                    </td>
                    <td className="px-4 py-3 text-text-sub">{formatDuration(r.total_playtime)}</td>
                    <td className="px-4 py-3 text-text-sub">{r.session_count}</td>
                    <td className="px-4 py-3 text-text-sub hidden md:table-cell">{formatDate(r.last_seen, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-[12px] text-text-muted">
              {page * limit + 1}-{Math.min((page + 1) * limit, total)} / {total}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="p-2 rounded-lg border border-border bg-white text-text-sub hover:bg-bg-soft disabled:opacity-40 transition-colors"><ChevronLeft size={14} /></button>
              <span className="text-[12px] text-text-sub">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                className="p-2 rounded-lg border border-border bg-white text-text-sub hover:bg-bg-soft disabled:opacity-40 transition-colors"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
