"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Briefcase, Activity, Star, Users } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { createAnalyticsFetcher, formatNumber } from "@/components/admin/AnalyticsAPI";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface JobData {
  name: string;
  players: number;
  avg_level: number;
  maxed_count: number;
  avg_current_xp: number;
  avg_lifetime_xp: number;
  total_lifetime_xp: number;
  level_histogram: number[];
  xp_by_source: { source: string; xp: number }[];
}

interface JobsStats {
  jobs: JobData[];
  total_players: number;
  max_level: number;
}

const JOB_COLORS: Record<string, string> = {
  Farmeur: "#22C55E",
  Mineur: "#3B82F6",
  Guerrier: "#EF4444",
  Pecheur: "#06B6D4",
};

const SOURCE_LABELS_FR: Record<string, string> = {
  wheat: "Blé", beetroot: "Betterave", potatoes: "Pommes de terre", carrots: "Carottes",
  pumpkin: "Citrouilles", melon: "Pastèques", nether_wart: "Nether wart",
  coal_ore: "Charbon", emerald_ore: "Émeraude", amethyste_ore: "Améthyste", rubis_ore: "Rubis",
  zombie: "Zombies", pigman: "Pigmen", wither: "Wither sk.", player_kill: "Joueurs tués",
  fish: "Poissons",
};

export default function JobsStatsPage() {
  const { locale } = useParams<{ locale: string }>();
  const { headers } = useAdmin();
  const [data, setData] = useState<JobsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const api = useRef(createAnalyticsFetcher(headers)).current;

  const loadData = useCallback(() => {
    api("stats/jobs")
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError(locale === "fr" ? "Erreur de chargement" : "Loading error"); setLoading(false); });
  }, [api, locale]);

  useEffect(() => { loadData(); }, [loadData]);
  useAutoRefresh(loadData);

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
          <p className="text-[14px] text-text-sub">{error || "—"}</p>
        </div>
      </div>
    );
  }

  const labelSource = (s: string) =>
    locale === "fr" ? (SOURCE_LABELS_FR[s] || s) : s;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-pink flex items-center justify-center">
          <Briefcase size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text">
            {locale === "fr" ? "Statistiques des métiers" : "Jobs Stats"}
          </h1>
          <p className="text-[12px] text-text-muted">
            {locale === "fr"
              ? `Équilibrer l'XP et les méthodes de farm — ${data.total_players} joueurs profilés`
              : `Balance XP & farm methods — ${data.total_players} profiled players`}
          </p>
        </div>
      </div>

      {/* Per job cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {data.jobs.map((job) => {
          const color = JOB_COLORS[job.name] || "#8E2DE2";
          const totalSourceXp = job.xp_by_source.reduce((s, x) => s + x.xp, 0) || 1;
          return (
            <div key={job.name} className="mc-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + "22" }}>
                    <Briefcase size={16} style={{ color }} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-text">{job.name}</h3>
                    <p className="text-[11px] text-text-muted">
                      {job.players} {locale === "fr" ? "joueurs" : "players"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[22px] font-bold" style={{ color }}>{job.avg_level.toFixed(1)}</p>
                  <p className="text-[10px] text-text-muted uppercase">{locale === "fr" ? "Niveau moy." : "Avg level"}</p>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-bg-soft rounded-lg p-2">
                  <div className="flex items-center gap-1 text-text-muted mb-1"><Star size={10} /><span className="text-[10px] uppercase">Max (lvl {data.max_level})</span></div>
                  <p className="text-[14px] font-bold text-text">{job.maxed_count}</p>
                </div>
                <div className="bg-bg-soft rounded-lg p-2">
                  <span className="text-[10px] uppercase text-text-muted">{locale === "fr" ? "XP moy. cumul." : "Avg lifetime XP"}</span>
                  <p className="text-[14px] font-bold text-text">{formatNumber(job.avg_lifetime_xp)}</p>
                </div>
                <div className="bg-bg-soft rounded-lg p-2">
                  <span className="text-[10px] uppercase text-text-muted">{locale === "fr" ? "XP cumulée totale" : "Total lifetime XP"}</span>
                  <p className="text-[14px] font-bold text-text">{formatNumber(job.total_lifetime_xp)}</p>
                </div>
              </div>

              {/* Level histogram */}
              <div className="mb-4">
                <h4 className="text-[11px] text-text-muted uppercase mb-2">
                  {locale === "fr" ? "Distribution des niveaux" : "Level distribution"}
                </h4>
                <div className="h-[140px]">
                  <Bar
                    data={{
                      labels: job.level_histogram.map((_, i) => i.toString()),
                      datasets: [{
                        data: job.level_histogram,
                        backgroundColor: color,
                        borderRadius: 2,
                      }],
                    }}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      plugins: { legend: { display: false }, tooltip: { callbacks: { title: (ctx) => `Niv. ${ctx[0].label}` } } },
                      scales: { x: { grid: { display: false }, ticks: { font: { size: 9 } } }, y: { beginAtZero: true, grid: { color: "#f0f0f0" }, ticks: { font: { size: 9 }, stepSize: 1 } } },
                    }}
                  />
                </div>
              </div>

              {/* XP by source */}
              <div>
                <h4 className="text-[11px] text-text-muted uppercase mb-2">
                  {locale === "fr" ? "XP gagnée par source (estimation)" : "XP earned by source (est.)"}
                </h4>
                {job.xp_by_source.length === 0 ? (
                  <p className="text-[12px] text-text-muted">{locale === "fr" ? "Aucune donnée" : "No data"}</p>
                ) : (
                  <div className="space-y-1.5">
                    {job.xp_by_source.map((src) => {
                      const pct = Math.round((src.xp / totalSourceXp) * 100);
                      return (
                        <div key={src.source}>
                          <div className="flex items-center justify-between text-[11px] mb-0.5">
                            <span className="text-text-sub">{labelSource(src.source)}</span>
                            <span className="font-semibold text-text">{formatNumber(src.xp)} XP <span className="text-text-muted">({pct}%)</span></span>
                          </div>
                          <div className="h-1.5 bg-bg-soft rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall comparison */}
      <div className="mc-card p-5">
        <h3 className="text-[14px] font-semibold text-text mb-4 flex items-center gap-2">
          <Users size={14} />
          {locale === "fr" ? "Comparaison des métiers" : "Jobs Comparison"}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="pb-2 pr-4 font-medium">{locale === "fr" ? "Métier" : "Job"}</th>
                <th className="pb-2 pr-4 font-medium text-right">{locale === "fr" ? "Joueurs" : "Players"}</th>
                <th className="pb-2 pr-4 font-medium text-right">{locale === "fr" ? "Niveau moyen" : "Avg level"}</th>
                <th className="pb-2 pr-4 font-medium text-right">{locale === "fr" ? "Max atteint" : "Maxed"}</th>
                <th className="pb-2 pr-4 font-medium text-right">{locale === "fr" ? "XP moy. cumul." : "Avg lifetime XP"}</th>
                <th className="pb-2 pr-4 font-medium text-right">{locale === "fr" ? "XP totale" : "Total XP"}</th>
              </tr>
            </thead>
            <tbody>
              {data.jobs.map((j) => (
                <tr key={j.name} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-semibold text-text" style={{ color: JOB_COLORS[j.name] }}>{j.name}</td>
                  <td className="py-2 pr-4 text-right text-text-sub">{j.players}</td>
                  <td className="py-2 pr-4 text-right text-text-sub">{j.avg_level.toFixed(2)}</td>
                  <td className="py-2 pr-4 text-right text-text-sub">{j.maxed_count}</td>
                  <td className="py-2 pr-4 text-right text-text-sub">{formatNumber(j.avg_lifetime_xp)}</td>
                  <td className="py-2 pr-4 text-right font-semibold text-text">{formatNumber(j.total_lifetime_xp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-text-muted mt-3 italic">
          {locale === "fr"
            ? "L'XP par source est estimée à partir des compteurs de farm × multiplicateurs de JobsConstants. Utile pour repérer les cultures/minerais qui dominent la progression."
            : "Per-source XP is estimated from farm counters × JobsConstants multipliers. Useful to spot dominant crops/ores."}
        </p>
      </div>
    </div>
  );
}
