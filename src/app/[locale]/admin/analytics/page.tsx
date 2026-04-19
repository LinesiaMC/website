"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Users, UserPlus, Skull, MessageSquare, Terminal,
  TrendingUp, TrendingDown, Activity, Dices, DollarSign, Timer, Hourglass,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { createAnalyticsFetcher, formatDuration, formatNumber } from "@/components/admin/AnalyticsAPI";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

interface OverviewStats {
  totalPlayers: number;
  activeLast24h: number;
  activeLast7d: number;
  newLast24h: number;
  newLast7d: number;
  totalCommands: number;
  totalDeaths: number;
  totalMessages: number;
  avgPlaytime: number;
  medianPlaytime: number;
  playersWithPlaytime: number;
  avgSessionCount: number;
  totalSessions: number;
  avgSessionDuration: number;
  medianSessionDuration: number;
}

interface SessionDistribution {
  total: number;
  avgDuration: number;
  buckets: { label: string; count: number }[];
}

interface CasinoOverview {
  totalBets: number;
  totalBetAmount: number;
  totalWinAmount: number;
  totalNetResult: number;
  winsCount: number;
  lossesCount: number;
}

interface DailyData {
  date: string;
  activePlayers: number;
  newPlayers: number;
}

interface PlatformData {
  platform: string;
  count: number;
}

interface ChurnData {
  label: string;
  count: number;
}

interface CommandData {
  command: string;
  count: number;
}

interface PeakData {
  hour: number;
  count: number;
}

export default function AnalyticsDashboard() {
  const { locale } = useParams<{ locale: string }>();
  const { headers } = useAdmin();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [daily, setDaily] = useState<DailyData[]>([]);
  const [platforms, setPlatforms] = useState<PlatformData[]>([]);
  const [churn, setChurn] = useState<ChurnData[]>([]);
  const [commands, setCommands] = useState<CommandData[]>([]);
  const [peakHours, setPeakHours] = useState<PeakData[]>([]);
  const [casino, setCasino] = useState<CasinoOverview | null>(null);
  const [sessionDist, setSessionDist] = useState<SessionDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const api = useRef(createAnalyticsFetcher(headers)).current;

  const loadData = useCallback(() => {
    Promise.all([
      api("stats/overview"),
      api("stats/daily-players", { days: "30" }),
      api("stats/platforms"),
      api("stats/churn"),
      api("stats/commands", { limit: "10" }),
      api("stats/peak-hours"),
      api("stats/casino"),
      api("stats/session-distribution"),
    ]).then(([s, d, p, c, cmd, ph, cas, sd]) => {
      setStats(s);
      setDaily(d);
      setPlatforms(p);
      setChurn(c);
      setCommands(cmd);
      setPeakHours(ph);
      setCasino(cas);
      setSessionDist(sd);
      setLoading(false);
    }).catch(() => {
      setError(locale === "fr" ? "Impossible de charger les analytics. Verifiez que le web-panel est en ligne." : "Failed to load analytics. Check that the web-panel is running.");
      setLoading(false);
    });
  }, [api, locale]);

  useEffect(() => { loadData(); }, [loadData]);
  useAutoRefresh(loadData);

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

  if (!stats) return null;

  const kpis = [
    { label: locale === "fr" ? "Joueurs totaux" : "Total Players", value: formatNumber(stats.totalPlayers), hint: locale === "fr" ? `${stats.playersWithPlaytime} avec temps enregistré` : `${stats.playersWithPlaytime} with playtime`, icon: Users, color: "bg-pink/10 text-pink" },
    { label: locale === "fr" ? "Actifs (24h)" : "Active (24h)", value: formatNumber(stats.activeLast24h), icon: TrendingUp, color: "bg-green/10 text-green" },
    { label: locale === "fr" ? "Actifs (7j)" : "Active (7d)", value: formatNumber(stats.activeLast7d), icon: TrendingUp, color: "bg-violet/10 text-violet" },
    { label: locale === "fr" ? "Nouveaux (24h)" : "New (24h)", value: formatNumber(stats.newLast24h), icon: UserPlus, color: "bg-blue-50 text-blue-500" },
    { label: locale === "fr" ? "Nouveaux (7j)" : "New (7d)", value: formatNumber(stats.newLast7d), icon: UserPlus, color: "bg-blue-50 text-blue-500" },
    { label: locale === "fr" ? "Session moy." : "Avg Session", value: formatDuration(stats.avgSessionDuration), hint: locale === "fr" ? `médiane ${formatDuration(stats.medianSessionDuration)}` : `median ${formatDuration(stats.medianSessionDuration)}`, icon: Timer, color: "bg-orange-50 text-orange-500" },
    { label: locale === "fr" ? "Commandes" : "Commands", value: formatNumber(stats.totalCommands), icon: Terminal, color: "bg-purple-50 text-purple-500" },
    { label: locale === "fr" ? "Morts" : "Deaths", value: formatNumber(stats.totalDeaths), icon: Skull, color: "bg-red-50 text-red-500" },
    { label: "Messages", value: formatNumber(stats.totalMessages), icon: MessageSquare, color: "bg-cyan-50 text-cyan-500" },
    { label: locale === "fr" ? "Sessions / joueur" : "Sessions / player", value: stats.avgSessionCount.toString(), hint: locale === "fr" ? `${formatNumber(stats.totalSessions)} sessions` : `${formatNumber(stats.totalSessions)} sessions`, icon: TrendingDown, color: "bg-emerald-50 text-emerald-500" },
    ...(casino && casino.totalBets > 0 ? [
      { label: locale === "fr" ? "Paris casino" : "Casino Bets", value: formatNumber(casino.totalBets), icon: Dices, color: "bg-yellow-50 text-yellow-600" },
      { label: locale === "fr" ? "Gains casino" : "Casino Won", value: formatNumber(casino.totalWinAmount), icon: DollarSign, color: "bg-green/10 text-green" },
    ] : []),
  ];

  const chartColors = {
    pink: "#8E2DE2",
    violet: "#B84DFF",
    pinkSoft: "rgba(233, 30, 140, 0.1)",
    violetSoft: "rgba(124, 58, 237, 0.1)",
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-text mb-6">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="mc-card px-4 py-4">
              <div className={`w-8 h-8 rounded-lg ${kpi.color} flex items-center justify-center mb-2`}>
                <Icon size={15} />
              </div>
              <p className="text-[20px] font-bold text-text">{kpi.value}</p>
              <p className="text-[11px] text-text-muted">{kpi.label}</p>
              {kpi.hint && (
                <p className="text-[10px] text-text-muted/70 mt-0.5 truncate">{kpi.hint}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Temps de jeu — détail */}
      <div className="mc-card p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
            <Hourglass size={15} />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-text">
              {locale === "fr" ? "Temps de jeu" : "Playtime"}
            </h3>
            <p className="text-[11px] text-text-muted">
              {locale === "fr"
                ? "La moyenne seule est trompeuse : un joueur qui cumule 100h tire vers le haut les dizaines qui ne reviennent jamais. La médiane est plus représentative, la distribution donne la vraie forme."
                : "Averages alone mislead: one player with 100h drags up dozens who never returned. Median is more representative, distribution shows the real shape."}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="rounded-xl border-2 border-border bg-bg-soft/40 px-4 py-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">
              {locale === "fr" ? "Session moyenne" : "Avg session"}
            </p>
            <p className="text-[18px] font-bold text-text">{formatDuration(stats.avgSessionDuration)}</p>
            <p className="text-[10px] text-text-muted">
              {locale === "fr" ? "médiane " : "median "}{formatDuration(stats.medianSessionDuration)}
            </p>
          </div>
          <div className="rounded-xl border-2 border-border bg-bg-soft/40 px-4 py-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">
              {locale === "fr" ? "Cumul par joueur" : "Avg per player"}
            </p>
            <p className="text-[18px] font-bold text-text">{formatDuration(stats.avgPlaytime)}</p>
            <p className="text-[10px] text-text-muted">
              {locale === "fr" ? "médiane " : "median "}{formatDuration(stats.medianPlaytime)}
            </p>
          </div>
          <div className="rounded-xl border-2 border-border bg-bg-soft/40 px-4 py-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">
              {locale === "fr" ? "Total sessions" : "Total sessions"}
            </p>
            <p className="text-[18px] font-bold text-text">{formatNumber(stats.totalSessions)}</p>
            <p className="text-[10px] text-text-muted">
              {stats.avgSessionCount} {locale === "fr" ? "par joueur" : "per player"}
            </p>
          </div>
          <div className="rounded-xl border-2 border-border bg-bg-soft/40 px-4 py-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">
              {locale === "fr" ? "Joueurs actifs" : "With playtime"}
            </p>
            <p className="text-[18px] font-bold text-text">{formatNumber(stats.playersWithPlaytime)}</p>
            <p className="text-[10px] text-text-muted">
              {stats.totalPlayers > 0
                ? Math.round((stats.playersWithPlaytime / stats.totalPlayers) * 100)
                : 0}% {locale === "fr" ? "des inscrits" : "of signups"}
            </p>
          </div>
        </div>

        {sessionDist && sessionDist.total > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-text-sub uppercase tracking-wider">
                {locale === "fr" ? "Durée des sessions" : "Session duration"}
              </p>
              <p className="text-[11px] text-text-muted">
                {formatNumber(sessionDist.total)} {locale === "fr" ? "sessions analysées" : "sessions analysed"}
              </p>
            </div>
            <div className="h-[160px]">
              <Bar
                data={{
                  labels: sessionDist.buckets.map(b => b.label),
                  datasets: [{
                    data: sessionDist.buckets.map(b => b.count),
                    backgroundColor: chartColors.pink,
                    borderRadius: 4,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => {
                          const total = sessionDist.total || 1;
                          const pct = Math.round((Number(ctx.parsed.y) / total) * 100);
                          return `${ctx.parsed.y} (${pct}%)`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: { beginAtZero: true, grid: { color: "#f0f0f0" }, ticks: { font: { size: 10 } } },
                  },
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Daily Players */}
        <div className="mc-card p-5 lg:col-span-2">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Joueurs actifs (30 jours)" : "Active Players (30 days)"}
          </h3>
          <div className="h-[250px]">
            <Line
              data={{
                labels: daily.map(d => d.date.slice(5)),
                datasets: [
                  {
                    label: locale === "fr" ? "Actifs" : "Active",
                    data: daily.map(d => d.activePlayers),
                    borderColor: chartColors.pink,
                    backgroundColor: chartColors.pinkSoft,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHitRadius: 10,
                  },
                  {
                    label: locale === "fr" ? "Nouveaux" : "New",
                    data: daily.map(d => d.newPlayers),
                    borderColor: chartColors.violet,
                    backgroundColor: chartColors.violetSoft,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHitRadius: 10,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
                scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { beginAtZero: true, grid: { color: "#f0f0f0" }, ticks: { font: { size: 10 } } } },
              }}
            />
          </div>
        </div>

        {/* Platforms */}
        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Plateformes" : "Platforms"}
          </h3>
          <div className="h-[250px] flex items-center justify-center">
            {platforms.length > 0 ? (
              <Doughnut
                data={{
                  labels: platforms.map(p => p.platform),
                  datasets: [{
                    data: platforms.map(p => p.count),
                    backgroundColor: ["#8E2DE2", "#B84DFF", "#3B82F6", "#22C55E", "#F59E0B", "#EF4444"],
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
              <p className="text-[13px] text-text-muted">{locale === "fr" ? "Aucune donnee" : "No data"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Churn */}
        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Risque de churn" : "Churn Risk"}
          </h3>
          <div className="space-y-3">
            {churn.map((c, i) => {
              const total = churn.reduce((s, x) => s + x.count, 0) || 1;
              const pct = Math.round((c.count / total) * 100);
              const colors = ["bg-green", "bg-blue-500", "bg-yellow-500", "bg-orange-500", "bg-red-500"];
              return (
                <div key={i}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="text-text-sub">{c.label}</span>
                    <span className="font-semibold text-text">{c.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-bg-soft rounded-full overflow-hidden">
                    <div className={`h-full ${colors[i]} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Commands */}
        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Top commandes" : "Top Commands"}
          </h3>
          {commands.length > 0 ? (
            <div className="h-[200px]">
              <Bar
                data={{
                  labels: commands.map(c => "/" + c.command),
                  datasets: [{
                    data: commands.map(c => c.count),
                    backgroundColor: chartColors.pink,
                    borderRadius: 4,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: "y",
                  plugins: { legend: { display: false } },
                  scales: { x: { grid: { color: "#f0f0f0" }, ticks: { font: { size: 10 } } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } },
                }}
              />
            </div>
          ) : (
            <p className="text-[13px] text-text-muted">{locale === "fr" ? "Aucune donnee" : "No data"}</p>
          )}
        </div>

        {/* Peak Hours */}
        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Heures de pointe" : "Peak Hours"}
          </h3>
          {peakHours.length > 0 ? (
            <div className="h-[200px]">
              <Bar
                data={{
                  labels: peakHours.map(p => `${p.hour}h`),
                  datasets: [{
                    data: peakHours.map(p => p.count),
                    backgroundColor: chartColors.violet,
                    borderRadius: 4,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { beginAtZero: true, grid: { color: "#f0f0f0" }, ticks: { font: { size: 10 } } } },
                }}
              />
            </div>
          ) : (
            <p className="text-[13px] text-text-muted">{locale === "fr" ? "Aucune donnee" : "No data"}</p>
          )}
        </div>
      </div>
    </div>
  );
}
