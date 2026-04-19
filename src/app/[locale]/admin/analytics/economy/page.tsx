"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Coins, Activity, Banknote, Clock, Users, TrendingUp, TrendingDown,
  AlertTriangle, Search, ChevronDown, ChevronRight, Flame, Zap,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { createAnalyticsFetcher, formatNumber } from "@/components/admin/AnalyticsAPI";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import {
  ACTIVITIES, ACTIVITY_META, type Activity as ActivityType,
} from "@/lib/activity-categories";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Tooltip, Legend, Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

type Period = "24h" | "7d" | "30d" | "all";

interface ActivityRow {
  activity: ActivityType;
  hours_active: number;
  active_players: number;
  items_total: number;
  revenue: number;
  expense: number;
  net: number;
  per_hour: number;
  delta_pct: number;
}

interface ItemRow {
  item_name: string;
  activity: ActivityType | null;
  role: "output" | "input" | "tool" | null;
  bought: number;
  sold: number;
  crafted: number;
  from_boxes: number;
  net_circulation: number;
  revenue: number;
  expense: number;
  avg_sell_price: number | null;
  avg_buy_price: number | null;
  margin: number | null;
  total_tx: number;
  activity_revenue_share: number;
}

interface TimelineRow {
  date: string;
  mine: number; farm: number; wood: number; mob: number; fish: number;
}

interface AnomaliesData {
  outliers: { player_name: string; activity: ActivityType; hours: number; revenue: number; rate: number; median: number; multiple: number }[];
  sinks: { item_name: string; bought: number; sold: number }[];
  dupe_suspects: { item_name: string; sold: number; produced: number; delta: number }[];
  uncategorized: { item_name: string; revenue: number; total_tx: number }[];
}

interface Circulation {
  latest: {
    total_money: number;
    player_count: number;
    avg_money: number;
    median_money: number;
    top_balances: string | null;
    timestamp: number;
  } | null;
}

const PERIOD_LABELS: Record<Period, { fr: string; en: string }> = {
  "24h": { fr: "24h",   en: "24h" },
  "7d":  { fr: "7 jours",  en: "7 days" },
  "30d": { fr: "30 jours", en: "30 days" },
  "all": { fr: "Tout",     en: "All" },
};

function fmtMoney(n: number, locale: string): string {
  if (!Number.isFinite(n)) return "0$";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M$`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K$`;
  return `${sign}${abs.toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}$`;
}

function fmtHours(h: number): string {
  if (h <= 0) return "0h";
  if (h < 1) return `${Math.round(h * 60)}min`;
  if (h < 10) return `${h.toFixed(1)}h`;
  return `${Math.round(h)}h`;
}

function fmtDelta(pct: number, locale: string): { text: string; color: string } {
  if (!Number.isFinite(pct) || pct === 0) return { text: "—", color: "text-text-muted" };
  const rounded = Math.abs(pct) >= 10 ? Math.round(pct) : pct.toFixed(1);
  const text = pct > 0 ? `+${rounded}%` : `${rounded}%`;
  const color = pct > 10 ? "text-green" : pct < -10 ? "text-red-500" : "text-text-sub";
  void locale;
  return { text, color };
}

export default function EconomyBalancePage() {
  const { locale } = useParams<{ locale: string }>();
  const { headers, can } = useAdmin();
  const [period, setPeriod] = useState<Period>("7d");
  const [activities, setActivities] = useState<ActivityRow[] | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [anomalies, setAnomalies] = useState<AnomaliesData | null>(null);
  const [circulation, setCirculation] = useState<Circulation | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [itemSearchDebounced, setItemSearchDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const api = useRef(createAnalyticsFetcher(headers)).current;

  useEffect(() => {
    const t = setTimeout(() => setItemSearchDebounced(itemSearch), 250);
    return () => clearTimeout(t);
  }, [itemSearch]);

  const loadCore = useCallback(() => {
    Promise.all([
      api("stats/balance/activities", { period }),
      api("stats/balance/timeline", { period }),
      api("stats/balance/anomalies", { period }),
      api("stats/economy/circulation"),
    ])
      .then(([a, t, an, c]) => {
        setActivities(a);
        setTimeline(t);
        setAnomalies(an);
        setCirculation(c);
        setLoading(false);
      })
      .catch(() => {
        setError(locale === "fr" ? "Erreur de chargement" : "Loading error");
        setLoading(false);
      });
  }, [api, period, locale]);

  const loadItems = useCallback(() => {
    const params: Record<string, string> = { period };
    if (selectedActivity) params.activity = selectedActivity;
    if (itemSearchDebounced) params.search = itemSearchDebounced;
    api("stats/balance/items", params)
      .then((d: { items: ItemRow[] }) => setItems(d.items))
      .catch(() => {});
  }, [api, period, selectedActivity, itemSearchDebounced]);

  useEffect(() => { loadCore(); }, [loadCore]);
  useEffect(() => { loadItems(); }, [loadItems]);
  useAutoRefresh(() => { loadCore(); loadItems(); });

  const medianPerHour = useMemo(() => {
    if (!activities) return 0;
    const rates = activities.map((a) => a.per_hour).filter((r) => r > 0).sort((a, b) => a - b);
    if (rates.length === 0) return 0;
    const mid = Math.floor(rates.length / 2);
    return rates.length % 2 ? rates[mid] : (rates[mid - 1] + rates[mid]) / 2;
  }, [activities]);

  if (!can("analytics.view")) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="mc-card p-8 text-center max-w-md">
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

  const totalRevenue = (activities ?? []).reduce((s, a) => s + a.revenue, 0);
  const totalExpense = (activities ?? []).reduce((s, a) => s + a.expense, 0);
  const totalNet = totalRevenue - totalExpense;
  const totalHours = (activities ?? []).reduce((s, a) => s + a.hours_active, 0);
  const totalItems = (activities ?? []).reduce((s, a) => s + a.items_total, 0);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-text">
            {locale === "fr" ? "Équilibrage économie" : "Economy Balance"}
          </h1>
          <p className="text-[12px] text-text-muted mt-1">
            {locale === "fr"
              ? "Rentabilité comparée des activités (temps · revenu · dépenses)"
              : "Activity profitability comparison (time · revenue · expenses)"}
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-bg-soft">
          {(["24h", "7d", "30d", "all"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                period === p ? "bg-white text-text shadow-sm" : "text-text-muted hover:text-text"
              }`}
            >
              {PERIOD_LABELS[p][locale === "fr" ? "fr" : "en"]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiCard
          icon={Banknote}
          color="bg-pink/10 text-pink"
          label={locale === "fr" ? "Argent en circulation" : "Circulation"}
          value={circulation?.latest ? fmtMoney(circulation.latest.total_money, locale) : "—"}
          sub={circulation?.latest ? `${circulation.latest.player_count} ${locale === "fr" ? "joueurs" : "players"}` : ""}
        />
        <KpiCard
          icon={TrendingUp}
          color="bg-green/10 text-green"
          label={locale === "fr" ? "Revenu total" : "Total Revenue"}
          value={fmtMoney(totalRevenue, locale)}
        />
        <KpiCard
          icon={TrendingDown}
          color="bg-red-50 text-red-500"
          label={locale === "fr" ? "Dépenses totales" : "Total Expenses"}
          value={fmtMoney(totalExpense, locale)}
        />
        <KpiCard
          icon={Coins}
          color="bg-violet/10 text-violet"
          label={locale === "fr" ? "Net injecté" : "Net Injected"}
          value={fmtMoney(totalNet, locale)}
        />
        <KpiCard
          icon={Clock}
          color="bg-cyan-50 text-cyan-500"
          label={locale === "fr" ? "Temps actif total" : "Total Active Time"}
          value={fmtHours(totalHours)}
          sub={`${formatNumber(totalItems)} ${locale === "fr" ? "items" : "items"}`}
        />
      </div>

      {/* Activity comparison table */}
      <div className="mc-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-semibold text-text">
            {locale === "fr" ? "Rentabilité par activité" : "Profitability by activity"}
          </h2>
          <p className="text-[11px] text-text-muted">
            {locale === "fr" ? "Cliquer sur une ligne pour filtrer les items" : "Click a row to filter items"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="text-left px-2 py-2 font-medium w-[170px]">
                  {locale === "fr" ? "Activité" : "Activity"}
                </th>
                <th className="text-right px-2 py-2 font-medium">$/h</th>
                <th className="text-right px-2 py-2 font-medium">{locale === "fr" ? "Revenu" : "Revenue"}</th>
                <th className="text-right px-2 py-2 font-medium">{locale === "fr" ? "Dépenses" : "Expenses"}</th>
                <th className="text-right px-2 py-2 font-medium">{locale === "fr" ? "Net" : "Net"}</th>
                <th className="text-right px-2 py-2 font-medium">{locale === "fr" ? "Temps" : "Time"}</th>
                <th className="text-right px-2 py-2 font-medium">{locale === "fr" ? "Joueurs" : "Players"}</th>
                <th className="text-right px-2 py-2 font-medium">Items</th>
                <th className="text-right px-2 py-2 font-medium">Δ</th>
              </tr>
            </thead>
            <tbody>
              {(activities ?? []).map((row) => {
                const meta = ACTIVITY_META[row.activity];
                const isSelected = selectedActivity === row.activity;
                const rateColor =
                  medianPerHour === 0 || row.per_hour === 0
                    ? "text-text-sub"
                    : row.per_hour > medianPerHour * 1.5
                    ? "text-red-500"
                    : row.per_hour < medianPerHour * 0.5
                    ? "text-green"
                    : "text-text";
                const delta = fmtDelta(row.delta_pct, locale);
                return (
                  <tr
                    key={row.activity}
                    onClick={() => setSelectedActivity(isSelected ? null : row.activity)}
                    className={`border-b border-border/50 cursor-pointer transition-colors ${
                      isSelected ? "bg-pink/5" : "hover:bg-bg-soft"
                    }`}
                  >
                    <td className="px-2 py-2.5 font-medium text-text">
                      <div className="flex items-center gap-2">
                        {isSelected ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: meta.color }}
                        />
                        {locale === "fr" ? meta.label_fr : meta.label_en}
                      </div>
                    </td>
                    <td className={`px-2 py-2.5 text-right font-semibold ${rateColor}`}>
                      {fmtMoney(row.per_hour, locale)}
                    </td>
                    <td className="px-2 py-2.5 text-right text-green">{fmtMoney(row.revenue, locale)}</td>
                    <td className="px-2 py-2.5 text-right text-red-500">{fmtMoney(row.expense, locale)}</td>
                    <td className={`px-2 py-2.5 text-right font-medium ${row.net >= 0 ? "text-text" : "text-red-500"}`}>
                      {fmtMoney(row.net, locale)}
                    </td>
                    <td className="px-2 py-2.5 text-right text-text-sub">{fmtHours(row.hours_active)}</td>
                    <td className="px-2 py-2.5 text-right text-text-sub">{row.active_players}</td>
                    <td className="px-2 py-2.5 text-right text-text-sub">{formatNumber(row.items_total)}</td>
                    <td className={`px-2 py-2.5 text-right font-medium ${delta.color}`}>{delta.text}</td>
                  </tr>
                );
              })}
              {(!activities || activities.every((a) => a.hours_active === 0 && a.revenue === 0)) && (
                <tr>
                  <td colSpan={9} className="px-2 py-8 text-center text-text-muted">
                    {locale === "fr"
                      ? "Aucune activité détectée. Instrumentation plugin requise pour le temps actif."
                      : "No activity detected. Plugin instrumentation required for active time."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {medianPerHour > 0 && (
          <p className="text-[10px] text-text-muted mt-3">
            {locale === "fr" ? "Médiane $/h : " : "Median $/h: "}
            <span className="font-medium text-text-sub">{fmtMoney(medianPerHour, locale)}</span>
            {" — "}
            {locale === "fr"
              ? "rouge = sur-rémunérée (candidat nerf), vert = sous-rémunérée (candidat buff)."
              : "red = over-rewarded (nerf candidate), green = under-rewarded (buff candidate)."}
          </p>
        )}
      </div>

      {/* Items drill-down */}
      <div className="mc-card p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="text-[14px] font-semibold text-text">
              {locale === "fr" ? "Items" : "Items"}
              {selectedActivity && (
                <span className="ml-2 text-[11px] font-normal text-text-muted">
                  · {locale === "fr" ? "filtré: " : "filtered: "}
                  <span className="font-medium" style={{ color: ACTIVITY_META[selectedActivity].color }}>
                    {locale === "fr" ? ACTIVITY_META[selectedActivity].label_fr : ACTIVITY_META[selectedActivity].label_en}
                  </span>
                  <button
                    onClick={() => setSelectedActivity(null)}
                    className="ml-2 underline text-pink hover:text-pink/70"
                  >
                    {locale === "fr" ? "tout voir" : "clear"}
                  </button>
                </span>
              )}
            </h2>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder={locale === "fr" ? "Rechercher un item…" : "Search item…"}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-border bg-white text-[12px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none w-[220px]"
            />
          </div>
        </div>
        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-border text-text-muted">
                <th className="text-left px-2 py-2 font-medium">Item</th>
                <th className="text-left px-2 py-2 font-medium">{locale === "fr" ? "Activité" : "Activity"}</th>
                <th className="text-right px-2 py-2 font-medium">{locale === "fr" ? "Vendus" : "Sold"}</th>
                <th className="text-right px-2 py-2 font-medium">{locale === "fr" ? "Achetés" : "Bought"}</th>
                <th className="text-right px-2 py-2 font-medium">{locale === "fr" ? "P.vente moy" : "Avg sell"}</th>
                <th className="text-right px-2 py-2 font-medium">{locale === "fr" ? "P.achat moy" : "Avg buy"}</th>
                <th className="text-right px-2 py-2 font-medium">{locale === "fr" ? "Marge" : "Margin"}</th>
                <th className="text-right px-2 py-2 font-medium">{locale === "fr" ? "Revenu" : "Revenue"}</th>
                <th className="text-right px-2 py-2 font-medium">% {locale === "fr" ? "activité" : "activity"}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const meta = it.activity ? ACTIVITY_META[it.activity] : null;
                return (
                  <tr key={it.item_name} className="border-b border-border/50 hover:bg-bg-soft">
                    <td className="px-2 py-2 font-medium text-text">{it.item_name}</td>
                    <td className="px-2 py-2">
                      {meta ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                          <span className="text-text-sub">{locale === "fr" ? meta.label_fr : meta.label_en}</span>
                          {it.role && it.role !== "output" && (
                            <span className="text-[10px] px-1 rounded bg-bg-soft text-text-muted">{it.role}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
                          {locale === "fr" ? "non catégorisé" : "uncategorized"}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right text-green">{formatNumber(it.sold)}</td>
                    <td className="px-2 py-2 text-right text-pink">{formatNumber(it.bought)}</td>
                    <td className="px-2 py-2 text-right text-text-sub">
                      {it.avg_sell_price != null ? fmtMoney(it.avg_sell_price, locale) : "—"}
                    </td>
                    <td className="px-2 py-2 text-right text-text-sub">
                      {it.avg_buy_price != null ? fmtMoney(it.avg_buy_price, locale) : "—"}
                    </td>
                    <td className={`px-2 py-2 text-right font-medium ${
                      it.margin == null ? "text-text-muted" : it.margin > 0 ? "text-green" : "text-red-500"
                    }`}>
                      {it.margin != null ? fmtMoney(it.margin, locale) : "—"}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-text">{fmtMoney(it.revenue, locale)}</td>
                    <td className="px-2 py-2 text-right text-text-muted">
                      {it.activity_revenue_share > 0 ? `${it.activity_revenue_share.toFixed(0)}%` : "—"}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-2 py-8 text-center text-text-muted">
                    {locale === "fr" ? "Aucun item" : "No items"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timeline chart */}
      <div className="mc-card p-5 mb-6">
        <h2 className="text-[14px] font-semibold text-text mb-4">
          {locale === "fr" ? "$/h par activité" : "$/h per activity"}
        </h2>
        <div className="h-[260px]">
          <Line
            data={{
              labels: timeline.map((t) => t.date.slice(5)),
              datasets: ACTIVITIES.map((a) => ({
                label: locale === "fr" ? ACTIVITY_META[a].label_fr : ACTIVITY_META[a].label_en,
                data: timeline.map((t) => t[a]),
                borderColor: ACTIVITY_META[a].color,
                backgroundColor: ACTIVITY_META[a].color + "15",
                fill: false,
                tension: 0.35,
                pointRadius: 0,
                pointHitRadius: 8,
                borderWidth: 2,
              })),
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
              scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                y: {
                  beginAtZero: true,
                  grid: { color: "#f0f0f0" },
                  ticks: {
                    font: { size: 10 },
                    callback: (v) => formatNumber(Number(v)) + "$",
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Anomalies */}
      {anomalies && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <AnomalySection
            icon={Flame}
            color="text-red-500"
            title={locale === "fr" ? "Outliers $/h" : "$/h outliers"}
            subtitle={locale === "fr" ? "Joueurs > 5× médiane" : "Players > 5× median"}
            empty={locale === "fr" ? "Aucun outlier détecté" : "No outliers detected"}
            rows={anomalies.outliers.map((o) => ({
              key: `${o.player_name}|${o.activity}`,
              left: (
                <span>
                  <span className="font-medium text-text">{o.player_name}</span>
                  <span className="ml-1 text-[10px]" style={{ color: ACTIVITY_META[o.activity].color }}>
                    · {locale === "fr" ? ACTIVITY_META[o.activity].label_fr : ACTIVITY_META[o.activity].label_en}
                  </span>
                </span>
              ),
              right: (
                <span>
                  <span className="font-semibold text-red-500">{fmtMoney(o.rate, locale)}/h</span>
                  <span className="ml-1 text-[10px] text-text-muted">({o.multiple.toFixed(1)}×)</span>
                </span>
              ),
            }))}
          />
          <AnomalySection
            icon={Zap}
            color="text-amber-500"
            title={locale === "fr" ? "Dupe suspects" : "Dupe suspects"}
            subtitle={locale === "fr" ? "Vendu > produit + craft + box" : "Sold > produced + crafted + box"}
            empty={locale === "fr" ? "Aucun cas suspect" : "No suspicious cases"}
            rows={anomalies.dupe_suspects.map((d) => ({
              key: d.item_name,
              left: <span className="font-medium text-text">{d.item_name}</span>,
              right: (
                <span>
                  <span className="text-red-500">+{formatNumber(d.delta)}</span>
                  <span className="ml-1 text-[10px] text-text-muted">
                    {formatNumber(d.sold)} / {formatNumber(d.produced)}
                  </span>
                </span>
              ),
            }))}
          />
          <AnomalySection
            icon={AlertTriangle}
            color="text-blue-500"
            title={locale === "fr" ? "Arbitrage sinks" : "Arbitrage sinks"}
            subtitle={locale === "fr" ? "Beaucoup achetés, jamais vendus" : "Heavily bought, never sold"}
            empty={locale === "fr" ? "Aucun sink détecté" : "No sinks detected"}
            rows={anomalies.sinks.map((s) => ({
              key: s.item_name,
              left: <span className="font-medium text-text">{s.item_name}</span>,
              right: (
                <span>
                  <span className="text-pink">{formatNumber(s.bought)}</span>
                  <span className="text-text-muted"> / </span>
                  <span className="text-text-muted">{formatNumber(s.sold)}</span>
                </span>
              ),
            }))}
          />
          <AnomalySection
            icon={Users}
            color="text-violet"
            title={locale === "fr" ? "Items non catégorisés" : "Uncategorized items"}
            subtitle={locale === "fr" ? "À ajouter dans activity-categories.ts" : "To add to activity-categories.ts"}
            empty={locale === "fr" ? "Toutes catégorisées" : "All categorized"}
            rows={anomalies.uncategorized.map((u) => ({
              key: u.item_name,
              left: <span className="font-medium text-text">{u.item_name}</span>,
              right: (
                <span>
                  <span className="font-semibold text-text-sub">{fmtMoney(u.revenue, locale)}</span>
                  <span className="ml-1 text-[10px] text-text-muted">{formatNumber(u.total_tx)} tx</span>
                </span>
              ),
            }))}
          />
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon, color, label, value, sub,
}: {
  icon: typeof Coins;
  color: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="mc-card px-4 py-4">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-2`}>
        <Icon size={15} />
      </div>
      <p className="text-[20px] font-bold text-text leading-tight">{value}</p>
      <p className="text-[11px] text-text-muted">{label}</p>
      {sub && <p className="text-[10px] text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function AnomalySection({
  icon: Icon, color, title, subtitle, empty, rows,
}: {
  icon: typeof AlertTriangle;
  color: string;
  title: string;
  subtitle: string;
  empty: string;
  rows: { key: string; left: React.ReactNode; right: React.ReactNode }[];
}) {
  return (
    <div className="mc-card p-5">
      <div className="flex items-start gap-3 mb-3">
        <Icon size={18} className={color} />
        <div>
          <h3 className="text-[13px] font-semibold text-text">{title}</h3>
          <p className="text-[10px] text-text-muted">{subtitle}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-[12px] text-text-muted py-2">{empty}</p>
      ) : (
        <div className="space-y-1.5 max-h-[260px] overflow-auto">
          {rows.map((r) => (
            <div
              key={r.key}
              className="flex items-center justify-between text-[11px] py-1.5 border-b border-border/40 last:border-0"
            >
              {r.left}
              {r.right}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
