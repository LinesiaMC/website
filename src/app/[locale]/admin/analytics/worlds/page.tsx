"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Globe, Activity } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { createAnalyticsFetcher, formatDuration } from "@/components/admin/AnalyticsAPI";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface WorldData {
  world_name: string;
  unique_players: number;
  total_visits: number;
  total_time: number;
}

export default function WorldsPage() {
  const { locale } = useParams<{ locale: string }>();
  const { headers } = useAdmin();
  const [worlds, setWorlds] = useState<WorldData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const api = useRef(createAnalyticsFetcher(headers)).current;

  useEffect(() => {
    api("stats/worlds")
      .then((data) => { setWorlds(data); setLoading(false); })
      .catch(() => { setError(locale === "fr" ? "Erreur de chargement" : "Loading error"); setLoading(false); });
  }, [api, locale]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="mc-card p-8 text-center">
          <p className="text-[14px] text-text-sub">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-pink flex items-center justify-center">
          <Globe size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text">{locale === "fr" ? "Mondes" : "Worlds"}</h1>
          <p className="text-[12px] text-text-muted">{worlds.length} {locale === "fr" ? "mondes" : "worlds"}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Activity size={32} className="text-pink animate-pulse" />
        </div>
      ) : worlds.length === 0 ? (
        <div className="mc-card p-12 text-center">
          <Globe size={32} className="text-text-muted mx-auto mb-3" />
          <p className="text-[14px] text-text-sub">{locale === "fr" ? "Aucune donnee" : "No data"}</p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="mc-card p-5 mb-6">
            <h3 className="text-[14px] font-semibold text-text mb-4">{locale === "fr" ? "Joueurs par monde" : "Players per World"}</h3>
            <div className="h-[300px]">
              <Bar
                data={{
                  labels: worlds.map(w => w.world_name),
                  datasets: [
                    {
                      label: locale === "fr" ? "Joueurs uniques" : "Unique Players",
                      data: worlds.map(w => w.unique_players),
                      backgroundColor: "#8E2DE2",
                      borderRadius: 4,
                    },
                    {
                      label: locale === "fr" ? "Visites totales" : "Total Visits",
                      data: worlds.map(w => w.total_visits),
                      backgroundColor: "#B84DFF",
                      borderRadius: 4,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
                  scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: "#f0f0f0" } } },
                }}
              />
            </div>
          </div>

          {/* Table */}
          <div className="mc-card overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-bg-soft">
                  <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Monde" : "World"}</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Joueurs uniques" : "Unique Players"}</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Visites" : "Visits"}</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Temps total" : "Total Time"}</th>
                </tr>
              </thead>
              <tbody>
                {worlds.map((w) => (
                  <tr key={w.world_name} className="border-b border-border/50">
                    <td className="px-4 py-3 font-semibold text-text">{w.world_name}</td>
                    <td className="px-4 py-3 text-text-sub">{w.unique_players}</td>
                    <td className="px-4 py-3 text-text-sub">{w.total_visits}</td>
                    <td className="px-4 py-3 text-text-sub">{formatDuration(w.total_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
