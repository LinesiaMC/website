"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert, ShieldCheck, ShieldX, Activity, AlertTriangle,
  ArrowLeft, Target, Clock, Crosshair, Move, Network, Wrench, HelpCircle,
  Gauge, Percent, BarChart3, UserCircle, Server,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { createAnalyticsFetcher, formatNumber, formatDate, formatDuration } from "@/components/admin/AnalyticsAPI";
import { useAutoRefresh } from "@/lib/useAutoRefresh";

type Reliability = "high" | "medium" | "low" | "experimental";
type Severity = "high" | "medium" | "low";

interface PlayerInfo {
  uuid: string;
  username: string;
  platform: string | null;
  last_seen: number;
  first_seen: number;
  total_playtime: number;
  session_count: number;
  xuid: string | null;
}

interface StatRow {
  detection: string;
  category: string;
  reliability: Reliability;
  severity: Severity;
  count: number;
  violations_total: number;
  first_flag_at: number;
  last_flag_at: number;
  last_debug: string | null;
  server_id: string | null;
}

interface EventRow {
  id: number;
  detection: string;
  category: string;
  reliability: Reliability;
  severity: Severity;
  violation: number;
  violations_total: number;
  cheat_probability: number;
  debug: string | null;
  ping: number | null;
  platform: string | null;
  timestamp: number;
  server_id: string | null;
}

interface DetailResponse {
  player: PlayerInfo | null;
  totals: {
    total_flags: number;
    total_violations: number;
    detection_types: number;
    first_flag_at: number;
    last_flag_at: number;
    high_rel_flags: number;
    medium_rel_flags: number;
    low_rel_flags: number;
    exp_rel_flags: number;
  };
  cheatProbability: number;
  reliabilityScore: number;
  peerStats: { mean: number; stdDev: number; sampleSize: number; rank: number; percentile: number };
  stats: StatRow[];
  events: EventRow[];
}

const RELIABILITY_META: Record<string, { fr: string; en: string; color: string; bg: string; text: string; icon: typeof ShieldCheck }> = {
  high:         { fr: "Fiable",            en: "Reliable",            color: "#16A34A", bg: "bg-green/10",  text: "text-green",        icon: ShieldCheck },
  medium:       { fr: "Modérément fiable", en: "Moderately reliable", color: "#F59E0B", bg: "bg-yellow-50", text: "text-yellow-600",   icon: ShieldAlert },
  low:          { fr: "Peu fiable",        en: "Low reliability",     color: "#F97316", bg: "bg-orange-50", text: "text-orange-500",   icon: AlertTriangle },
  experimental: { fr: "Expérimental",      en: "Experimental",        color: "#94A3B8", bg: "bg-slate-100", text: "text-slate-500",    icon: HelpCircle },
};

const SEVERITY_META: Record<string, { fr: string; en: string; color: string }> = {
  high:   { fr: "Sévère",  en: "Severe", color: "#DC2626" },
  medium: { fr: "Modérée", en: "Medium", color: "#F59E0B" },
  low:    { fr: "Faible",  en: "Low",    color: "#64748B" },
};

const CATEGORY_META: Record<string, { fr: string; en: string; icon: typeof Crosshair; color: string }> = {
  combat:   { fr: "Combat",     en: "Combat",   icon: Crosshair, color: "#EF4444" },
  movement: { fr: "Mouvement",  en: "Movement", icon: Move,      color: "#3B82F6" },
  network:  { fr: "Réseau",     en: "Network",  icon: Network,   color: "#8B5CF6" },
  misc:     { fr: "Divers",     en: "Misc",     icon: Wrench,    color: "#F59E0B" },
  unknown:  { fr: "Inconnu",    en: "Unknown",  icon: HelpCircle, color: "#94A3B8" },
};

function ReliabilityBadge({ reliability, locale }: { reliability: string; locale: string }) {
  const meta = RELIABILITY_META[reliability] || RELIABILITY_META.experimental;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.bg} ${meta.text}`}>
      <Icon size={11} />
      {meta[locale as "fr" | "en"] || meta.en}
    </span>
  );
}

function SeverityBadge({ severity, locale }: { severity: string; locale: string }) {
  const meta = SEVERITY_META[severity] || SEVERITY_META.low;
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
      style={{ backgroundColor: meta.color }}
    >
      {meta[locale as "fr" | "en"] || meta.en}
    </span>
  );
}

function CategoryPill({ category, locale }: { category: string; locale: string }) {
  const meta = CATEGORY_META[category] || CATEGORY_META.unknown;
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-text-sub">
      <Icon size={12} style={{ color: meta.color }} />
      {meta[locale as "fr" | "en"] || meta.en}
    </span>
  );
}

function timeAgo(ts: number, locale: string): string {
  if (!ts) return "-";
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return locale === "fr" ? `il y a ${sec}s` : `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return locale === "fr" ? `il y a ${min}m` : `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return locale === "fr" ? `il y a ${h}h` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return locale === "fr" ? `il y a ${d}j` : `${d}d ago`;
}

function verdict(probability: number, reliabilityScore: number, totalFlags: number, locale: string) {
  if (totalFlags === 0) {
    return { label: locale === "fr" ? "Aucune alerte" : "No alerts", color: "text-text-muted", bg: "bg-bg-soft", description: locale === "fr" ? "Ce joueur n'a déclenché aucune détection." : "This player has not triggered any detection." };
  }
  if (probability >= 80 && reliabilityScore >= 60) {
    return { label: locale === "fr" ? "Très probable" : "Very likely", color: "text-red-700", bg: "bg-red-100", description: locale === "fr" ? "Forte probabilité statistique + détections fiables. Sanction recommandée après vérification rapide." : "High statistical probability + reliable detections. Recommend acting after quick review." };
  }
  if (probability >= 60 || (totalFlags > 30 && reliabilityScore >= 60)) {
    return { label: locale === "fr" ? "Probable" : "Likely", color: "text-orange-600", bg: "bg-orange-50", description: locale === "fr" ? "Comportement clairement anormal. Vérification manuelle conseillée (vidéo / spectate)." : "Clearly abnormal behavior. Manual review advised (replay / spectate)." };
  }
  if (reliabilityScore < 30 && totalFlags < 20) {
    return { label: locale === "fr" ? "Peu fiable" : "Low signal", color: "text-text-sub", bg: "bg-bg-soft", description: locale === "fr" ? "Surtout des détections expérimentales. Aucune action sans contexte supplémentaire." : "Mostly experimental detections. Don't act without more context." };
  }
  return { label: locale === "fr" ? "À surveiller" : "Watch", color: "text-yellow-700", bg: "bg-yellow-50", description: locale === "fr" ? "Pas d'évidence claire mais signal au-dessus de la moyenne. Garder un œil." : "No clear evidence but signal above average. Keep an eye out." };
}

export default function PlayerAlertDetailPage() {
  const { locale, uuid } = useParams<{ locale: string; uuid: string }>();
  const { headers, can } = useAdmin();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const api = useRef(createAnalyticsFetcher(headers)).current;

  const loadData = useCallback(() => {
    api(`alerts/player/${uuid}`)
      .then((r) => { setData(r); setLoading(false); })
      .catch(() => { setError(locale === "fr" ? "Échec du chargement." : "Failed to load."); setLoading(false); });
  }, [api, uuid, locale]);

  useEffect(() => { loadData(); }, [loadData]);
  useAutoRefresh(loadData);

  if (!can("alerts.view")) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="mc-card p-8 text-center max-w-md">
          <ShieldX size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-[14px] text-text-sub">
            {locale === "fr" ? "Accès refusé." : "Access denied."}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Activity size={32} className="text-pink animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="mc-card p-8 text-center max-w-md">
          <Activity size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-[14px] text-text-sub">{error || (locale === "fr" ? "Aucune donnée." : "No data.")}</p>
        </div>
      </div>
    );
  }

  const { player, totals, cheatProbability, reliabilityScore, peerStats, stats, events } = data;
  const v = verdict(cheatProbability, reliabilityScore, totals.total_flags, locale);

  const reliableTotal = totals.high_rel_flags + totals.medium_rel_flags;
  const noisyTotal = totals.low_rel_flags + totals.exp_rel_flags;

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {/* Back link */}
      <Link
        href={`/${locale}/admin/analytics/alerts`}
        className="inline-flex items-center gap-1.5 text-[12px] text-text-muted hover:text-pink mb-4"
      >
        <ArrowLeft size={14} /> {locale === "fr" ? "Retour aux alertes" : "Back to alerts"}
      </Link>

      {/* Header */}
      <div className="mc-card p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink to-violet flex items-center justify-center shrink-0">
              <UserCircle size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text">{player?.username || (locale === "fr" ? "Joueur inconnu" : "Unknown player")}</h1>
              <p className="text-[11px] text-text-muted font-mono mt-0.5">{uuid}</p>
              {player && (
                <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-text-muted">
                  <span><Server size={11} className="inline mr-1" />{player.platform || "-"}</span>
                  <span><Clock size={11} className="inline mr-1" />{formatDuration(player.total_playtime)}</span>
                  <span>{player.session_count} {locale === "fr" ? "sessions" : "sessions"}</span>
                  <span>{locale === "fr" ? "Vu il y a" : "Seen"} {timeAgo(player.last_seen, locale)}</span>
                  {player.xuid && <span className="font-mono">XUID: {player.xuid}</span>}
                </div>
              )}
            </div>
          </div>
          <div className={`rounded-xl px-4 py-3 ${v.bg}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${v.color}`}>
              {locale === "fr" ? "Verdict" : "Verdict"}
            </p>
            <p className={`text-[18px] font-bold mt-0.5 ${v.color}`}>{v.label}</p>
          </div>
        </div>
        <p className="text-[12px] text-text-sub mt-4">{v.description}</p>
      </div>

      {/* Probability + Reliability + Peer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="mc-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Gauge size={14} className="text-pink" />
            <p className="text-[12px] text-text-muted">{locale === "fr" ? "Probabilité de cheat" : "Cheat probability"}</p>
          </div>
          <p className={`text-[36px] font-bold ${cheatProbability >= 70 ? "text-red-500" : cheatProbability >= 40 ? "text-orange-500" : "text-text"}`}>
            {cheatProbability}%
          </p>
          <p className="text-[11px] text-text-muted mt-1">
            {locale === "fr"
              ? "Score statistique basé sur la déviation par rapport à la moyenne du serveur."
              : "Statistical score based on deviation from server-wide mean."}
          </p>
          <div className="h-2 bg-bg-soft rounded-full overflow-hidden mt-3">
            <div
              className="h-full rounded-full"
              style={{
                width: `${cheatProbability}%`,
                backgroundColor: cheatProbability >= 70 ? "#EF4444" : cheatProbability >= 40 ? "#F97316" : "#94A3B8",
              }}
            />
          </div>
        </div>

        <div className="mc-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={14} className="text-green" />
            <p className="text-[12px] text-text-muted">{locale === "fr" ? "Score de fiabilité" : "Reliability score"}</p>
          </div>
          <p className={`text-[36px] font-bold ${reliabilityScore >= 60 ? "text-green" : reliabilityScore >= 30 ? "text-yellow-600" : "text-text-sub"}`}>
            {reliabilityScore}
            <span className="text-[14px] text-text-muted font-normal">/100</span>
          </p>
          <p className="text-[11px] text-text-muted mt-1">
            {locale === "fr"
              ? "Pondération des flags par leur niveau de confiance (fiable=1.0, modéré=0.7, faible=0.4, exp.=0.15)."
              : "Weighted average of flag confidence (high=1.0, mid=0.7, low=0.4, exp=0.15)."}
          </p>
          <div className="flex items-center gap-2 mt-3 text-[11px]">
            <span className="text-green font-semibold">{reliableTotal}</span>
            <span className="text-text-muted">{locale === "fr" ? "fiables" : "reliable"}</span>
            <span className="text-text-muted">·</span>
            <span className="text-slate-500 font-semibold">{noisyTotal}</span>
            <span className="text-text-muted">{locale === "fr" ? "à filtrer" : "noisy"}</span>
          </div>
        </div>

        <div className="mc-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Percent size={14} className="text-violet" />
            <p className="text-[12px] text-text-muted">{locale === "fr" ? "Position vs serveur" : "Server percentile"}</p>
          </div>
          <p className="text-[36px] font-bold text-violet">
            {peerStats.percentile}<span className="text-[14px] text-text-muted font-normal">e</span>
          </p>
          <p className="text-[11px] text-text-muted mt-1">
            {locale === "fr"
              ? `Rang ${peerStats.rank}/${peerStats.sampleSize} joueurs flag.`
              : `Rank ${peerStats.rank}/${peerStats.sampleSize} flagged players.`}
          </p>
          <p className="text-[11px] text-text-muted mt-1">
            {locale === "fr"
              ? `Moyenne: ${Math.round(peerStats.mean * 10) / 10} · σ: ${Math.round(peerStats.stdDev * 10) / 10}`
              : `Mean: ${Math.round(peerStats.mean * 10) / 10} · σ: ${Math.round(peerStats.stdDev * 10) / 10}`}
          </p>
        </div>
      </div>

      {/* Aggregated stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <div className="mc-card px-4 py-4">
          <ShieldAlert size={15} className="text-red-500 mb-2" />
          <p className="text-[20px] font-bold text-text">{formatNumber(totals.total_flags)}</p>
          <p className="text-[11px] text-text-muted">{locale === "fr" ? "Alertes totales" : "Total alerts"}</p>
        </div>
        <div className="mc-card px-4 py-4">
          <Target size={15} className="text-violet mb-2" />
          <p className="text-[20px] font-bold text-text">{totals.detection_types}</p>
          <p className="text-[11px] text-text-muted">{locale === "fr" ? "Types touchés" : "Detection types"}</p>
        </div>
        <div className="mc-card px-4 py-4">
          <ShieldCheck size={15} className="text-green mb-2" />
          <p className="text-[20px] font-bold text-text">{totals.high_rel_flags}</p>
          <p className="text-[11px] text-text-muted">{locale === "fr" ? "Fiables" : "Reliable"}</p>
        </div>
        <div className="mc-card px-4 py-4">
          <ShieldAlert size={15} className="text-yellow-500 mb-2" />
          <p className="text-[20px] font-bold text-text">{totals.medium_rel_flags}</p>
          <p className="text-[11px] text-text-muted">{locale === "fr" ? "Modérées" : "Moderate"}</p>
        </div>
        <div className="mc-card px-4 py-4">
          <AlertTriangle size={15} className="text-orange-500 mb-2" />
          <p className="text-[20px] font-bold text-text">{totals.low_rel_flags}</p>
          <p className="text-[11px] text-text-muted">{locale === "fr" ? "Peu fiables" : "Low rel."}</p>
        </div>
        <div className="mc-card px-4 py-4">
          <HelpCircle size={15} className="text-slate-400 mb-2" />
          <p className="text-[20px] font-bold text-text">{totals.exp_rel_flags}</p>
          <p className="text-[11px] text-text-muted">{locale === "fr" ? "Expérimentales" : "Experimental"}</p>
        </div>
      </div>

      {/* Per-detection breakdown */}
      <div className="mc-card p-5 mb-6">
        <h3 className="text-[14px] font-semibold text-text mb-4 flex items-center gap-2">
          <BarChart3 size={14} className="text-pink" />
          {locale === "fr" ? "Détections déclenchées" : "Detections triggered"}
        </h3>
        {stats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Détection" : "Detection"}</th>
                  <th className="text-left py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Catégorie" : "Category"}</th>
                  <th className="text-left py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Fiabilité" : "Reliability"}</th>
                  <th className="text-left py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Sévérité" : "Severity"}</th>
                  <th className="text-center py-2 px-2 text-text-muted font-medium">Total</th>
                  <th className="text-center py-2 px-2 text-text-muted font-medium">VL</th>
                  <th className="text-left py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Premier" : "First"}</th>
                  <th className="text-left py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Dernier" : "Last"}</th>
                  <th className="text-left py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Dernier debug" : "Last debug"}</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.detection + (s.server_id || "")} className="border-b border-border/50 hover:bg-bg-soft transition-colors">
                    <td className="py-2.5 px-2 font-semibold text-text">{s.detection}</td>
                    <td className="py-2.5 px-2"><CategoryPill category={s.category} locale={locale} /></td>
                    <td className="py-2.5 px-2"><ReliabilityBadge reliability={s.reliability} locale={locale} /></td>
                    <td className="py-2.5 px-2"><SeverityBadge severity={s.severity} locale={locale} /></td>
                    <td className="py-2.5 px-2 text-center font-semibold text-pink">{s.count}</td>
                    <td className="py-2.5 px-2 text-center text-text-sub">{Math.round(s.violations_total * 10) / 10}</td>
                    <td className="py-2.5 px-2 text-text-muted text-[11px]" title={formatDate(s.first_flag_at)}>{timeAgo(s.first_flag_at, locale)}</td>
                    <td className="py-2.5 px-2 text-text-muted text-[11px]" title={formatDate(s.last_flag_at)}>{timeAgo(s.last_flag_at, locale)}</td>
                    <td className="py-2.5 px-2 text-text-muted font-mono text-[11px] max-w-[260px] truncate">{s.last_debug || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] text-text-muted text-center py-8">
            {locale === "fr" ? "Aucune détection enregistrée pour ce joueur." : "No detection recorded for this player."}
          </p>
        )}
      </div>

      {/* Event timeline */}
      <div className="mc-card p-5">
        <h3 className="text-[14px] font-semibold text-text mb-4 flex items-center gap-2">
          <Activity size={14} className="text-pink" />
          {locale === "fr" ? "Chronologie des flags (200 derniers)" : "Flag timeline (last 200)"}
        </h3>
        {events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Détection" : "Detection"}</th>
                  <th className="text-left py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Fiabilité" : "Reliability"}</th>
                  <th className="text-center py-2 px-1 text-text-muted font-medium">VL</th>
                  <th className="text-center py-2 px-1 text-text-muted font-medium">P%</th>
                  <th className="text-center py-2 px-1 text-text-muted font-medium">Ping</th>
                  <th className="text-left py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Plateforme" : "Platform"}</th>
                  <th className="text-left py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Détail" : "Detail"}</th>
                  <th className="text-right py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Quand" : "When"}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-bg-soft transition-colors">
                    <td className="py-2.5 px-2 font-semibold text-text">{e.detection}</td>
                    <td className="py-2.5 px-2"><ReliabilityBadge reliability={e.reliability} locale={locale} /></td>
                    <td className="py-2.5 px-1 text-center text-pink font-semibold">{Math.round(e.violations_total * 10) / 10}</td>
                    <td className="py-2.5 px-1 text-center">
                      {e.cheat_probability > 0 ? (
                        <span className={`font-semibold ${e.cheat_probability >= 70 ? "text-red-500" : e.cheat_probability >= 40 ? "text-orange-500" : "text-text-sub"}`}>
                          {e.cheat_probability}%
                        </span>
                      ) : <span className="text-text-muted">-</span>}
                    </td>
                    <td className="py-2.5 px-1 text-center text-text-sub">{e.ping ?? "-"}</td>
                    <td className="py-2.5 px-2 text-text-sub text-[11px]">{e.platform || "-"}</td>
                    <td className="py-2.5 px-2 text-text-sub max-w-[280px] truncate font-mono text-[11px]">{e.debug || "-"}</td>
                    <td className="py-2.5 px-2 text-right text-text-muted text-[11px]" title={formatDate(e.timestamp)}>
                      {timeAgo(e.timestamp, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] text-text-muted text-center py-8">
            {locale === "fr" ? "Aucun flag enregistré." : "No flag recorded."}
          </p>
        )}
      </div>
    </div>
  );
}
