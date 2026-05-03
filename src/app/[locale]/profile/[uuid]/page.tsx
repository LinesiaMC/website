"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, Users, Coins, Skull, Dice5, Activity, Sword, Crown, Sparkles, Briefcase, Link as LinkIcon, Check, Gamepad2, ShieldCheck, ShieldAlert, Terminal, MessageSquare, Flag, Star, Pickaxe, Wheat, Fish, Zap, Target, Footprints } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ROLE_LABELS, ROLE_COLORS, StaffRole, Permission, hasPermission } from "@/lib/roles";

interface JobInfo { name: string; level: number; xp: number; maxXp: number }
interface CosmeticInfo { fullId: string; type: string; identifier: string; name: string | null; active: boolean }
interface FactionInfo {
  name: string; role: string; power: number; members: number; maxMembers: number;
  allies: string[]; description: string; leader: string | null;
}
interface ProfileExtra {
  rank: string | null;
  rankColor: string | null;
  prestige: number;
  power: number;
  prime: number | null;
  kills: number;
  deaths: number;
  killstreak: number;
  joinCount: number;
  playtime: number;
  firstJoin: string | null;
  lastLeave: string | null;
  description: string | null;
  lang: string | null;
  discordId: string | null;
  completedQuests: string[];
  jobs: JobInfo[];
  stats: Record<string, number | string>;
  faction: FactionInfo | null;
  money: number;
}
interface Stats {
  uuid: string;
  xuid: string | null;
  username: string;
  platform: string;
  firstSeen: number;
  lastSeen: number;
  totalPlaytime: number;
  sessionCount: number;
  money: number | null;
  casinoNet: number | null;
  deaths: number;
  extra: ProfileExtra | null;
  cosmetics: CosmeticInfo[];
}

function fmtDur(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h >= 24) return `${Math.floor(h / 24)}j ${h % 24}h`;
  return `${h}h ${m}m`;
}
function fmtDate(ts: number, locale: string): string {
  return new Date(ts).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { day: "2-digit", month: "short", year: "numeric" });
}

const COSMETIC_TYPE_LABEL: Record<string, string> = {
  cape: "Cape",
  hat: "Chapeau",
  wing: "Aile",
  tag: "Tag",
};

interface LinkInfo { microsoftGamertag: string | null; microsoftDisplayName: string | null; linkedSince: number | null }

interface AdminBundle {
  sessions: { id: number; join_time: number; leave_time: number | null; duration: number; platform: string }[];
  commands: { command: string; arguments: string; world: string; timestamp: number }[];
  deaths: { cause: string; world: string; x: number; y: number; z: number; timestamp: number }[];
  messages: { message: string; world: string; timestamp: number }[];
  sanctions: { id: number; type: string; reason: string; staff: string; duration: string; timestamp: number }[];
  aliases: { alias_uuid: string; alias_name: string; alias_xuid: string; match_via: string; updated_at: number }[];
  staff: null | {
    id: string;
    role: StaffRole;
    source: "manual" | "ingame";
    discord_id: string | null;
    discord_username: string | null;
    discord_avatar: string | null;
  };
}

interface StaffCtx { role: StaffRole; permissions: Partial<Record<Permission, boolean>> }

function fmtDateTime(ts: number, locale: string): string {
  return new Date(ts).toLocaleString(locale === "fr" ? "fr-FR" : "en-US", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function PlayerProfilePage() {
  const { locale, uuid } = useParams<{ locale: string; uuid: string }>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [link, setLink] = useState<LinkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [staffCtx, setStaffCtx] = useState<StaffCtx | null>(null);
  const [admin, setAdmin] = useState<AdminBundle | null>(null);
  const [adminTab, setAdminTab] = useState<"sessions" | "commands" | "messages" | "deaths">("sessions");

  const canAdmin = (p: Permission): boolean => {
    if (!staffCtx) return false;
    if (staffCtx.role === "founder") return true;
    if (p in staffCtx.permissions) return staffCtx.permissions[p] === true;
    return hasPermission(staffCtx.role, p);
  };

  useEffect(() => {
    fetch(`/api/profile/${uuid}`).then(async (r) => {
      if (r.status === 404) { setNotFound(true); setLoading(false); return; }
      const j = await r.json();
      setStats(j.stats);
      setLink(j.link || null);
      setLoading(false);
    });
    fetch(`/api/auth/me`, { cache: "no-store" }).then(async (r) => {
      if (!r.ok) return;
      const j = await r.json();
      if (j.staff) setStaffCtx({ role: j.staff.role, permissions: j.permissions || {} });
    }).catch(() => {});
  }, [uuid]);

  useEffect(() => {
    if (!stats || !canAdmin("analytics.view")) return;
    fetch(`/api/analytics/players/${stats.uuid}`, { cache: "no-store" }).then(async (r) => {
      if (!r.ok) return;
      const j = await r.json();
      setAdmin(j);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, staffCtx]);

  const cosmeticsByType = stats?.cosmetics.reduce<Record<string, CosmeticInfo[]>>((acc, c) => {
    (acc[c.type] ||= []).push(c);
    return acc;
  }, {}) ?? {};

  return (
    <main>
      <Navbar />
    <div className="min-h-screen bg-bg-soft pt-[110px] pb-16 px-4">
      <div className="max-w-[820px] mx-auto">
        <Link href={`/${locale}/leaderboard`} className="inline-flex items-center gap-1.5 text-[13px] text-text-sub hover:text-pink mb-4">
          <ArrowLeft size={14} />{locale === "fr" ? "Retour au classement" : "Back to leaderboard"}
        </Link>

        {loading ? (
          <div className="mc-card p-12 text-center"><Activity size={24} className="text-pink mx-auto animate-pulse" /></div>
        ) : notFound || !stats ? (
          <div className="mc-card p-12 text-center text-text-muted text-[13px]">
            {locale === "fr" ? "Joueur introuvable" : "Player not found"}
          </div>
        ) : (
          <>
            <div className="mc-card p-6 mb-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink to-pink/70 flex items-center justify-center text-white text-2xl font-bold">
                  {stats.username[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-text">{stats.username}</h1>
                  <p className="text-[12px] text-text-muted">
                    {stats.platform} · {locale === "fr" ? "Depuis le" : "Since"} {fmtDate(stats.firstSeen, locale)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {stats.extra?.rank && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-pink bg-pink/10 px-2 py-1 rounded">
                        <Crown size={12} />{stats.extra.rank}
                        {stats.extra.prestige > 0 && <span className="ml-1 text-text-sub">· P{stats.extra.prestige}</span>}
                      </div>
                    )}
                    {stats.extra?.faction && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet bg-violet/10 px-2 py-1 rounded">
                        <Flag size={12} />{stats.extra.faction.name}
                        <span className="ml-1 text-text-sub normal-case">· {stats.extra.faction.role}</span>
                      </div>
                    )}
                    {stats.extra?.prime != null && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber bg-amber/10 px-2 py-1 rounded">
                        <Star size={12} />Prime <span className="ml-1 normal-case">{stats.extra.prime}$</span>
                      </div>
                    )}
                    {link ? (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green bg-green/10 border border-green/30 px-2 py-1 rounded">
                        <Check size={12} />
                        {locale === "fr" ? "Compte lié" : "Account linked"}
                        {link.microsoftGamertag && <span className="font-normal text-text-sub">· {link.microsoftGamertag}</span>}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text-muted bg-bg-soft border border-border px-2 py-1 rounded">
                        <LinkIcon size={11} />
                        {locale === "fr" ? "Non lié" : "Not linked"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
              <Stat icon={Clock}    label={locale === "fr" ? "Temps de jeu" : "Playtime"} value={fmtDur(stats.totalPlaytime)} />
              <Stat icon={Users}    label="Sessions"                                       value={stats.sessionCount.toLocaleString()} />
              <Stat icon={Clock}    label={locale === "fr" ? "Dernière vue" : "Last seen"} value={fmtDate(stats.lastSeen, locale)} />
              <Stat icon={Coins}    label={locale === "fr" ? "Solde" : "Balance"}          value={stats.money != null ? stats.money.toLocaleString() : "—"} />
              <Stat icon={Dice5}    label={locale === "fr" ? "Casino (net)" : "Casino net"} value={stats.casinoNet != null ? stats.casinoNet.toLocaleString() : "—"} />
              <Stat icon={Skull}    label={locale === "fr" ? "Morts" : "Deaths"}           value={stats.deaths.toLocaleString()} />
              {stats.extra && <>
                <Stat icon={Sword}  label={locale === "fr" ? "Kills" : "Kills"}            value={stats.extra.kills.toLocaleString()} />
                <Stat icon={Sword}  label="Killstreak"                                     value={stats.extra.killstreak.toLocaleString()} />
                <Stat icon={Users}  label={locale === "fr" ? "Connexions" : "Joins"}       value={stats.extra.joinCount.toLocaleString()} />
                <Stat icon={Zap}    label={locale === "fr" ? "Puissance" : "Power"}        value={stats.extra.power.toLocaleString(undefined, { maximumFractionDigits: 1 })} />
                <Stat icon={Crown}  label="Prestige"                                       value={`P${stats.extra.prestige}`} />
              </>}
            </div>

            {stats.extra?.faction && (
              <div className="mc-card p-5 mb-5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-3">
                  <Flag size={12} className="text-pink" />{locale === "fr" ? "Faction" : "Faction"}
                </div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-text">{stats.extra.faction.name}</p>
                    <p className="text-[12px] text-text-sub capitalize">{stats.extra.faction.role}{stats.extra.faction.leader ? ` · ${locale === "fr" ? "Chef" : "Leader"}: ${stats.extra.faction.leader}` : ""}</p>
                    {stats.extra.faction.description && (
                      <p className="text-[12px] text-text-muted mt-1 italic">&ldquo;{stats.extra.faction.description}&rdquo;</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-text-muted uppercase">{locale === "fr" ? "Puissance" : "Power"}</p>
                    <p className="text-[18px] font-bold text-pink">{stats.extra.faction.power.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="bg-bg-soft rounded-lg p-2.5 flex items-center justify-between">
                    <span className="text-text-sub">{locale === "fr" ? "Membres" : "Members"}</span>
                    <span className="font-semibold text-text">{stats.extra.faction.members}{stats.extra.faction.maxMembers ? ` / ${stats.extra.faction.maxMembers}` : ""}</span>
                  </div>
                  <div className="bg-bg-soft rounded-lg p-2.5 flex items-center justify-between">
                    <span className="text-text-sub">{locale === "fr" ? "Alliés" : "Allies"}</span>
                    <span className="font-semibold text-text">{stats.extra.faction.allies.length}</span>
                  </div>
                </div>
                {stats.extra.faction.allies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {stats.extra.faction.allies.map((a) => (
                      <span key={a} className="text-[11px] px-2 py-0.5 rounded-full bg-violet/10 text-violet">{a}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {stats.extra && stats.extra.jobs.length > 0 && (
              <div className="mc-card p-5 mb-5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-3">
                  <Briefcase size={12} className="text-pink" />{locale === "fr" ? "Métiers" : "Jobs"}
                  <span className="ml-auto text-text-muted normal-case tracking-normal">{stats.extra.jobs.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {stats.extra.jobs.map((j) => {
                    const pct = j.maxXp > 0 ? Math.min(100, Math.round((j.xp / j.maxXp) * 100)) : 0;
                    return (
                      <div key={j.name} className="bg-bg-soft rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[13px] font-medium text-text capitalize">{j.name}</span>
                          <span className="text-[12px] text-text-sub">Lv. {j.level}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white overflow-hidden">
                          <div className="h-full bg-pink" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-text-muted mt-1">
                          {j.xp.toLocaleString(undefined, { maximumFractionDigits: 0 })} / {j.maxXp > 0 ? j.maxXp.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"} XP
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {stats.extra && Object.keys(stats.extra.stats).length > 0 && (
              <StatsBreakdown stats={stats.extra.stats} locale={locale} />
            )}

            <div className="mc-card p-5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-3">
                <Sparkles size={12} className="text-pink" />{locale === "fr" ? "Cosmétiques" : "Cosmetics"}
                <span className="ml-auto text-text-muted normal-case tracking-normal">{stats.cosmetics.length}</span>
              </div>
              {stats.cosmetics.length === 0 ? (
                <p className="text-[12px] text-text-muted">{locale === "fr" ? "Aucun cosmétique." : "No cosmetics."}</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(cosmeticsByType).map(([type, items]) => (
                    <div key={type}>
                      <div className="text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-2">
                        {COSMETIC_TYPE_LABEL[type] ?? type} <span className="text-text-muted">({items.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {items.map((c) => (
                          <span
                            key={c.fullId}
                            className={`text-[12px] px-2.5 py-1 rounded-full border ${
                              c.active
                                ? "bg-pink/10 border-pink/30 text-pink font-semibold"
                                : "bg-white border-border text-text-sub"
                            }`}
                            title={c.fullId}
                          >
                            {c.name || c.identifier}
                            {c.active && <span className="ml-1">●</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Staff-only section */}
            {canAdmin("analytics.view") && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-pink flex items-center gap-1.5">
                    <ShieldCheck size={12} />{locale === "fr" ? "Vue staff" : "Staff view"}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Identities + raw IDs */}
                <div className="mc-card p-5 mb-4">
                  <h3 className="text-[13px] font-semibold text-text mb-3">{locale === "fr" ? "Identifiants & identités" : "IDs & identities"}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-bg-soft/40">
                      <div className="w-9 h-9 rounded-lg bg-pink/10 text-pink flex items-center justify-center shrink-0"><Users size={16} /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-text-muted uppercase">In-game</p>
                        <p className="text-[13px] font-semibold text-text truncate">{stats.username}</p>
                        <p className="text-[11px] text-text-muted">{stats.platform}</p>
                      </div>
                    </div>
                    <div className={`flex items-start gap-3 p-3 rounded-xl border ${link ? "border-blue-200 bg-blue-50/50" : "border-border bg-bg-soft/40"}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${link ? "bg-[#00A4EF]/10 text-[#00A4EF]" : "bg-bg-soft text-text-muted"}`}>
                        <Gamepad2 size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-text-muted uppercase">Microsoft</p>
                        {link ? (
                          <>
                            <p className="text-[13px] font-semibold text-text truncate">{link.microsoftGamertag || link.microsoftDisplayName || "—"}</p>
                            {link.linkedSince && <p className="text-[11px] text-text-muted">{locale === "fr" ? "Lié le" : "Linked"} {fmtDate(link.linkedSince, locale)}</p>}
                          </>
                        ) : <p className="text-[12px] text-text-muted">{locale === "fr" ? "Non lié" : "Not linked"}</p>}
                      </div>
                    </div>
                    <div className={`flex items-start gap-3 p-3 rounded-xl border ${admin?.staff?.discord_id ? "border-indigo-200 bg-indigo-50/50" : "border-border bg-bg-soft/40"}`}>
                      {admin?.staff?.discord_id && admin.staff.discord_avatar ? (
                        <Image src={`https://cdn.discordapp.com/avatars/${admin.staff.discord_id}/${admin.staff.discord_avatar}.png?size=64`} alt="" width={36} height={36} className="w-9 h-9 rounded-lg shrink-0" unoptimized />
                      ) : (
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${admin?.staff?.discord_id ? "bg-indigo-500/10 text-indigo-600" : "bg-bg-soft text-text-muted"}`}>
                          <ShieldCheck size={16} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-text-muted uppercase">Discord</p>
                        {admin?.staff?.discord_id ? (
                          <>
                            <p className="text-[13px] font-semibold text-text truncate">{admin.staff.discord_username || "—"}</p>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider mt-0.5 ${ROLE_COLORS[admin.staff.role].bg} ${ROLE_COLORS[admin.staff.role].text}`}>
                              {ROLE_LABELS[admin.staff.role].fr}
                              {admin.staff.source === "ingame" && <span className="opacity-60 normal-case">·sync</span>}
                            </span>
                          </>
                        ) : <p className="text-[12px] text-text-muted">{locale === "fr" ? "Non lié" : "Not linked"}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono text-text-muted">
                    <div><span className="text-text-sub font-sans font-semibold uppercase text-[10px] tracking-wider">uuid</span> · {stats.uuid}</div>
                    <div><span className="text-text-sub font-sans font-semibold uppercase text-[10px] tracking-wider">xuid</span> · {stats.xuid || "—"}</div>
                  </div>
                </div>

                {/* Sanctions */}
                {admin && admin.sanctions.length > 0 && (
                  <div className="mc-card p-5 mb-4">
                    <h3 className="text-[13px] font-semibold text-text mb-3 flex items-center gap-2">
                      <ShieldAlert size={14} className="text-red-500" />
                      {locale === "fr" ? "Sanctions" : "Sanctions"}
                      <span className="text-[11px] text-text-muted font-normal">({admin.sanctions.length})</span>
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="border-b border-border bg-bg-soft">
                            <th className="text-left px-3 py-2 font-semibold text-text-sub">Type</th>
                            <th className="text-left px-3 py-2 font-semibold text-text-sub">{locale === "fr" ? "Raison" : "Reason"}</th>
                            <th className="text-left px-3 py-2 font-semibold text-text-sub">Staff</th>
                            <th className="text-left px-3 py-2 font-semibold text-text-sub">{locale === "fr" ? "Durée" : "Duration"}</th>
                            <th className="text-left px-3 py-2 font-semibold text-text-sub">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {admin.sanctions.map((s) => {
                            const typeColors: Record<string, string> = {
                              ban: "bg-red-500/10 text-red-500", unban: "bg-green-500/10 text-green-500",
                              mute: "bg-orange-500/10 text-orange-500", unmute: "bg-emerald-500/10 text-emerald-500",
                              kick: "bg-yellow-500/10 text-yellow-600",
                            };
                            return (
                              <tr key={s.id} className="border-b border-border/50">
                                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${typeColors[s.type] || "bg-gray-500/10 text-gray-500"}`}>{s.type}</span></td>
                                <td className="px-3 py-2 text-text">{s.reason || "—"}</td>
                                <td className="px-3 py-2 text-text-sub">{s.staff || "—"}</td>
                                <td className="px-3 py-2 text-text-sub">{s.duration || "—"}</td>
                                <td className="px-3 py-2 text-text-sub">{fmtDateTime(s.timestamp, locale)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Aliases */}
                {admin && admin.aliases.length > 0 && (
                  <div className="mc-card p-5 mb-4">
                    <h3 className="text-[13px] font-semibold text-text mb-3 flex items-center gap-2">
                      <Users size={14} className="text-orange-500" />
                      {locale === "fr" ? "Doubles comptes" : "Alt accounts"}
                      <span className="text-[11px] text-text-muted font-normal">({admin.aliases.length})</span>
                    </h3>
                    <div className="space-y-2">
                      {admin.aliases.map((a) => (
                        <Link key={a.alias_uuid} href={`/${locale}/profile/${a.alias_xuid || a.alias_uuid}`}
                          className="flex items-center justify-between px-3 py-2 rounded-lg border border-border hover:border-pink/30 hover:bg-pink/5 transition-colors">
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-text truncate">{a.alias_name}</p>
                            <p className="text-[11px] text-text-muted font-mono truncate">{a.alias_uuid}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {a.match_via.split(",").map((m) => {
                              const key = m.trim();
                              const labels: Record<string, string> = locale === "fr"
                                ? { device_id: "Même appareil", common_ip: "IP commune", last_ip: "Même IP" }
                                : { device_id: "Same device", common_ip: "Common IP", last_ip: "Same IP" };
                              return <span key={key} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-500/10 text-orange-500">{labels[key] || key}</span>;
                            })}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity tabs */}
                {admin && (
                  <div className="mc-card p-5">
                    <h3 className="text-[13px] font-semibold text-text mb-3">{locale === "fr" ? "Activité" : "Activity"}</h3>
                    <div className="flex items-center gap-1 mb-3 overflow-x-auto">
                      {([
                        { k: "sessions" as const, icon: Clock, label: "Sessions", count: admin.sessions.length },
                        { k: "commands" as const, icon: Terminal, label: locale === "fr" ? "Commandes" : "Commands", count: admin.commands.length },
                        { k: "messages" as const, icon: MessageSquare, label: "Messages", count: admin.messages.length },
                        { k: "deaths" as const, icon: Skull, label: locale === "fr" ? "Morts" : "Deaths", count: admin.deaths.length },
                      ]).map((t) => {
                        const Icon = t.icon;
                        return (
                          <button key={t.k} onClick={() => setAdminTab(t.k)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors whitespace-nowrap ${
                              adminTab === t.k ? "bg-pink/10 text-pink" : "text-text-sub hover:bg-bg-soft"
                            }`}>
                            <Icon size={13} />{t.label}<span className="text-[10px] opacity-60">({t.count})</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="overflow-x-auto">
                      {adminTab === "sessions" && (
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="border-b border-border bg-bg-soft">
                              <th className="text-left px-3 py-2 font-semibold text-text-sub">{locale === "fr" ? "Connexion" : "Join"}</th>
                              <th className="text-left px-3 py-2 font-semibold text-text-sub">{locale === "fr" ? "Déconnexion" : "Leave"}</th>
                              <th className="text-left px-3 py-2 font-semibold text-text-sub">{locale === "fr" ? "Durée" : "Duration"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {admin.sessions.slice(0, 15).map((s) => (
                              <tr key={s.id} className="border-b border-border/50">
                                <td className="px-3 py-2 text-text-sub">{fmtDateTime(s.join_time, locale)}</td>
                                <td className="px-3 py-2 text-text-sub">{s.leave_time ? fmtDateTime(s.leave_time, locale) : <span className="text-green-600 font-semibold">{locale === "fr" ? "En ligne" : "Online"}</span>}</td>
                                <td className="px-3 py-2 text-text-sub">{fmtDur(s.duration)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      {adminTab === "commands" && (
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="border-b border-border bg-bg-soft">
                              <th className="text-left px-3 py-2 font-semibold text-text-sub">{locale === "fr" ? "Commande" : "Command"}</th>
                              <th className="text-left px-3 py-2 font-semibold text-text-sub">Arguments</th>
                              <th className="text-left px-3 py-2 font-semibold text-text-sub">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {admin.commands.slice(0, 25).map((c, i) => (
                              <tr key={i} className="border-b border-border/50">
                                <td className="px-3 py-2 font-mono text-pink">/{c.command}</td>
                                <td className="px-3 py-2 text-text-sub font-mono truncate max-w-[240px]">{c.arguments || "—"}</td>
                                <td className="px-3 py-2 text-text-sub">{fmtDateTime(c.timestamp, locale)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      {adminTab === "messages" && (
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="border-b border-border bg-bg-soft">
                              <th className="text-left px-3 py-2 font-semibold text-text-sub">Message</th>
                              <th className="text-left px-3 py-2 font-semibold text-text-sub">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {admin.messages.slice(0, 25).map((m, i) => (
                              <tr key={i} className="border-b border-border/50">
                                <td className="px-3 py-2 text-text">{m.message}</td>
                                <td className="px-3 py-2 text-text-sub whitespace-nowrap">{fmtDateTime(m.timestamp, locale)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      {adminTab === "deaths" && (
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="border-b border-border bg-bg-soft">
                              <th className="text-left px-3 py-2 font-semibold text-text-sub">{locale === "fr" ? "Cause" : "Cause"}</th>
                              <th className="text-left px-3 py-2 font-semibold text-text-sub">{locale === "fr" ? "Monde" : "World"}</th>
                              <th className="text-left px-3 py-2 font-semibold text-text-sub">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {admin.deaths.slice(0, 25).map((d, i) => (
                              <tr key={i} className="border-b border-border/50">
                                <td className="px-3 py-2 text-text">{d.cause}</td>
                                <td className="px-3 py-2 text-text-sub">{d.world || "—"}</td>
                                <td className="px-3 py-2 text-text-sub">{fmtDateTime(d.timestamp, locale)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
      <Footer />
    </main>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }) {
  return (
    <div className="mc-card p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-1">
        <Icon size={12} className="text-pink" />{label}
      </div>
      <div className="text-xl font-bold text-text">{value}</div>
    </div>
  );
}

type IconCmp = React.ComponentType<{ size?: number; className?: string }>;
const STAT_GROUPS: { title: { fr: string; en: string }; icon: IconCmp; keys: { key: string; fr: string; en: string }[] }[] = [
  {
    title: { fr: "Combat", en: "Combat" }, icon: Sword,
    keys: [
      { key: "kills", fr: "Kills", en: "Kills" },
      { key: "deaths", fr: "Morts", en: "Deaths" },
      { key: "killstreak", fr: "Killstreak", en: "Killstreak" },
      { key: "damage_dealt", fr: "Dégâts infligés", en: "Damage dealt" },
      { key: "critical_hit", fr: "Coups critiques", en: "Crits" },
      { key: "bow_use", fr: "Tirs à l’arc", en: "Bow shots" },
      { key: "pearl", fr: "Perles lancées", en: "Pearls" },
      { key: "stick_used", fr: "Bâtons utilisés", en: "Sticks used" },
      { key: "gapple", fr: "Gapples mangées", en: "Gapples eaten" },
      { key: "healing_heart", fr: "Cœurs régénérés", en: "Hearts healed" },
    ],
  },
  {
    title: { fr: "Mine", en: "Mining" }, icon: Pickaxe,
    keys: [
      { key: "mine", fr: "Blocs minés", en: "Blocks mined" },
      { key: "place", fr: "Blocs posés", en: "Blocks placed" },
      { key: "coal_ore", fr: "Minerai charbon / bois", en: "Coal / wood" },
      { key: "emerald_ore", fr: "Émeraudes", en: "Emeralds" },
      { key: "amethyste_ore", fr: "Améthystes", en: "Amethysts" },
      { key: "rubis_ore", fr: "Rubis", en: "Rubies" },
    ],
  },
  {
    title: { fr: "Ferme", en: "Farming" }, icon: Wheat,
    keys: [
      { key: "wheat", fr: "Blé", en: "Wheat" },
      { key: "beetroot", fr: "Betteraves", en: "Beetroot" },
      { key: "potatoes", fr: "Pommes de terre", en: "Potatoes" },
      { key: "carrots", fr: "Carottes", en: "Carrots" },
      { key: "pumpkin", fr: "Citrouilles", en: "Pumpkins" },
      { key: "melon", fr: "Pastèques", en: "Melons" },
      { key: "nether_wart", fr: "Nether wart", en: "Nether wart" },
    ],
  },
  {
    title: { fr: "Mobs", en: "Mobs" }, icon: Target,
    keys: [
      { key: "zombie", fr: "Zombies", en: "Zombies" },
      { key: "pigman", fr: "Zombie-cochons", en: "Pigmen" },
      { key: "wither", fr: "Wither skeletons", en: "Wither skeletons" },
    ],
  },
  {
    title: { fr: "Pêche & artisanat", en: "Fishing & crafting" }, icon: Fish,
    keys: [
      { key: "fish", fr: "Poissons pêchés", en: "Fish caught" },
      { key: "fishstreak", fr: "Streak pêche", en: "Fish streak" },
      { key: "repair", fr: "Réparations", en: "Repairs" },
      { key: "enchant", fr: "Enchantements", en: "Enchants" },
      { key: "recycler_nugget", fr: "Nuggets recyclés", en: "Nuggets recycled" },
    ],
  },
  {
    title: { fr: "Activité", en: "Activity" }, icon: Footprints,
    keys: [
      { key: "walk", fr: "Pas", en: "Steps" },
      { key: "message", fr: "Messages", en: "Messages" },
      { key: "switchball", fr: "Switch-balls", en: "Switch-balls" },
      { key: "vote_streak", fr: "Streak votes", en: "Vote streak" },
      { key: "shop_gain", fr: "Gains shop", en: "Shop gains" },
    ],
  },
];

function StatsBreakdown({ stats, locale }: { stats: Record<string, number | string>; locale: string }) {
  return (
    <div className="mc-card p-5 mb-5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-3">
        <Activity size={12} className="text-pink" />{locale === "fr" ? "Statistiques détaillées" : "Detailed stats"}
      </div>
      <div className="space-y-4">
        {STAT_GROUPS.map((g) => {
          const Icon = g.icon;
          const rows = g.keys.filter((k) => {
            const v = stats[k.key];
            return typeof v === "number" ? v > 0 : (typeof v === "string" && v !== "");
          });
          if (rows.length === 0) return null;
          return (
            <div key={g.title.en}>
              <div className="text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Icon size={12} className="text-pink" />{locale === "fr" ? g.title.fr : g.title.en}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {rows.map((k) => {
                  const v = stats[k.key];
                  const display = typeof v === "number" ? v.toLocaleString() : String(v);
                  return (
                    <div key={k.key} className="bg-bg-soft rounded-lg p-2.5 flex items-center justify-between">
                      <span className="text-[12px] text-text-sub">{locale === "fr" ? k.fr : k.en}</span>
                      <span className="text-[13px] font-semibold text-text">{display}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
