"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert, ShieldCheck, ShieldX, Activity, AlertTriangle,
  Users as UsersIcon, Target, TrendingUp, Clock,
  Crosshair, Move, Network, Wrench, HelpCircle, Zap,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { createAnalyticsFetcher, formatNumber, formatDate } from "@/components/admin/AnalyticsAPI";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

type Reliability = "high" | "medium" | "low" | "experimental";
type Severity = "high" | "medium" | "low";

interface AlertOverview {
  totalFlags: number;
  uniquePlayers: number;
  uniqueDetections: number;
  flags24h: number;
  players24h: number;
  flags7d: number;
  players7d: number;
  byReliability: { reliability: string; total: number }[];
  bySeverity: { severity: string; total: number }[];
}

interface SuspectPlayer {
  player_uuid: string;
  player_name: string;
  xuid: string | null;
  total_flags: number;
  total_violations: number;
  detection_types: number;
  high_rel_flags: number;
  medium_rel_flags: number;
  low_rel_flags: number;
  exp_rel_flags: number;
  first_flag_at: number;
  last_flag_at: number;
}

interface DetectionRow {
  detection: string;
  category: string;
  reliability: Reliability;
  severity: Severity;
  total_flags: number;
  unique_players: number;
  last_flag_at: number;
}

interface CategoryRow {
  category: string;
  total_flags: number;
  unique_players: number;
  detection_types: number;
}

interface RecentEvent {
  id: number;
  player_uuid: string;
  player_name: string;
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

interface DailyFlag { date: string; flags: number; players: number }

const RELIABILITY_META: Record<string, { fr: string; en: string; color: string; bg: string; text: string; icon: typeof ShieldCheck }> = {
  high:         { fr: "Fiable",        en: "Reliable",     color: "#16A34A", bg: "bg-green/10",   text: "text-green",         icon: ShieldCheck },
  medium:       { fr: "Modérément fiable", en: "Moderately reliable", color: "#F59E0B", bg: "bg-yellow-50",  text: "text-yellow-600",  icon: ShieldAlert },
  low:          { fr: "Peu fiable",    en: "Low reliability",   color: "#F97316", bg: "bg-orange-50",  text: "text-orange-500",  icon: AlertTriangle },
  experimental: { fr: "Expérimental",  en: "Experimental",  color: "#94A3B8", bg: "bg-slate-100",  text: "text-slate-500",   icon: HelpCircle },
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

export default function AlertsPage() {
  const { locale } = useParams<{ locale: string }>();
  const { headers, can } = useAdmin();
  const [overview, setOverview] = useState<AlertOverview | null>(null);
  const [suspects, setSuspects] = useState<SuspectPlayer[]>([]);
  const [detections, setDetections] = useState<DetectionRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [recent, setRecent] = useState<RecentEvent[]>([]);
  const [daily, setDaily] = useState<DailyFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterReliability, setFilterReliability] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const api = useRef(createAnalyticsFetcher(headers)).current;

  const loadData = useCallback(() => {
    Promise.all([
      api("alerts/overview"),
      api("alerts/suspect-players", { limit: "50" }),
      api("alerts/detection-breakdown"),
      api("alerts/category-breakdown"),
      api("alerts/recent", { limit: "60" }),
      api("alerts/daily-flags", { days: "30" }),
    ]).then(([o, s, d, c, r, day]) => {
      setOverview(o);
      setSuspects(s);
      setDetections(d);
      setCategories(c);
      setRecent(r);
      setDaily(day);
      setLoading(false);
    }).catch(() => {
      setError(locale === "fr" ? "Impossible de charger les alertes anti-cheat." : "Failed to load anti-cheat alerts.");
      setLoading(false);
    });
  }, [api, locale]);

  useEffect(() => { loadData(); }, [loadData]);
  useAutoRefresh(loadData);

  const filteredDetections = useMemo(() => {
    return detections.filter((d) => {
      if (filterReliability && d.reliability !== filterReliability) return false;
      if (filterCategory && d.category !== filterCategory) return false;
      return true;
    });
  }, [detections, filterReliability, filterCategory]);

  const filteredRecent = useMemo(() => {
    return recent.filter((e) => {
      if (filterReliability && e.reliability !== filterReliability) return false;
      if (filterCategory && e.category !== filterCategory) return false;
      return true;
    });
  }, [recent, filterReliability, filterCategory]);

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
        <div className="text-center">
          <Activity size={32} className="text-pink mx-auto mb-3 animate-pulse" />
          <p className="text-[14px] text-text-sub">{locale === "fr" ? "Chargement..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="mc-card p-8 text-center max-w-md">
          <Activity size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-[14px] text-text-sub">{error}</p>
        </div>
      </div>
    );
  }

  if (!overview) return null;

  const reliabilityTotals = Object.fromEntries(overview.byReliability.map((r) => [r.reliability, r.total]));
  const reliableShare = overview.totalFlags > 0
    ? Math.round(((reliabilityTotals.high || 0) / overview.totalFlags) * 100)
    : 0;

  const kpis = [
    { label: locale === "fr" ? "Alertes totales" : "Total alerts", value: formatNumber(overview.totalFlags), icon: ShieldAlert, color: "bg-red-50 text-red-500" },
    { label: locale === "fr" ? "Joueurs flag" : "Flagged players", value: formatNumber(overview.uniquePlayers), icon: UsersIcon, color: "bg-pink/10 text-pink" },
    { label: locale === "fr" ? "Types détection" : "Detection types", value: formatNumber(overview.uniqueDetections), icon: Target, color: "bg-violet/10 text-violet" },
    { label: locale === "fr" ? "24h" : "24h", value: formatNumber(overview.flags24h), icon: TrendingUp, color: "bg-orange-50 text-orange-500" },
    { label: locale === "fr" ? "7 jours" : "7 days", value: formatNumber(overview.flags7d), icon: Clock, color: "bg-blue-50 text-blue-500" },
    { label: locale === "fr" ? "% fiable" : "% reliable", value: `${reliableShare}%`, icon: ShieldCheck, color: "bg-green/10 text-green" },
  ];

  const chartColors = { pink: "#8E2DE2", violet: "#B84DFF", pinkSoft: "rgba(233, 30, 140, 0.1)" };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <ShieldAlert size={20} className="text-red-500" />
            {locale === "fr" ? "Anti-Cheat — Alertes" : "Anti-Cheat — Alerts"}
          </h1>
          <p className="text-[12px] text-text-muted mt-1">
            {locale === "fr"
              ? "Détections déclenchées par AlertStatsManager côté serveur, agrégées par joueur, type et fiabilité."
              : "Detections raised by server-side AlertStatsManager, aggregated by player, type and reliability."}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="mc-card px-4 py-4">
              <div className={`w-8 h-8 rounded-lg ${kpi.color} flex items-center justify-center mb-2`}>
                <Icon size={15} />
              </div>
              <p className="text-[20px] font-bold text-text">{kpi.value}</p>
              <p className="text-[11px] text-text-muted">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Reliability legend / explanatory card */}
      <div className="mc-card p-5 mb-6">
        <h3 className="text-[14px] font-semibold text-text mb-3 flex items-center gap-2">
          <Zap size={14} className="text-pink" />
          {locale === "fr" ? "Comprendre la fiabilité d'une détection" : "Understanding detection reliability"}
        </h3>
        <p className="text-[12px] text-text-sub mb-4">
          {locale === "fr"
            ? "Chaque détection est classée selon la confiance qu'on peut lui accorder. Une alerte 'fiable' suffit souvent pour sanctionner ; une alerte 'expérimentale' demande presque toujours une vérification manuelle."
            : "Each detection has a confidence tier. A 'reliable' alert is usually enough to act on; an 'experimental' alert almost always needs manual review."}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(["high", "medium", "low", "experimental"] as const).map((rel) => {
            const meta = RELIABILITY_META[rel];
            const Icon = meta.icon;
            const tot = reliabilityTotals[rel] || 0;
            const pct = overview.totalFlags > 0 ? Math.round((tot / overview.totalFlags) * 100) : 0;
            return (
              <div key={rel} className={`rounded-xl p-3 ${meta.bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className={meta.text} />
                  <p className={`text-[12px] font-semibold ${meta.text}`}>
                    {meta[locale as "fr" | "en"] || meta.en}
                  </p>
                </div>
                <p className="text-[18px] font-bold text-text">{formatNumber(tot)} <span className="text-[11px] text-text-muted font-normal">({pct}%)</span></p>
                <p className="text-[11px] text-text-muted mt-1">
                  {rel === "high" && (locale === "fr" ? "Très peu de faux positifs. Action directe possible." : "Very few false positives. Safe to act on.")}
                  {rel === "medium" && (locale === "fr" ? "Faux positifs occasionnels. Vérifier le contexte." : "Occasional false positives. Check context.")}
                  {rel === "low" && (locale === "fr" ? "Détections sensibles, pas pour sanctionner seule." : "Noisy detections — never act alone.")}
                  {rel === "experimental" && (locale === "fr" ? "Phase de tuning. Données indicatives uniquement." : "Tuning phase. Indicative only.")}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="mc-card p-5 lg:col-span-2">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Alertes — 30 derniers jours" : "Alerts — last 30 days"}
          </h3>
          <div className="h-[250px]">
            <Line
              data={{
                labels: daily.map(d => d.date.slice(5)),
                datasets: [
                  {
                    label: locale === "fr" ? "Alertes" : "Flags",
                    data: daily.map(d => d.flags),
                    borderColor: chartColors.pink,
                    backgroundColor: chartColors.pinkSoft,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHitRadius: 10,
                    yAxisID: "y",
                  },
                  {
                    label: locale === "fr" ? "Joueurs" : "Players",
                    data: daily.map(d => d.players),
                    borderColor: chartColors.violet,
                    backgroundColor: "transparent",
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHitRadius: 10,
                    yAxisID: "y1",
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  y: { beginAtZero: true, position: "left", grid: { color: "#f0f0f0" }, ticks: { font: { size: 10 } } },
                  y1: { beginAtZero: true, position: "right", grid: { display: false }, ticks: { font: { size: 10 } } },
                },
              }}
            />
          </div>
        </div>

        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Catégories" : "Categories"}
          </h3>
          <div className="h-[250px] flex items-center justify-center">
            {categories.length > 0 ? (
              <Doughnut
                data={{
                  labels: categories.map(c => CATEGORY_META[c.category]?.[locale as "fr" | "en"] || c.category),
                  datasets: [{
                    data: categories.map(c => c.total_flags),
                    backgroundColor: categories.map(c => CATEGORY_META[c.category]?.color || "#9CA3AF"),
                    borderWidth: 0,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 }, padding: 8 } } },
                }}
              />
            ) : (
              <p className="text-[13px] text-text-muted">{locale === "fr" ? "Aucune donnée" : "No data"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[11px] text-text-muted">{locale === "fr" ? "Filtres" : "Filters"}:</span>
        <select
          value={filterReliability}
          onChange={(e) => setFilterReliability(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-white text-[12px] text-text focus:border-pink focus:outline-none"
        >
          <option value="">{locale === "fr" ? "Toutes fiabilités" : "All reliabilities"}</option>
          {Object.keys(RELIABILITY_META).map((r) => (
            <option key={r} value={r}>{RELIABILITY_META[r][locale as "fr" | "en"] || RELIABILITY_META[r].en}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-white text-[12px] text-text focus:border-pink focus:outline-none"
        >
          <option value="">{locale === "fr" ? "Toutes catégories" : "All categories"}</option>
          {Object.keys(CATEGORY_META).map((c) => (
            <option key={c} value={c}>{CATEGORY_META[c][locale as "fr" | "en"] || CATEGORY_META[c].en}</option>
          ))}
        </select>
        {(filterReliability || filterCategory) && (
          <button
            onClick={() => { setFilterReliability(""); setFilterCategory(""); }}
            className="px-3 py-1.5 rounded-lg bg-bg-soft text-[11px] text-text-muted hover:bg-border transition-colors"
          >
            {locale === "fr" ? "Réinitialiser" : "Reset"}
          </button>
        )}
      </div>

      {/* Suspect players + Detection types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="mc-card p-5 lg:col-span-2">
          <h3 className="text-[14px] font-semibold text-text mb-4 flex items-center gap-2">
            <UsersIcon size={14} className="text-pink" />
            {locale === "fr" ? "Joueurs suspects (top 50)" : "Suspect players (top 50)"}
          </h3>
          {suspects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-text-muted font-medium">#</th>
                    <th className="text-left py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Joueur" : "Player"}</th>
                    <th className="text-center py-2 px-1 text-text-muted font-medium">Total</th>
                    <th className="text-center py-2 px-1 text-text-muted font-medium" title={locale === "fr" ? "Détections fiables" : "Reliable detections"}>
                      <ShieldCheck size={13} className="inline text-green" />
                    </th>
                    <th className="text-center py-2 px-1 text-text-muted font-medium" title={locale === "fr" ? "Modérées" : "Moderate"}>
                      <ShieldAlert size={13} className="inline text-yellow-500" />
                    </th>
                    <th className="text-center py-2 px-1 text-text-muted font-medium" title={locale === "fr" ? "Faibles / expérimentales" : "Low / experimental"}>
                      <HelpCircle size={13} className="inline text-slate-400" />
                    </th>
                    <th className="text-center py-2 px-1 text-text-muted font-medium">{locale === "fr" ? "Types" : "Types"}</th>
                    <th className="text-right py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Dernier flag" : "Last flag"}</th>
                  </tr>
                </thead>
                <tbody>
                  {suspects.map((s, i) => {
                    const reliableLow = s.low_rel_flags + s.exp_rel_flags;
                    const reliableHigh = s.high_rel_flags;
                    const isStrong = reliableHigh > 0 && reliableHigh >= reliableLow;
                    return (
                      <tr key={s.player_uuid} className="border-b border-border/50 hover:bg-bg-soft transition-colors">
                        <td className="py-2.5 px-2 text-text-muted">{i + 1}</td>
                        <td className="py-2.5 px-2 font-medium text-text">
                          <Link href={`/${locale}/admin/analytics/alerts/${s.player_uuid}`} className="hover:text-pink inline-flex items-center gap-2">
                            {isStrong && <span className="w-1.5 h-1.5 rounded-full bg-red-500" title={locale === "fr" ? "Détections fiables dominantes" : "Mostly reliable detections"} />}
                            {s.player_name}
                          </Link>
                        </td>
                        <td className="py-2.5 px-1 text-center font-semibold text-pink">{s.total_flags}</td>
                        <td className="py-2.5 px-1 text-center text-green font-semibold">{s.high_rel_flags || "-"}</td>
                        <td className="py-2.5 px-1 text-center text-yellow-600">{s.medium_rel_flags || "-"}</td>
                        <td className="py-2.5 px-1 text-center text-slate-400">{(s.low_rel_flags + s.exp_rel_flags) || "-"}</td>
                        <td className="py-2.5 px-1 text-center text-text-sub">{s.detection_types}</td>
                        <td className="py-2.5 px-2 text-right text-text-muted text-[11px]">{timeAgo(s.last_flag_at, locale)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[13px] text-text-muted text-center py-8">
              {locale === "fr" ? "Aucune alerte enregistrée." : "No alerts recorded."}
            </p>
          )}
        </div>

        {/* Detection types */}
        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4 flex items-center gap-2">
            <Target size={14} className="text-violet" />
            {locale === "fr" ? "Types de détection" : "Detection types"}
          </h3>
          {filteredDetections.length > 0 ? (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filteredDetections.map((d) => {
                const total = filteredDetections.reduce((s, r) => s + r.total_flags, 0) || 1;
                const pct = Math.round((d.total_flags / total) * 100);
                const meta = CATEGORY_META[d.category] || CATEGORY_META.unknown;
                return (
                  <div key={d.detection} className="rounded-lg border border-border p-2.5 hover:bg-bg-soft transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[13px] font-semibold text-text">{d.detection}</p>
                      <span className="text-[12px] font-bold text-pink">{d.total_flags}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <CategoryPill category={d.category} locale={locale} />
                      <ReliabilityBadge reliability={d.reliability} locale={locale} />
                      <SeverityBadge severity={d.severity} locale={locale} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-text-muted">
                      <span>{d.unique_players} {locale === "fr" ? "joueur(s)" : "player(s)"}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1 bg-bg-soft rounded-full overflow-hidden mt-1">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px] text-text-muted text-center py-8">
              {locale === "fr" ? "Aucune donnée" : "No data"}
            </p>
          )}
        </div>
      </div>

      {/* Recent flag stream */}
      <div className="mc-card p-5">
        <h3 className="text-[14px] font-semibold text-text mb-4 flex items-center gap-2">
          <Activity size={14} className="text-pink" />
          {locale === "fr" ? "Flux d'alertes récentes" : "Recent alert stream"}
        </h3>
        {filteredRecent.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Joueur" : "Player"}</th>
                  <th className="text-left py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Détection" : "Detection"}</th>
                  <th className="text-left py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Fiabilité" : "Reliability"}</th>
                  <th className="text-center py-2 px-1 text-text-muted font-medium">VL</th>
                  <th className="text-center py-2 px-1 text-text-muted font-medium" title={locale === "fr" ? "Probabilité de cheat" : "Cheat probability"}>P%</th>
                  <th className="text-center py-2 px-1 text-text-muted font-medium">Ping</th>
                  <th className="text-left py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Détail" : "Detail"}</th>
                  <th className="text-right py-2 px-2 text-text-muted font-medium">{locale === "fr" ? "Quand" : "When"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecent.map((e) => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-bg-soft transition-colors">
                    <td className="py-2.5 px-2 font-medium text-text">
                      <Link href={`/${locale}/admin/analytics/alerts/${e.player_uuid}`} className="hover:text-pink">
                        {e.player_name}
                      </Link>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text">{e.detection}</span>
                        <CategoryPill category={e.category} locale={locale} />
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <ReliabilityBadge reliability={e.reliability} locale={locale} />
                    </td>
                    <td className="py-2.5 px-1 text-center text-pink font-semibold">{Math.round(e.violations_total * 10) / 10}</td>
                    <td className="py-2.5 px-1 text-center">
                      {e.cheat_probability > 0 ? (
                        <span className={`font-semibold ${e.cheat_probability >= 70 ? "text-red-500" : e.cheat_probability >= 40 ? "text-orange-500" : "text-text-sub"}`}>
                          {e.cheat_probability}%
                        </span>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-1 text-center text-text-sub">{e.ping ?? "-"}</td>
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
            {locale === "fr" ? "Aucun flag récent." : "No recent flags."}
          </p>
        )}
      </div>
    </div>
  );
}
