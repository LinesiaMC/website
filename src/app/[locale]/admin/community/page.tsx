"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Search, Users, Crown, Link2, Link2Off, Gamepad2, ShieldCheck, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { INGAME_RANK_LABELS, IngameRank, ROLE_LABELS, ROLE_COLORS, StaffRole } from "@/lib/roles";

interface CommunityPlayer {
  uuid: string;
  xuid: string | null;
  username: string;
  platform: string;
  firstSeen: number;
  lastSeen: number;
  totalPlaytime: number;
  sessionCount: number;
  ingameRank: string | null;
  prestige: number;
  kills: number;
  deaths: number;
  account: null | {
    id: string;
    microsoftId: string | null;
    microsoftGamertag: string | null;
    microsoftDisplayName: string | null;
    linkedAt: number;
  };
  staff: null | { id: string; role: StaffRole; source: "manual" | "ingame" };
}

const PAGE_SIZE = 50;

function fmtDate(ts: number, locale: string): string {
  return new Date(ts).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtPlaytime(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  if (h >= 24) return `${Math.floor(h / 24)}j ${h % 24}h`;
  return `${h}h`;
}

export default function CommunityAdminPage() {
  const { locale } = useParams<{ locale: string }>();
  const { can } = useAdmin();
  const [list, setList] = useState<CommunityPlayer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [linkFilter, setLinkFilter] = useState<"all" | "linked" | "unlinked">("all");
  const [rankFilter, setRankFilter] = useState("");
  const [sort, setSort] = useState<"lastSeen" | "playtime" | "username" | "firstSeen">("lastSeen");
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      q, link: linkFilter, rank: rankFilter, sort,
      limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE),
    });
    const res = await fetch(`/api/community?${params}`, { cache: "no-store" });
    if (res.ok) {
      const j = await res.json();
      setList(j.players);
      setTotal(j.total);
    }
    setLoading(false);
  }, [q, linkFilter, rankFilter, sort, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [q, linkFilter, rankFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const ranks = useMemo(() => Object.keys(INGAME_RANK_LABELS), []);

  if (!can("community.view")) {
    return <div className="p-8 text-center text-text-sub">{locale === "fr" ? "Accès refusé" : "Access denied"}</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink flex items-center justify-center">
            <Users size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text">{locale === "fr" ? "Communauté" : "Community"}</h1>
            <p className="text-[12px] text-text-muted">{total.toLocaleString()} {locale === "fr" ? "joueurs" : "players"}</p>
          </div>
        </div>
      </div>

      <div className="mc-card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={locale === "fr" ? "Rechercher pseudo / xuid..." : "Search name / xuid..."}
            className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none"
          />
        </div>
        <select value={linkFilter} onChange={(e) => setLinkFilter(e.target.value as typeof linkFilter)}
          className="px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] font-medium">
          <option value="all">{locale === "fr" ? "Tous" : "All"}</option>
          <option value="linked">{locale === "fr" ? "Liés" : "Linked"}</option>
          <option value="unlinked">{locale === "fr" ? "Non liés" : "Unlinked"}</option>
        </select>
        <select value={rankFilter} onChange={(e) => setRankFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] font-medium">
          <option value="">{locale === "fr" ? "Tous rangs" : "All ranks"}</option>
          {ranks.map((r) => (
            <option key={r} value={r}>{INGAME_RANK_LABELS[r as IngameRank].fr}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
          className="px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] font-medium">
          <option value="lastSeen">{locale === "fr" ? "Dernière vue" : "Last seen"}</option>
          <option value="playtime">{locale === "fr" ? "Playtime" : "Playtime"}</option>
          <option value="firstSeen">{locale === "fr" ? "Première vue" : "First seen"}</option>
          <option value="username">A→Z</option>
        </select>
      </div>

      <div className="mc-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted">{locale === "fr" ? "Chargement..." : "Loading..."}</div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center text-text-muted">{locale === "fr" ? "Aucun joueur trouvé" : "No players found"}</div>
        ) : (
          <div className="divide-y divide-border">
            {list.map((p) => {
              const rankInfo = p.ingameRank ? INGAME_RANK_LABELS[p.ingameRank.toLowerCase() as IngameRank] : null;
              return (
                <Link
                  key={p.uuid}
                  href={`/${locale}/leaderboard/${p.xuid || p.uuid}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-bg-soft transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink to-pink/70 flex items-center justify-center text-white text-[14px] font-bold shrink-0">
                    {p.username[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[14px] font-semibold text-text truncate">{p.username}</span>
                      {rankInfo && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                          style={{ color: rankInfo.color, backgroundColor: rankInfo.color + "1A" }}
                        >
                          {rankInfo.fr}
                        </span>
                      )}
                      {p.staff && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${ROLE_COLORS[p.staff.role].bg} ${ROLE_COLORS[p.staff.role].text}`}>
                          <ShieldCheck size={10} />{ROLE_LABELS[p.staff.role].fr}
                          {p.staff.source === "ingame" && <span className="opacity-60 normal-case">·sync</span>}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-text-muted">
                      <span>{p.platform}</span>
                      <span>·</span>
                      <span>{fmtPlaytime(p.totalPlaytime)}</span>
                      <span>·</span>
                      <span>{p.sessionCount} sessions</span>
                      {p.prestige > 0 && (<><span>·</span><span className="text-pink">P{p.prestige}</span></>)}
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-2 shrink-0">
                    {p.account ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">
                        <Link2 size={11} />
                        {locale === "fr" ? "Lié" : "Linked"}
                        {p.account.microsoftGamertag && <Gamepad2 size={11} className="text-[#00A4EF] ml-1" />}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text-muted bg-bg-soft border border-border px-2 py-1 rounded">
                        <Link2Off size={11} />
                        {locale === "fr" ? "Non lié" : "Unlinked"}
                      </span>
                    )}
                  </div>
                  <div className="hidden lg:block text-right text-[11px] text-text-muted shrink-0 w-[110px]">
                    {fmtDate(p.lastSeen, locale)}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex items-center gap-1 text-[12px] text-text-sub hover:text-pink disabled:opacity-30"
            >
              <ChevronLeft size={14} />{locale === "fr" ? "Précédent" : "Previous"}
            </button>
            <span className="text-[12px] text-text-muted">
              {locale === "fr" ? "Page" : "Page"} {page + 1} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 text-[12px] text-text-sub hover:text-pink disabled:opacity-30"
            >
              {locale === "fr" ? "Suivant" : "Next"}<ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 mc-card p-4 bg-bg-soft/50">
        <p className="text-[12px] text-text-sub flex items-start gap-2">
          <Crown size={14} className="text-pink mt-0.5 shrink-0" />
          {locale === "fr"
            ? "Les rangs et badges staff sont synchronisés depuis le serveur Minecraft (autorité). Les modifications faites en jeu se propagent ici dans les ~5 minutes."
            : "Ranks and staff badges are synced from the Minecraft server (authoritative). Changes made in-game propagate here within ~5 minutes."}
        </p>
      </div>
    </div>
  );
}
