"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Dices, TrendingUp, TrendingDown, DollarSign, Users,
  Activity, Trophy, XCircle,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { createAnalyticsFetcher, formatNumber } from "@/components/admin/AnalyticsAPI";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

interface CasinoStats {
  totalBets: number;
  totalBetAmount: number;
  totalWinAmount: number;
  totalNetResult: number;
  uniquePlayers: number;
  betsLast24h: number;
  betsLast7d: number;
  winsCount: number;
  lossesCount: number;
  avgBet: number;
}

interface GameData {
  game: string;
  total_bets: number;
  total_bet: number;
  total_won: number;
  net: number;
  players: number;
}

interface DailyData {
  date: string;
  bets: number;
  betTotal: number;
  winTotal: number;
  net: number;
}

interface TopPlayer {
  player_uuid: string;
  username: string;
  total_bets: number;
  total_bet: number;
  total_won: number;
  net: number;
}

export default function CasinoAnalytics() {
  const { locale } = useParams<{ locale: string }>();
  const { headers } = useAdmin();
  const [stats, setStats] = useState<CasinoStats | null>(null);
  const [games, setGames] = useState<GameData[]>([]);
  const [daily, setDaily] = useState<DailyData[]>([]);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    const api = createAnalyticsFetcher(headers);
    Promise.all([
      api("stats/casino"),
      api("stats/casino/games"),
      api("stats/casino/daily", { days: "30" }),
      api("stats/casino/top-players", { limit: "10" }),
    ]).then(([s, g, d, tp]) => {
      setStats(s);
      setGames(g);
      setDaily(d);
      setTopPlayers(tp);
      setLoading(false);
    }).catch(() => {
      setError(locale === "fr" ? "Impossible de charger les stats casino." : "Failed to load casino stats.");
      setLoading(false);
    });
  }, [headers, locale]);

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

  const winRate = stats.totalBets > 0 ? Math.round((stats.winsCount / stats.totalBets) * 100) : 0;

  const kpis = [
    { label: locale === "fr" ? "Total paris" : "Total Bets", value: formatNumber(stats.totalBets), icon: Dices, color: "bg-pink/10 text-pink" },
    { label: locale === "fr" ? "Joueurs uniques" : "Unique Players", value: formatNumber(stats.uniquePlayers), icon: Users, color: "bg-violet/10 text-violet" },
    { label: locale === "fr" ? "Total mise" : "Total Wagered", value: formatNumber(stats.totalBetAmount), icon: DollarSign, color: "bg-blue-50 text-blue-500" },
    { label: locale === "fr" ? "Total gains" : "Total Won", value: formatNumber(stats.totalWinAmount), icon: TrendingUp, color: "bg-green/10 text-green" },
    { label: locale === "fr" ? "Resultat net" : "Net Result", value: (stats.totalNetResult >= 0 ? "+" : "") + formatNumber(stats.totalNetResult), icon: stats.totalNetResult >= 0 ? TrendingUp : TrendingDown, color: stats.totalNetResult >= 0 ? "bg-green/10 text-green" : "bg-red-50 text-red-500" },
    { label: locale === "fr" ? "Victoires" : "Wins", value: formatNumber(stats.winsCount), icon: Trophy, color: "bg-emerald-50 text-emerald-500" },
    { label: locale === "fr" ? "Defaites" : "Losses", value: formatNumber(stats.lossesCount), icon: XCircle, color: "bg-red-50 text-red-500" },
    { label: locale === "fr" ? "Taux victoire" : "Win Rate", value: winRate + "%", icon: TrendingUp, color: "bg-orange-50 text-orange-500" },
    { label: locale === "fr" ? "Mise moyenne" : "Avg Bet", value: formatNumber(stats.avgBet), icon: DollarSign, color: "bg-purple-50 text-purple-500" },
    { label: locale === "fr" ? "Paris (24h)" : "Bets (24h)", value: formatNumber(stats.betsLast24h), icon: Activity, color: "bg-cyan-50 text-cyan-500" },
  ];

  const chartColors = {
    pink: "#8E2DE2",
    violet: "#B84DFF",
    green: "#22C55E",
    red: "#EF4444",
    pinkSoft: "rgba(233, 30, 140, 0.1)",
    greenSoft: "rgba(34, 197, 94, 0.1)",
    redSoft: "rgba(239, 68, 68, 0.1)",
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-text mb-6">
        {locale === "fr" ? "Casino Analytics" : "Casino Analytics"}
      </h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
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

      {/* Charts row 1: Daily net + Win/Loss doughnut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="mc-card p-5 lg:col-span-2">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Gains / Pertes (30 jours)" : "Wins / Losses (30 days)"}
          </h3>
          <div className="h-[250px]">
            <Line
              data={{
                labels: daily.map(d => d.date.slice(5)),
                datasets: [
                  {
                    label: locale === "fr" ? "Gains" : "Wins",
                    data: daily.map(d => d.winTotal),
                    borderColor: chartColors.green,
                    backgroundColor: chartColors.greenSoft,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHitRadius: 10,
                  },
                  {
                    label: locale === "fr" ? "Mises" : "Bets",
                    data: daily.map(d => d.betTotal),
                    borderColor: chartColors.pink,
                    backgroundColor: chartColors.pinkSoft,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHitRadius: 10,
                  },
                  {
                    label: locale === "fr" ? "Net" : "Net",
                    data: daily.map(d => d.net),
                    borderColor: chartColors.violet,
                    backgroundColor: "transparent",
                    borderDash: [5, 5],
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
                scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { grid: { color: "#f0f0f0" }, ticks: { font: { size: 10 } } } },
              }}
            />
          </div>
        </div>

        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Victoires vs Defaites" : "Wins vs Losses"}
          </h3>
          <div className="h-[250px] flex items-center justify-center">
            {stats.totalBets > 0 ? (
              <Doughnut
                data={{
                  labels: [locale === "fr" ? "Victoires" : "Wins", locale === "fr" ? "Defaites" : "Losses"],
                  datasets: [{
                    data: [stats.winsCount, stats.lossesCount],
                    backgroundColor: [chartColors.green, chartColors.red],
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

      {/* Charts row 2: Games + Top Players */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Games breakdown */}
        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Par jeu" : "By Game"}
          </h3>
          {games.length > 0 ? (
            <div className="h-[250px]">
              <Bar
                data={{
                  labels: games.map(g => g.game),
                  datasets: [
                    {
                      label: locale === "fr" ? "Mises" : "Wagered",
                      data: games.map(g => g.total_bet),
                      backgroundColor: chartColors.pink,
                      borderRadius: 4,
                    },
                    {
                      label: locale === "fr" ? "Gains" : "Won",
                      data: games.map(g => g.total_won),
                      backgroundColor: chartColors.green,
                      borderRadius: 4,
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
          ) : (
            <p className="text-[13px] text-text-muted">{locale === "fr" ? "Aucune donnee" : "No data"}</p>
          )}
        </div>

        {/* Top Players */}
        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Top joueurs casino" : "Top Casino Players"}
          </h3>
          {topPlayers.length > 0 ? (
            <div className="overflow-auto max-h-[280px]">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-text-muted border-b border-border">
                    <th className="pb-2 font-medium">{locale === "fr" ? "Joueur" : "Player"}</th>
                    <th className="pb-2 font-medium text-right">{locale === "fr" ? "Paris" : "Bets"}</th>
                    <th className="pb-2 font-medium text-right">{locale === "fr" ? "Mise" : "Wagered"}</th>
                    <th className="pb-2 font-medium text-right">{locale === "fr" ? "Gagne" : "Won"}</th>
                    <th className="pb-2 font-medium text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {topPlayers.map((p) => (
                    <tr key={p.player_uuid} className="border-b border-border/50">
                      <td className="py-2 font-medium text-text">{p.username || p.player_uuid.slice(0, 8)}</td>
                      <td className="py-2 text-right text-text-sub">{formatNumber(p.total_bets)}</td>
                      <td className="py-2 text-right text-text-sub">{formatNumber(p.total_bet)}</td>
                      <td className="py-2 text-right text-text-sub">{formatNumber(p.total_won)}</td>
                      <td className={`py-2 text-right font-semibold ${p.net >= 0 ? "text-green" : "text-red-500"}`}>
                        {p.net >= 0 ? "+" : ""}{formatNumber(p.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[13px] text-text-muted">{locale === "fr" ? "Aucune donnee" : "No data"}</p>
          )}
        </div>
      </div>

      {/* Games detail table */}
      {games.length > 0 && (
        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Detail par jeu" : "Game Details"}
          </h3>
          <div className="overflow-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="pb-2 font-medium">{locale === "fr" ? "Jeu" : "Game"}</th>
                  <th className="pb-2 font-medium text-right">{locale === "fr" ? "Paris" : "Bets"}</th>
                  <th className="pb-2 font-medium text-right">{locale === "fr" ? "Joueurs" : "Players"}</th>
                  <th className="pb-2 font-medium text-right">{locale === "fr" ? "Total mise" : "Total Bet"}</th>
                  <th className="pb-2 font-medium text-right">{locale === "fr" ? "Total gagne" : "Total Won"}</th>
                  <th className="pb-2 font-medium text-right">Net</th>
                  <th className="pb-2 font-medium text-right">{locale === "fr" ? "Marge maison" : "House Edge"}</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => {
                  const houseEdge = g.total_bet > 0 ? Math.round(((g.total_bet - g.total_won) / g.total_bet) * 100) : 0;
                  return (
                    <tr key={g.game} className="border-b border-border/50">
                      <td className="py-2.5 font-medium text-text capitalize">{g.game}</td>
                      <td className="py-2.5 text-right text-text-sub">{formatNumber(g.total_bets)}</td>
                      <td className="py-2.5 text-right text-text-sub">{formatNumber(g.players)}</td>
                      <td className="py-2.5 text-right text-text-sub">{formatNumber(g.total_bet)}</td>
                      <td className="py-2.5 text-right text-text-sub">{formatNumber(g.total_won)}</td>
                      <td className={`py-2.5 text-right font-semibold ${g.net >= 0 ? "text-green" : "text-red-500"}`}>
                        {g.net >= 0 ? "+" : ""}{formatNumber(g.net)}
                      </td>
                      <td className="py-2.5 text-right text-text-sub">{houseEdge}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
