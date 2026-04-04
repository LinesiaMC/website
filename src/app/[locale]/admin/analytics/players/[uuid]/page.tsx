"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Activity, Clock, Terminal, Globe, Skull, MessageSquare, ShieldAlert, Users } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { createAnalyticsFetcher, formatDuration, formatDate } from "@/components/admin/AnalyticsAPI";
import { useAutoRefresh } from "@/lib/useAutoRefresh";

interface PlayerDetail {
  player: {
    uuid: string;
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
  aliases: { player_uuid: string; player_name: string; xuid: string; device_id: string; ip_hash: string; last_seen: number; match_via: string }[];
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

  const { player } = data;

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text">{player.username}</h1>
            <p className="text-[12px] text-text-muted font-mono mt-1">{player.uuid}</p>
          </div>
          <div className="flex items-center gap-2">
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
                  <tr key={a.player_uuid} className="border-b border-border/50">
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-text">{a.player_name}</span>
                      <p className="text-[11px] text-text-muted font-mono">{a.player_uuid}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      {a.match_via.split(", ").map((m) => (
                        <span key={m} className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-500/10 text-orange-500 mr-1">
                          {m === "device_id" ? (locale === "fr" ? "Meme appareil" : "Same device") : m === "ip" ? (locale === "fr" ? "Meme IP" : "Same IP") : m}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-2.5 text-text-sub">{formatDate(a.last_seen)}</td>
                    <td className="px-4 py-2.5">
                      <a
                        href={`/${locale}/admin/analytics/players/${a.player_uuid}`}
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
