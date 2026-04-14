"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Award, Activity, Target, TrendingUp } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { createAnalyticsFetcher, formatNumber } from "@/components/admin/AnalyticsAPI";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface PrestigeStats {
  distribution: { prestige: number; count: number }[];
  avg_prestige: number;
  max_prestige: number;
  total_players: number;
  total_quests: number;
  total_quests_completed: number;
  players_with_quests: number;
  avg_quests_per_player: number;
  quest_counts: { key: string; count: number }[];
  category_counts: { category: string; completed: number; tiers: number }[];
}

// Quest difficulty tiers — easy/medium/hard per quest category.
// Tier number suffix: 1 = easiest, 3 = hardest (most are 3 tiers).
const CATEGORY_LABELS_FR: Record<string, string> = {
  message: "Messages", shop_gain: "Gain shop", place_block: "Blocs posés",
  walk: "Distance marchée", wheat: "Blé récolté", beetroot: "Betteraves",
  potato: "Pommes de terre", carrot: "Carottes", pumpkin: "Citrouilles",
  melon: "Pastèques", nether_wart: "Nether wart", wood: "Bois/Charbon",
  emerald_ore: "Émeraude minée", amethyste_ore: "Améthyste minée", rubis_ore: "Rubis miné",
  zombie: "Zombies tués", pigman: "Pigmen tués", wither_skeleton: "Wither sk. tués",
  kill: "Kills joueurs", killstreak: "Killstreak", pearl: "Perles ender utilisées",
  stick_used: "Bâtons utilisés", death: "Morts", gapple: "Pommes d'or", healing_heart: "Vie régen.",
  critical_hit: "Coups critiques", bow_use: "Tirs d'arc", damage_dealt: "Dégâts infligés",
  fish: "Poissons pêchés", vote_streak: "Streak de vote", switchball: "Switchballs",
  enchant: "Enchantements", repair: "Réparations",
};

export default function PrestigePage() {
  const { locale } = useParams<{ locale: string }>();
  const { headers } = useAdmin();
  const [data, setData] = useState<PrestigeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const api = useRef(createAnalyticsFetcher(headers)).current;

  const loadData = useCallback(() => {
    api("stats/prestige")
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

  const labelCategory = (c: string) =>
    locale === "fr" ? (CATEGORY_LABELS_FR[c] || c) : c.replace(/_/g, " ");

  const completionRate = data.total_players
    ? Math.round((data.total_quests_completed / (data.total_players * data.total_quests)) * 100)
    : 0;

  // Group quests by category with per-tier counts for bottleneck detection.
  const questsByCategory = new Map<string, { tier: number; count: number; key: string }[]>();
  for (const q of data.quest_counts) {
    const m = q.key.match(/^(.+?)(\d+)$/);
    if (!m) continue;
    const [, cat, tier] = m;
    const list = questsByCategory.get(cat) ?? [];
    list.push({ tier: Number(tier), count: q.count, key: q.key });
    questsByCategory.set(cat, list);
  }
  for (const list of questsByCategory.values()) list.sort((a, b) => a.tier - b.tier);
  const sortedCategories = Array.from(questsByCategory.entries()).sort(
    (a, b) => b[1].reduce((s, x) => s + x.count, 0) - a[1].reduce((s, x) => s + x.count, 0),
  );

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-pink flex items-center justify-center">
          <Award size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text">
            {locale === "fr" ? "Prestige & Quêtes" : "Prestige & Quests"}
          </h1>
          <p className="text-[12px] text-text-muted">
            {locale === "fr"
              ? "Voir à quel stade les joueurs sont, et quelles quêtes bloquent la progression"
              : "See how far players progressed and which quests bottleneck them"}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: locale === "fr" ? "Joueurs" : "Players", value: formatNumber(data.total_players), icon: Award, color: "bg-pink/10 text-pink" },
          { label: locale === "fr" ? "Prestige moyen" : "Avg Prestige", value: data.avg_prestige.toFixed(2), icon: TrendingUp, color: "bg-violet/10 text-violet" },
          { label: locale === "fr" ? "Prestige max" : "Max Prestige", value: data.max_prestige.toString(), icon: Award, color: "bg-green/10 text-green" },
          { label: locale === "fr" ? "Quêtes faites (moy.)" : "Quests done (avg)", value: `${data.avg_quests_per_player} / ${data.total_quests}`, icon: Target, color: "bg-blue-50 text-blue-500" },
          { label: locale === "fr" ? "Complétion globale" : "Global completion", value: `${completionRate}%`, icon: Target, color: "bg-emerald-50 text-emerald-500" },
        ].map((kpi) => {
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

      {/* Prestige distribution */}
      <div className="mc-card p-5 mb-6">
        <h3 className="text-[14px] font-semibold text-text mb-4">
          {locale === "fr" ? "Distribution par prestige" : "Players per Prestige"}
        </h3>
        {data.distribution.length === 0 ? (
          <p className="text-[13px] text-text-muted">{locale === "fr" ? "Aucune donnée" : "No data"}</p>
        ) : (
          <div className="h-[260px]">
            <Bar
              data={{
                labels: data.distribution.map((d) => `P${d.prestige}`),
                datasets: [{
                  label: locale === "fr" ? "Joueurs" : "Players",
                  data: data.distribution.map((d) => d.count),
                  backgroundColor: "#8E2DE2",
                  borderRadius: 4,
                }],
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } }, y: { beginAtZero: true, grid: { color: "#f0f0f0" }, ticks: { font: { size: 10 }, stepSize: 1 } } },
              }}
            />
          </div>
        )}
      </div>

      {/* Quest category completion */}
      <div className="mc-card p-5 mb-6">
        <h3 className="text-[14px] font-semibold text-text mb-1">
          {locale === "fr" ? "Quêtes par catégorie — niveaux de difficulté" : "Quests by category — difficulty tiers"}
        </h3>
        <p className="text-[11px] text-text-muted mb-4">
          {locale === "fr"
            ? "Tier 1 = palier facile, Tier 2 = intermédiaire, Tier 3 = difficile. Un écart fort entre tiers signale une quête mal calibrée."
            : "Tier 1 = easy, 2 = medium, 3 = hard. A strong gap between tiers flags a badly tuned quest."}
        </p>
        {sortedCategories.length === 0 ? (
          <p className="text-[13px] text-text-muted">{locale === "fr" ? "Aucune donnée" : "No data"}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="pb-2 pr-4 font-medium">{locale === "fr" ? "Catégorie" : "Category"}</th>
                  <th className="pb-2 px-3 font-medium text-center">T1 (facile)</th>
                  <th className="pb-2 px-3 font-medium text-center">T2</th>
                  <th className="pb-2 px-3 font-medium text-center">T3 (difficile)</th>
                  <th className="pb-2 px-3 font-medium text-center">T4</th>
                  <th className="pb-2 pr-4 font-medium text-right">{locale === "fr" ? "Total" : "Total"}</th>
                </tr>
              </thead>
              <tbody>
                {sortedCategories.map(([cat, tiers]) => {
                  const byTier = new Map(tiers.map((t) => [t.tier, t.count]));
                  const total = tiers.reduce((s, x) => s + x.count, 0);
                  const cellPct = (c?: number) => {
                    if (!c) return <span className="text-text-muted">—</span>;
                    const pct = Math.round((c / data.total_players) * 100);
                    return (
                      <div>
                        <span className="font-semibold text-text">{c}</span>
                        <span className="text-text-muted"> ({pct}%)</span>
                      </div>
                    );
                  };
                  return (
                    <tr key={cat} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-semibold text-text">{labelCategory(cat)}</td>
                      <td className="py-2 px-3 text-center">{cellPct(byTier.get(1))}</td>
                      <td className="py-2 px-3 text-center">{cellPct(byTier.get(2))}</td>
                      <td className="py-2 px-3 text-center">{cellPct(byTier.get(3))}</td>
                      <td className="py-2 px-3 text-center">{cellPct(byTier.get(4))}</td>
                      <td className="py-2 pr-4 text-right font-semibold text-text">{formatNumber(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Easiest / hardest quests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Quêtes les plus accomplies (trop faciles ?)" : "Most completed quests (too easy?)"}
          </h3>
          {data.quest_counts.slice(0, 10).map((q) => {
            const pct = Math.round((q.count / data.total_players) * 100);
            return (
              <div key={q.key} className="mb-2">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-text-sub font-mono">{q.key}</span>
                  <span className="font-semibold text-text">{q.count} ({pct}%)</span>
                </div>
                <div className="h-1.5 bg-bg-soft rounded-full overflow-hidden">
                  <div className="h-full bg-green rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Quêtes les moins accomplies (trop dures ?)" : "Least completed quests (too hard?)"}
          </h3>
          {[...data.quest_counts].reverse().slice(0, 10).map((q) => {
            const pct = Math.round((q.count / data.total_players) * 100);
            return (
              <div key={q.key} className="mb-2">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-text-sub font-mono">{q.key}</span>
                  <span className="font-semibold text-text">{q.count} ({pct}%)</span>
                </div>
                <div className="h-1.5 bg-bg-soft rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
