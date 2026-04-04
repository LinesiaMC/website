"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Box, Activity, Users, Gift, Trophy, Clock,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { createAnalyticsFetcher, formatNumber } from "@/components/admin/AnalyticsAPI";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

interface BoxStats {
  totalOpened: number;
  openedLast24h: number;
  openedLast7d: number;
  uniquePlayers: number;
  topBoxTypes: { box_type: string; open_count: number; unique_players: number }[];
  topRewards: { item_name: string; total_qty: number; times_obtained: number }[];
  topOpeners: { player_name: string; open_count: number }[];
}

interface DailyBox {
  date: string;
  opens: number;
  players: number;
}

export default function BoxesPage() {
  const { locale } = useParams<{ locale: string }>();
  const { headers } = useAdmin();
  const [stats, setStats] = useState<BoxStats | null>(null);
  const [daily, setDaily] = useState<DailyBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    const api = createAnalyticsFetcher(headers);
    Promise.all([
      api("stats/boxes"),
      api("stats/boxes/daily", { days: "30" }),
    ]).then(([s, d]) => {
      setStats(s);
      setDaily(d);
      setLoading(false);
    }).catch(() => {
      setError(locale === "fr" ? "Impossible de charger les stats boxes." : "Failed to load box stats.");
      setLoading(false);
    });
  }, [headers, locale]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Activity size={32} className="text-pink mx-auto animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="mc-card p-8 text-center max-w-md">
          <p className="text-[14px] text-text-sub">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const chartColors = {
    pink: "#E91E8C",
    violet: "#7C3AED",
    green: "#22C55E",
    orange: "#F97316",
    blue: "#3B82F6",
    pinkSoft: "rgba(233, 30, 140, 0.1)",
    violetSoft: "rgba(124, 58, 237, 0.1)",
  };

  const doughnutColors = ["#E91E8C", "#7C3AED", "#22C55E", "#F97316", "#3B82F6", "#EF4444", "#06B6D4", "#8B5CF6", "#EC4899", "#14B8A6"];

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
          <Box size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text">
            {locale === "fr" ? "Boxes Analytics" : "Boxes Analytics"}
          </h1>
          <p className="text-[12px] text-text-muted">
            {formatNumber(stats.totalOpened)} {locale === "fr" ? "ouvertures totales" : "total opens"}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="mc-card px-4 py-4">
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center mb-2">
            <Box size={15} />
          </div>
          <p className="text-[20px] font-bold text-text">{formatNumber(stats.totalOpened)}</p>
          <p className="text-[11px] text-text-muted">{locale === "fr" ? "Total ouvertures" : "Total Opens"}</p>
        </div>
        <div className="mc-card px-4 py-4">
          <div className="w-8 h-8 rounded-lg bg-violet/10 text-violet flex items-center justify-center mb-2">
            <Users size={15} />
          </div>
          <p className="text-[20px] font-bold text-text">{formatNumber(stats.uniquePlayers)}</p>
          <p className="text-[11px] text-text-muted">{locale === "fr" ? "Joueurs uniques" : "Unique Players"}</p>
        </div>
        <div className="mc-card px-4 py-4">
          <div className="w-8 h-8 rounded-lg bg-pink/10 text-pink flex items-center justify-center mb-2">
            <Clock size={15} />
          </div>
          <p className="text-[20px] font-bold text-text">{formatNumber(stats.openedLast24h)}</p>
          <p className="text-[11px] text-text-muted">{locale === "fr" ? "Ouvertures (24h)" : "Opens (24h)"}</p>
        </div>
        <div className="mc-card px-4 py-4">
          <div className="w-8 h-8 rounded-lg bg-green/10 text-green flex items-center justify-center mb-2">
            <Gift size={15} />
          </div>
          <p className="text-[20px] font-bold text-text">{formatNumber(stats.openedLast7d)}</p>
          <p className="text-[11px] text-text-muted">{locale === "fr" ? "Ouvertures (7j)" : "Opens (7d)"}</p>
        </div>
      </div>

      {/* Daily chart + Box types doughnut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="mc-card p-5 lg:col-span-2">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Ouvertures (30 jours)" : "Opens (30 days)"}
          </h3>
          <div className="h-[250px]">
            <Line
              data={{
                labels: daily.map(d => d.date.slice(5)),
                datasets: [
                  {
                    label: locale === "fr" ? "Ouvertures" : "Opens",
                    data: daily.map(d => d.opens),
                    borderColor: chartColors.orange,
                    backgroundColor: "rgba(249, 115, 22, 0.1)",
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                  },
                  {
                    label: locale === "fr" ? "Joueurs" : "Players",
                    data: daily.map(d => d.players),
                    borderColor: chartColors.violet,
                    backgroundColor: chartColors.violetSoft,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  y: { beginAtZero: true, grid: { color: "#f0f0f0" }, ticks: { font: { size: 10 } } },
                },
              }}
            />
          </div>
        </div>

        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Types de boxes" : "Box Types"}
          </h3>
          {stats.topBoxTypes.length > 0 ? (
            <div className="h-[250px] flex items-center justify-center">
              <Doughnut
                data={{
                  labels: stats.topBoxTypes.map(b => b.box_type),
                  datasets: [{
                    data: stats.topBoxTypes.map(b => b.open_count),
                    backgroundColor: doughnutColors.slice(0, stats.topBoxTypes.length),
                    borderWidth: 0,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 }, padding: 6 } } },
                }}
              />
            </div>
          ) : (
            <p className="text-[13px] text-text-muted">{locale === "fr" ? "Aucune donnee" : "No data"}</p>
          )}
        </div>
      </div>

      {/* Rewards + Top openers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Top rewards */}
        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Recompenses les plus obtenues" : "Most Obtained Rewards"}
          </h3>
          {stats.topRewards.length > 0 ? (
            <div className="h-[280px]">
              <Bar
                data={{
                  labels: stats.topRewards.slice(0, 10).map(r => r.item_name.length > 15 ? r.item_name.slice(0, 15) + "..." : r.item_name),
                  datasets: [{
                    label: locale === "fr" ? "Quantite totale" : "Total Qty",
                    data: stats.topRewards.slice(0, 10).map(r => r.total_qty),
                    backgroundColor: chartColors.orange,
                    borderRadius: 4,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: "y",
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { color: "#f0f0f0" }, ticks: { font: { size: 10 } } },
                    y: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  },
                }}
              />
            </div>
          ) : (
            <p className="text-[13px] text-text-muted">{locale === "fr" ? "Aucune donnee" : "No data"}</p>
          )}
        </div>

        {/* Top openers */}
        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Top ouvreurs" : "Top Openers"}
          </h3>
          {stats.topOpeners.length > 0 ? (
            <div className="space-y-2">
              {stats.topOpeners.map((p, i) => (
                <div key={p.player_name} className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${i < 3 ? "bg-orange-100 text-orange-600" : "bg-bg-soft text-text-muted"}`}>
                      {i + 1}
                    </span>
                    <span className="text-[13px] font-medium text-text">{p.player_name}</span>
                  </div>
                  <span className="text-[13px] font-semibold text-text-sub">{formatNumber(p.open_count)} {locale === "fr" ? "ouvertures" : "opens"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-text-muted">{locale === "fr" ? "Aucune donnee" : "No data"}</p>
          )}
        </div>
      </div>

      {/* Box types detail table */}
      {stats.topBoxTypes.length > 0 && (
        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Detail par type de box" : "Box Type Details"}
          </h3>
          <div className="overflow-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="pb-2 font-medium">{locale === "fr" ? "Type" : "Type"}</th>
                  <th className="pb-2 font-medium text-right">{locale === "fr" ? "Ouvertures" : "Opens"}</th>
                  <th className="pb-2 font-medium text-right">{locale === "fr" ? "Joueurs" : "Players"}</th>
                  <th className="pb-2 font-medium text-right">{locale === "fr" ? "Moy/joueur" : "Avg/Player"}</th>
                </tr>
              </thead>
              <tbody>
                {stats.topBoxTypes.map((b) => (
                  <tr key={b.box_type} className="border-b border-border/50">
                    <td className="py-2.5 font-medium text-text capitalize">{b.box_type}</td>
                    <td className="py-2.5 text-right text-text-sub">{formatNumber(b.open_count)}</td>
                    <td className="py-2.5 text-right text-text-sub">{formatNumber(b.unique_players)}</td>
                    <td className="py-2.5 text-right text-text-sub">
                      {b.unique_players > 0 ? (b.open_count / b.unique_players).toFixed(1) : "0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rewards table */}
      {stats.topRewards.length > 0 && (
        <div className="mc-card p-5 mt-4">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Toutes les recompenses" : "All Rewards"}
          </h3>
          <div className="overflow-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium text-right">{locale === "fr" ? "Quantite totale" : "Total Qty"}</th>
                  <th className="pb-2 font-medium text-right">{locale === "fr" ? "Fois obtenu" : "Times Obtained"}</th>
                  <th className="pb-2 font-medium text-right">{locale === "fr" ? "Qte moy" : "Avg Qty"}</th>
                </tr>
              </thead>
              <tbody>
                {stats.topRewards.map((r) => (
                  <tr key={r.item_name} className="border-b border-border/50">
                    <td className="py-2 font-medium text-text">{r.item_name}</td>
                    <td className="py-2 text-right text-orange-500 font-semibold">{formatNumber(r.total_qty)}</td>
                    <td className="py-2 text-right text-text-sub">{formatNumber(r.times_obtained)}</td>
                    <td className="py-2 text-right text-text-sub">
                      {r.times_obtained > 0 ? (r.total_qty / r.times_obtained).toFixed(1) : "0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
