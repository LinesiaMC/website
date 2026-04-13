"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Activity, Clock, Terminal, Globe, Skull, MessageSquare, ShieldAlert, Users, Gamepad2, Link2Off, ShieldCheck, Sparkles, Coins, Briefcase, Crown } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { createAnalyticsFetcher, formatDuration, formatDate } from "@/components/admin/AnalyticsAPI";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { INGAME_RANK_LABELS, IngameRank, ROLE_LABELS, ROLE_COLORS, StaffRole } from "@/lib/roles";

interface PlayerDetail {
  player: {
    uuid: string;
    xuid?: string | null;
    username: string;
    platform: string;
    first_seen: number;
    last_seen: number;
    total_playtime: number;
    session_count: number;
  };
  sessions: { id: number; join_time: number; leave_time: number | null; duration: number; platform: string }[];
  commands: { command: string; arguments: string; world: string; timestamp: number }[];
  worlds: { world_name: string; enter_time: number; duration: number }[];
  deaths: { cause: string; world: string; x: number; y: number; z: number; timestamp: number }[];
  messages: { message: string; world: string; timestamp: number }[];
  commandStats: { command: string; count: number }[];
  worldStats: { world_name: string; total_time: number; visits: number }[];
  sanctions: { id: number; type: string; reason: string; staff: string; duration: string; timestamp: number }[];
  aliases: { alias_uuid: string; alias_name: string; alias_xuid: string; match_via: string; updated_at: number }[];
  profileExtra: null | {
    rank: string | null;
    prestige: number;
    money: number;
    kills: number;
    deaths: number;
    killstreak: number;
    jobs: string | null;
    join_count: number;
    first_join: string | null;
    last_leave: string | null;
  };
  cosmetics: { type: string; identifier: string; name: string | null; active: number }[];
  account: null | {
    id: string;
    microsoft_id: string | null;
    microsoft_gamertag: string | null;
    microsoft_display_name: string | null;
    created_at: number;
    last_login: number | null;
  };
  staff: null | {
    id: string;
    role: StaffRole;
    source: "manual" | "ingame";
    discord_id: string | null;
    discord_username: string | null;
    discord_avatar: string | null;
    microsoft_gamertag: string | null;
    display_name: string | null;
  };
}

export default function PlayerDetailPage() {
  const { locale, uuid } = useParams<{ locale: string; uuid: string }>();
  const { headers } = useAdmin();
  const [data, setData] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"sessions" | "commands" | "worlds" | "deaths" | "messages">("sessions");
  const api = useRef(createAnalyticsFetcher(headers)).current;

  const loadData = useCallback(() => {
    api(`players/${uuid}`).then((d) => {
      setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [api, uuid]);

  useEffect(() => { loadData(); }, [loadData]);
  useAutoRefresh(loadData);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Activity size={32} className="text-pink animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <p className="text-text-muted">{locale === "fr" ? "Joueur introuvable" : "Player not found"}</p>
      </div>
    );
  }

  const { player, profileExtra, cosmetics, account, staff } = data;
  const rankInfo = profileExtra?.rank ? INGAME_RANK_LABELS[profileExtra.rank.toLowerCase() as IngameRank] : null;
  const jobs = (() => {
    if (!profileExtra?.jobs) return [] as { name: string; level?: number }[];
    try {
      const parsed = JSON.parse(profileExtra.jobs);
      if (Array.isArray(parsed)) return parsed.map((j) => typeof j === "string" ? { name: j } : j);
      if (parsed && typeof parsed === "object") {
        return Object.entries(parsed).map(([name, v]) => ({ name, level: typeof v === "number" ? v : (v as { level?: number })?.level }));
      }
    } catch { /* ignore */ }
    return profileExtra.jobs.split(",").map((s) => ({ name: s.trim() })).filter((j) => j.name);
  })();
  const activeCosmetics = cosmetics?.filter((c) => c.active) ?? [];
  const ownedCosmetics = cosmetics?.filter((c) => !c.active) ?? [];
  const discordAvatarUrl = staff?.discord_id && staff.discord_avatar
    ? `https://cdn.discordapp.com/avatars/${staff.discord_id}/${staff.discord_avatar}.png?size=64`
    : null;

  const tabs = [
    { key: "sessions" as const, label: "Sessions", icon: Clock, count: data.sessions.length },
    { key: "commands" as const, label: locale === "fr" ? "Commandes" : "Commands", icon: Terminal, count: data.commands.length },
    { key: "worlds" as const, label: locale === "fr" ? "Mondes" : "Worlds", icon: Globe, count: data.worlds.length },
    { key: "deaths" as const, label: locale === "fr" ? "Morts" : "Deaths", icon: Skull, count: data.deaths.length },
    { key: "messages" as const, label: "Messages", icon: MessageSquare, count: data.messages.length },
  ];

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8">
      {/* Back */}
      <a
        href={`/${locale}/admin/analytics/players`}
        className="inline-flex items-center gap-2 text-[13px] text-text-sub hover:text-pink transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        {locale === "fr" ? "Retour aux joueurs" : "Back to players"}
      </a>

      {/* Header */}
      <div className="mc-card p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-bold text-text">{player.username}</h1>
              {rankInfo && (
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                  style={{ color: rankInfo.color, backgroundColor: rankInfo.color + "1A" }}
                >
                  {rankInfo.fr}
                </span>
              )}
              {staff && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${ROLE_COLORS[staff.role].bg} ${ROLE_COLORS[staff.role].text}`}>
                  <ShieldCheck size={11} />{ROLE_LABELS[staff.role].fr}
                  {staff.source === "ingame" && <span className="opacity-60 normal-case ml-0.5">·sync</span>}
                </span>
              )}
              {profileExtra && profileExtra.prestige > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-pink/10 text-pink">
                  <Crown size={11} />P{profileExtra.prestige}
                </span>
              )}
            </div>
            <p className="text-[12px] text-text-muted font-mono">{player.uuid}</p>
            {player.xuid && <p className="text-[11px] text-text-muted font-mono">xuid: {player.xuid}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {data.sanctions.length > 0 && (
              <span className="px-3 py-1 rounded-lg bg-red-500/10 text-red-500 text-[12px] font-semibold flex items-center gap-1.5">
                <ShieldAlert size={13} />
                {data.sanctions.length} {locale === "fr" ? "sanction(s)" : "sanction(s)"}
              </span>
            )}
            {data.aliases.length > 0 && (
              <span className="px-3 py-1 rounded-lg bg-orange-500/10 text-orange-500 text-[12px] font-semibold flex items-center gap-1.5">
                <Users size={13} />
                {data.aliases.length} {locale === "fr" ? "double(s) compte" : "alt(s)"}
              </span>
            )}
            <span className="px-3 py-1 rounded-lg bg-pink/10 text-pink text-[12px] font-semibold">
              {player.platform}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div>
            <p className="text-[11px] text-text-muted uppercase">{locale === "fr" ? "Temps de jeu" : "Playtime"}</p>
            <p className="text-[16px] font-bold text-text">{formatDuration(player.total_playtime)}</p>
          </div>
          <div>
            <p className="text-[11px] text-text-muted uppercase">Sessions</p>
            <p className="text-[16px] font-bold text-text">{player.session_count}</p>
          </div>
          <div>
            <p className="text-[11px] text-text-muted uppercase">{locale === "fr" ? "Premiere connexion" : "First seen"}</p>
            <p className="text-[16px] font-bold text-text">{formatDate(player.first_seen)}</p>
          </div>
          <div>
            <p className="text-[11px] text-text-muted uppercase">{locale === "fr" ? "Derniere connexion" : "Last seen"}</p>
            <p className="text-[16px] font-bold text-text">{formatDate(player.last_seen)}</p>
          </div>
        </div>
      </div>

      {/* Identities */}
      <div className="mc-card p-5 mb-6">
        <h3 className="text-[14px] font-semibold text-text mb-3">{locale === "fr" ? "Identités liées" : "Linked identities"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-bg-soft/40">
            <div className="w-9 h-9 rounded-lg bg-pink/10 text-pink flex items-center justify-center shrink-0">
              <Users size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-text-muted uppercase">In-game</p>
              <p className="text-[13px] font-semibold text-text truncate">{player.username}</p>
              <p className="text-[11px] text-text-muted">{player.platform}</p>
            </div>
          </div>

          <div className={`flex items-start gap-3 p-3 rounded-xl border ${account ? "border-blue-200 bg-blue-50/50" : "border-border bg-bg-soft/40"}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${account ? "bg-[#00A4EF]/10 text-[#00A4EF]" : "bg-bg-soft text-text-muted"}`}>
              {account ? <Gamepad2 size={16} /> : <Link2Off size={16} />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-text-muted uppercase">Microsoft</p>
              {account ? (
                <>
                  <p className="text-[13px] font-semibold text-text truncate">{account.microsoft_gamertag || account.microsoft_display_name || "—"}</p>
                  <p className="text-[11px] text-text-muted">{locale === "fr" ? "Lié le" : "Linked"} {formatDate(account.created_at)}</p>
                </>
              ) : (
                <p className="text-[12px] text-text-muted">{locale === "fr" ? "Non lié" : "Not linked"}</p>
              )}
            </div>
          </div>

          <div className={`flex items-start gap-3 p-3 rounded-xl border ${staff?.discord_id ? "border-indigo-200 bg-indigo-50/50" : "border-border bg-bg-soft/40"}`}>
            {discordAvatarUrl ? (
              <Image src={discordAvatarUrl} alt="" width={36} height={36} className="w-9 h-9 rounded-lg shrink-0" unoptimized />
            ) : (
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${staff?.discord_id ? "bg-indigo-500/10 text-indigo-600" : "bg-bg-soft text-text-muted"}`}>
                {staff?.discord_id ? <ShieldCheck size={16} /> : <Link2Off size={16} />}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-text-muted uppercase">Discord</p>
              {staff?.discord_id ? (
                <>
                  <p className="text-[13px] font-semibold text-text truncate">{staff.discord_username || staff.display_name || "—"}</p>
                  <p className="text-[11px] text-text-muted">{locale === "fr" ? "via staff" : "via staff"}</p>
                </>
              ) : (
                <p className="text-[12px] text-text-muted">{locale === "fr" ? "Non lié" : "Not linked"}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* In-game profile */}
      {profileExtra && (
        <div className="mc-card p-5 mb-6">
          <h3 className="text-[14px] font-semibold text-text mb-3">{locale === "fr" ? "Profil en jeu" : "In-game profile"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-[11px] text-text-muted uppercase flex items-center gap-1"><Coins size={11} />{locale === "fr" ? "Argent" : "Money"}</p>
              <p className="text-[16px] font-bold text-text">{(profileExtra.money ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[11px] text-text-muted uppercase">Kills / Deaths</p>
              <p className="text-[16px] font-bold text-text">{profileExtra.kills} / {profileExtra.deaths}</p>
            </div>
            <div>
              <p className="text-[11px] text-text-muted uppercase">Killstreak</p>
              <p className="text-[16px] font-bold text-text">{profileExtra.killstreak ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px] text-text-muted uppercase">Prestige</p>
              <p className="text-[16px] font-bold text-text">{profileExtra.prestige ?? 0}</p>
            </div>
          </div>
          {jobs.length > 0 && (
            <div>
              <p className="text-[11px] text-text-muted uppercase flex items-center gap-1 mb-2"><Briefcase size={11} />Jobs</p>
              <div className="flex flex-wrap gap-2">
                {jobs.map((j, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet/10 text-violet text-[12px] font-semibold">
                    {j.name}{j.level != null && <span className="opacity-70">Lv.{j.level}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cosmetics */}
      {(activeCosmetics.length > 0 || ownedCosmetics.length > 0) && (
        <div className="mc-card p-5 mb-6">
          <h3 className="text-[14px] font-semibold text-text mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-pink" />
            {locale === "fr" ? "Cosmétiques" : "Cosmetics"}
            <span className="text-[11px] text-text-muted font-normal">
              {activeCosmetics.length} {locale === "fr" ? "actifs" : "active"} · {ownedCosmetics.length} {locale === "fr" ? "possédés" : "owned"}
            </span>
          </h3>
          {activeCosmetics.length > 0 && (
            <div className="mb-3">
              <p className="text-[11px] font-bold text-text-muted uppercase mb-2">{locale === "fr" ? "Actifs" : "Active"}</p>
              <div className="flex flex-wrap gap-2">
                {activeCosmetics.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink/10 text-pink text-[12px] font-semibold">
                    <span className="opacity-60">{c.type}</span>·{c.name || c.identifier}
                  </span>
                ))}
              </div>
            </div>
          )}
          {ownedCosmetics.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-text-muted uppercase mb-2">{locale === "fr" ? "Possédés" : "Owned"}</p>
              <div className="flex flex-wrap gap-1.5">
                {ownedCosmetics.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-bg-soft text-text-sub text-[11px]">
                    <span className="opacity-60">{c.type}</span>·{c.name || c.identifier}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Command Stats */}
        {data.commandStats.length > 0 && (
          <div className="mc-card p-5">
            <h3 className="text-[14px] font-semibold text-text mb-3">{locale === "fr" ? "Top commandes" : "Top Commands"}</h3>
            <div className="space-y-2">
              {data.commandStats.slice(0, 8).map((c) => {
                const max = data.commandStats[0].count;
                return (
                  <div key={c.command} className="flex items-center gap-3">
                    <span className="text-[12px] text-text-sub w-20 truncate">/{c.command}</span>
                    <div className="flex-1 h-2 bg-bg-soft rounded-full overflow-hidden">
                      <div className="h-full bg-pink rounded-full" style={{ width: `${(c.count / max) * 100}%` }} />
                    </div>
                    <span className="text-[11px] font-semibold text-text w-8 text-right">{c.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* World Stats */}
        {data.worldStats.length > 0 && (
          <div className="mc-card p-5">
            <h3 className="text-[14px] font-semibold text-text mb-3">{locale === "fr" ? "Temps par monde" : "Time per World"}</h3>
            <div className="space-y-2">
              {data.worldStats.map((w) => {
                const max = data.worldStats[0].total_time || 1;
                return (
                  <div key={w.world_name} className="flex items-center gap-3">
                    <span className="text-[12px] text-text-sub w-20 truncate">{w.world_name}</span>
                    <div className="flex-1 h-2 bg-bg-soft rounded-full overflow-hidden">
                      <div className="h-full bg-violet rounded-full" style={{ width: `${(w.total_time / max) * 100}%` }} />
                    </div>
                    <span className="text-[11px] font-semibold text-text w-16 text-right">{formatDuration(w.total_time)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sanctions */}
      {data.sanctions.length > 0 && (
        <div className="mc-card p-5 mb-6">
          <h3 className="text-[14px] font-semibold text-text mb-3 flex items-center gap-2">
            <ShieldAlert size={16} className="text-red-500" />
            {locale === "fr" ? "Historique des sanctions" : "Sanctions History"}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-bg-soft">
                  <th className="text-left px-4 py-2.5 font-semibold text-text-sub">Type</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Raison" : "Reason"}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-text-sub">Staff</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Duree" : "Duration"}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-text-sub">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.sanctions.map((s) => {
                  const typeColors: Record<string, string> = {
                    ban: "bg-red-500/10 text-red-500",
                    unban: "bg-green-500/10 text-green-500",
                    mute: "bg-orange-500/10 text-orange-500",
                    unmute: "bg-emerald-500/10 text-emerald-500",
                    kick: "bg-yellow-500/10 text-yellow-600",
                  };
                  const typeLabels: Record<string, string> = {
                    ban: "Ban",
                    unban: "Unban",
                    mute: "Mute",
                    unmute: "Unmute",
                    kick: "Kick",
                  };
                  return (
                    <tr key={s.id} className="border-b border-border/50">
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${typeColors[s.type] || "bg-gray-500/10 text-gray-500"}`}>
                          {typeLabels[s.type] || s.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-text">{s.reason || "-"}</td>
                      <td className="px-4 py-2.5 text-text-sub">{s.staff || "-"}</td>
                      <td className="px-4 py-2.5 text-text-sub">{s.duration || "-"}</td>
                      <td className="px-4 py-2.5 text-text-sub">{formatDate(s.timestamp)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Aliases / Double comptes */}
      {data.aliases.length > 0 && (
        <div className="mc-card p-5 mb-6">
          <h3 className="text-[14px] font-semibold text-text mb-3 flex items-center gap-2">
            <Users size={16} className="text-orange-500" />
            {locale === "fr" ? "Doubles comptes (alias)" : "Alt Accounts (Aliases)"}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-bg-soft">
                  <th className="text-left px-4 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Joueur" : "Player"}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Correspondance" : "Match"}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Derniere connexion" : "Last Seen"}</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-text-sub"></th>
                </tr>
              </thead>
              <tbody>
                {data.aliases.map((a) => (
                  <tr key={a.alias_uuid} className="border-b border-border/50">
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-text">{a.alias_name}</span>
                      <p className="text-[11px] text-text-muted font-mono">{a.alias_uuid}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      {a.match_via.split(",").map((m) => {
                        const key = m.trim();
                        const labels: Record<string, string> = locale === "fr"
                          ? { device_id: "Meme appareil", common_ip: "IP commune", last_ip: "Meme IP" }
                          : { device_id: "Same device", common_ip: "Common IP", last_ip: "Same IP" };
                        return (
                          <span key={key} className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-500/10 text-orange-500 mr-1">
                            {labels[key] || key}
                          </span>
                        );
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-text-sub">{formatDate(a.updated_at)}</td>
                    <td className="px-4 py-2.5">
                      <a
                        href={`/${locale}/admin/analytics/players/${a.alias_uuid}`}
                        className="text-pink hover:underline text-[12px] font-medium"
                      >
                        {locale === "fr" ? "Voir" : "View"}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-colors whitespace-nowrap ${
                tab === t.key ? "bg-pink/10 text-pink" : "text-text-sub hover:bg-bg-soft"
              }`}
            >
              <Icon size={14} />
              {t.label}
              <span className="text-[11px] opacity-60">({t.count})</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mc-card overflow-hidden">
        {tab === "sessions" && (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-bg-soft">
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Connexion" : "Join"}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Deconnexion" : "Leave"}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Duree" : "Duration"}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Plateforme" : "Platform"}</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s) => (
                <tr key={s.id} className="border-b border-border/50">
                  <td className="px-4 py-2.5 text-text-sub">{formatDate(s.join_time)}</td>
                  <td className="px-4 py-2.5 text-text-sub">{s.leave_time ? formatDate(s.leave_time) : <span className="text-green font-semibold">En ligne</span>}</td>
                  <td className="px-4 py-2.5 text-text-sub">{formatDuration(s.duration)}</td>
                  <td className="px-4 py-2.5 text-text-sub">{s.platform}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "commands" && (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-bg-soft">
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Commande" : "Command"}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">Arguments</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Monde" : "World"}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.commands.map((c, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-4 py-2.5 font-mono text-pink">/{c.command}</td>
                  <td className="px-4 py-2.5 text-text-sub font-mono">{c.arguments || "-"}</td>
                  <td className="px-4 py-2.5 text-text-sub">{c.world || "-"}</td>
                  <td className="px-4 py-2.5 text-text-sub">{formatDate(c.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "worlds" && (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-bg-soft">
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Monde" : "World"}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Entree" : "Enter"}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Duree" : "Duration"}</th>
              </tr>
            </thead>
            <tbody>
              {data.worlds.map((w, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-4 py-2.5 font-semibold text-text">{w.world_name}</td>
                  <td className="px-4 py-2.5 text-text-sub">{formatDate(w.enter_time)}</td>
                  <td className="px-4 py-2.5 text-text-sub">{formatDuration(w.duration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "deaths" && (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-bg-soft">
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Cause" : "Cause"}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Monde" : "World"}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">Position</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.deaths.map((d, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-4 py-2.5 text-text">{d.cause}</td>
                  <td className="px-4 py-2.5 text-text-sub">{d.world || "-"}</td>
                  <td className="px-4 py-2.5 text-text-sub font-mono text-[11px]">{d.x}, {d.y}, {d.z}</td>
                  <td className="px-4 py-2.5 text-text-sub">{formatDate(d.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "messages" && (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-bg-soft">
                <th className="text-left px-4 py-3 font-semibold text-text-sub">Message</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Monde" : "World"}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.messages.map((m, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-4 py-2.5 text-text">{m.message}</td>
                  <td className="px-4 py-2.5 text-text-sub">{m.world || "-"}</td>
                  <td className="px-4 py-2.5 text-text-sub">{formatDate(m.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
