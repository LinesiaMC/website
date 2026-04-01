"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { TrendingUp, Activity } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { createAnalyticsFetcher } from "@/components/admin/AnalyticsAPI";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface RetentionDay {
  date: string;
  newPlayers: number;
  returnedDay1: number;
  returnedWeek: number;
  retentionDay1: number;
  retentionWeek: number;
}

export default function RetentionPage() {
  const { locale } = useParams<{ locale: string }>();
  const { headers } = useAdmin();
  const [retention, setRetention] = useState<RetentionDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState("30");
  const api = useRef(createAnalyticsFetcher(headers)).current;

  useEffect(() => {
    setLoading(true);
    api("stats/retention", { days })
      .then((data) => { setRetention(data); setLoading(false); })
      .catch(() => { setError(locale === "fr" ? "Erreur de chargement" : "Loading error"); setLoading(false); });
  }, [api, days, locale]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="mc-card p-8 text-center">
          <p className="text-[14px] text-text-sub">{error}</p>
        </div>
      </div>
    );
  }

  const totalNew = retention.reduce((s, r) => s + r.newPlayers, 0);
  const avgDay1 = retention.filter(r => r.newPlayers > 0).length > 0
    ? Math.round(retention.filter(r => r.newPlayers > 0).reduce((s, r) => s + r.retentionDay1, 0) / retention.filter(r => r.newPlayers > 0).length)
    : 0;
  const avgWeek = retention.filter(r => r.newPlayers > 0).length > 0
    ? Math.round(retention.filter(r => r.newPlayers > 0).reduce((s, r) => s + r.retentionWeek, 0) / retention.filter(r => r.newPlayers > 0).length)
    : 0;

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink flex items-center justify-center">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text">Retention</h1>
            <p className="text-[12px] text-text-muted">{locale === "fr" ? "Analyse de retention" : "Retention analysis"}</p>
          </div>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] text-text focus:border-pink focus:outline-none"
        >
          <option value="7">7 {locale === "fr" ? "jours" : "days"}</option>
          <option value="14">14 {locale === "fr" ? "jours" : "days"}</option>
          <option value="30">30 {locale === "fr" ? "jours" : "days"}</option>
          <option value="60">60 {locale === "fr" ? "jours" : "days"}</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Activity size={32} className="text-pink animate-pulse" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="mc-card px-5 py-4">
              <p className="text-[11px] text-text-muted uppercase">{locale === "fr" ? "Nouveaux joueurs" : "New Players"}</p>
              <p className="text-[22px] font-bold text-text">{totalNew}</p>
            </div>
            <div className="mc-card px-5 py-4">
              <p className="text-[11px] text-text-muted uppercase">{locale === "fr" ? "Retention J+1 moy." : "Avg Day 1 Ret."}</p>
              <p className="text-[22px] font-bold text-pink">{avgDay1}%</p>
            </div>
            <div className="mc-card px-5 py-4">
              <p className="text-[11px] text-text-muted uppercase">{locale === "fr" ? "Retention S+1 moy." : "Avg Week 1 Ret."}</p>
              <p className="text-[22px] font-bold text-violet">{avgWeek}%</p>
            </div>
          </div>

          {/* Chart */}
          <div className="mc-card p-5 mb-6">
            <h3 className="text-[14px] font-semibold text-text mb-4">{locale === "fr" ? "Taux de retention" : "Retention Rate"}</h3>
            <div className="h-[250px]">
              <Line
                data={{
                  labels: retention.map(r => r.date.slice(5)),
                  datasets: [
                    {
                      label: locale === "fr" ? "Retention J+1" : "Day 1 Retention",
                      data: retention.map(r => r.retentionDay1),
                      borderColor: "#E91E8C",
                      backgroundColor: "rgba(233,30,140,0.1)",
                      fill: true,
                      tension: 0.4,
                      pointRadius: 2,
                    },
                    {
                      label: locale === "fr" ? "Retention S+1" : "Week 1 Retention",
                      data: retention.map(r => r.retentionWeek),
                      borderColor: "#7C3AED",
                      backgroundColor: "rgba(124,58,237,0.1)",
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
                    y: { beginAtZero: true, max: 100, grid: { color: "#f0f0f0" }, ticks: { font: { size: 10 }, callback: (v) => v + "%" } },
                  },
                }}
              />
            </div>
          </div>

          {/* Table */}
          <div className="mc-card overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-bg-soft">
                  <th className="text-left px-4 py-3 font-semibold text-text-sub">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Nouveaux" : "New"}</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Retour J+1" : "Day 1"}</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-sub">% J+1</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Retour S+1" : "Week 1"}</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-sub">% S+1</th>
                </tr>
              </thead>
              <tbody>
                {[...retention].reverse().map((r) => (
                  <tr key={r.date} className="border-b border-border/50">
                    <td className="px-4 py-2.5 font-medium text-text">{r.date}</td>
                    <td className="px-4 py-2.5 text-text-sub">{r.newPlayers}</td>
                    <td className="px-4 py-2.5 text-text-sub">{r.returnedDay1}</td>
                    <td className="px-4 py-2.5">
                      <span className={`font-semibold ${r.retentionDay1 >= 30 ? "text-green" : r.retentionDay1 >= 15 ? "text-orange-500" : "text-red-500"}`}>
                        {r.retentionDay1}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text-sub">{r.returnedWeek}</td>
                    <td className="px-4 py-2.5">
                      <span className={`font-semibold ${r.retentionWeek >= 30 ? "text-green" : r.retentionWeek >= 15 ? "text-orange-500" : "text-red-500"}`}>
                        {r.retentionWeek}%
                      </span>
                    </td>
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
