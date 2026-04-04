"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Coins, ShoppingCart, Store, ArrowRightLeft, Activity,
  TrendingUp, TrendingDown, Package, Banknote, Users,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { createAnalyticsFetcher, formatNumber } from "@/components/admin/AnalyticsAPI";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler } from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

interface EconomyStats {
  shopBuyCount: number;
  shopBuyVolume: number;
  shopSellCount: number;
  shopSellVolume: number;
  marketBuyCount: number;
  marketSellCount: number;
  payCount: number;
  txLast24h: number;
  txLast7d: number;
}

interface CirculationData {
  latest: {
    total_money: number;
    player_count: number;
    avg_money: number;
    median_money: number;
    top_balances: string | null;
    timestamp: number;
  } | null;
  history: { total_money: number; player_count: number; avg_money: number; timestamp: number }[];
}

interface TopItem {
  item_name: string;
  action: string;
  tx_count: number;
  total_qty: number;
}

interface DailyEcon {
  date: string;
  shopBuys: number;
  shopSells: number;
  marketTx: number;
}

interface TopSpender {
  player_name: string;
  tx_count: number;
  buys: number;
  sells: number;
  pays: number;
}

export default function EconomyPage() {
  const { locale } = useParams<{ locale: string }>();
  const { headers } = useAdmin();
  const [stats, setStats] = useState<EconomyStats | null>(null);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [daily, setDaily] = useState<DailyEcon[]>([]);
  const [topSpenders, setTopSpenders] = useState<TopSpender[]>([]);
  const [circulation, setCirculation] = useState<CirculationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    const api = createAnalyticsFetcher(headers);
    Promise.all([
      api("stats/economy"),
      api("stats/economy/top-items"),
      api("stats/economy/daily", { days: "30" }),
      api("stats/economy/top-spenders", { limit: "10" }),
      api("stats/economy/circulation"),
    ]).then(([s, ti, d, ts, circ]) => {
      setStats(s);
      setTopItems(ti);
      setDaily(d);
      setTopSpenders(ts);
      setCirculation(circ);
      setLoading(false);
    }).catch(() => {
      setError(locale === "fr" ? "Impossible de charger les stats economie." : "Failed to load economy stats.");
      setLoading(false);
    });
  }, [headers, locale]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Activity size={32} className="text-pink mx-auto mb-3 animate-pulse" />
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

  const kpis = [
    { label: locale === "fr" ? "Achats shop" : "Shop Buys", value: formatNumber(stats.shopBuyCount), icon: ShoppingCart, color: "bg-pink/10 text-pink" },
    { label: locale === "fr" ? "Ventes shop" : "Shop Sells", value: formatNumber(stats.shopSellCount), icon: Store, color: "bg-green/10 text-green" },
    { label: locale === "fr" ? "Volume achats" : "Buy Volume", value: formatNumber(stats.shopBuyVolume) + "$", icon: TrendingDown, color: "bg-red-50 text-red-500" },
    { label: locale === "fr" ? "Volume ventes" : "Sell Volume", value: formatNumber(stats.shopSellVolume) + "$", icon: TrendingUp, color: "bg-emerald-50 text-emerald-500" },
    { label: locale === "fr" ? "Achats HDV" : "Market Buys", value: formatNumber(stats.marketBuyCount), icon: Package, color: "bg-violet/10 text-violet" },
    { label: locale === "fr" ? "Ventes HDV" : "Market Sells", value: formatNumber(stats.marketSellCount), icon: Package, color: "bg-blue-50 text-blue-500" },
    { label: locale === "fr" ? "Paiements" : "Payments", value: formatNumber(stats.payCount), icon: ArrowRightLeft, color: "bg-orange-50 text-orange-500" },
    { label: locale === "fr" ? "Transactions (24h)" : "Tx (24h)", value: formatNumber(stats.txLast24h), icon: Activity, color: "bg-cyan-50 text-cyan-500" },
    { label: locale === "fr" ? "Transactions (7j)" : "Tx (7d)", value: formatNumber(stats.txLast7d), icon: Coins, color: "bg-yellow-50 text-yellow-600" },
  ];

  const chartColors = {
    pink: "#8E2DE2",
    green: "#22C55E",
    violet: "#B84DFF",
    pinkSoft: "rgba(233, 30, 140, 0.1)",
    greenSoft: "rgba(34, 197, 94, 0.1)",
    violetSoft: "rgba(124, 58, 237, 0.1)",
  };

  // Aggregate items: group by item_name, sum buys and sells
  const itemMap = new Map<string, { buys: number; sells: number; buyQty: number; sellQty: number }>();
  for (const ti of topItems) {
    const existing = itemMap.get(ti.item_name) || { buys: 0, sells: 0, buyQty: 0, sellQty: 0 };
    if (ti.action === "ShopBuy") {
      existing.buys += ti.tx_count;
      existing.buyQty += ti.total_qty;
    } else {
      existing.sells += ti.tx_count;
      existing.sellQty += ti.total_qty;
    }
    itemMap.set(ti.item_name, existing);
  }
  const aggregatedItems = Array.from(itemMap.entries())
    .map(([name, data]) => ({ name, ...data, total: data.buys + data.sells }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-text mb-6">
        {locale === "fr" ? "Economie" : "Economy"}
      </h1>

      {/* Money in Circulation */}
      {circulation?.latest && (
        <div className="mc-card p-5 mb-6 border-l-4 border-l-pink">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-pink/10 flex items-center justify-center">
                <Banknote size={22} className="text-pink" />
              </div>
              <div>
                <p className="text-[11px] text-text-muted uppercase">{locale === "fr" ? "Argent total en circulation" : "Total Money in Circulation"}</p>
                <p className="text-[28px] font-bold text-text">{formatNumber(circulation.latest.total_money)}$</p>
              </div>
            </div>
            <div className="flex gap-6 ml-auto">
              <div className="text-center">
                <p className="text-[11px] text-text-muted">{locale === "fr" ? "Joueurs" : "Players"}</p>
                <p className="text-[18px] font-bold text-text">{circulation.latest.player_count}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-text-muted">{locale === "fr" ? "Moyenne" : "Average"}</p>
                <p className="text-[18px] font-bold text-text">{formatNumber(circulation.latest.avg_money)}$</p>
              </div>
              {circulation.latest.median_money > 0 && (
                <div className="text-center">
                  <p className="text-[11px] text-text-muted">{locale === "fr" ? "Mediane" : "Median"}</p>
                  <p className="text-[18px] font-bold text-text">{formatNumber(circulation.latest.median_money)}$</p>
                </div>
              )}
            </div>
          </div>
          {circulation.latest.top_balances && (() => {
            try {
              const topBal = JSON.parse(circulation.latest.top_balances as string) as { name: string; balance: number }[];
              if (!Array.isArray(topBal) || topBal.length === 0) return null;
              return (
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-[11px] text-text-muted mb-2">{locale === "fr" ? "Top balances" : "Top Balances"}</p>
                  <div className="flex flex-wrap gap-2">
                    {topBal.slice(0, 10).map((b, i) => (
                      <span key={i} className="px-2 py-1 rounded-lg bg-bg-soft text-[11px] font-medium text-text-sub">
                        {b.name}: {formatNumber(b.balance)}$
                      </span>
                    ))}
                  </div>
                </div>
              );
            } catch { return null; }
          })()}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
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

      {/* Daily chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="mc-card p-5 lg:col-span-2">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Transactions (30 jours)" : "Transactions (30 days)"}
          </h3>
          <div className="h-[250px]">
            <Line
              data={{
                labels: daily.map(d => d.date.slice(5)),
                datasets: [
                  {
                    label: locale === "fr" ? "Achats shop" : "Shop Buys",
                    data: daily.map(d => d.shopBuys),
                    borderColor: chartColors.pink,
                    backgroundColor: chartColors.pinkSoft,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHitRadius: 10,
                  },
                  {
                    label: locale === "fr" ? "Ventes shop" : "Shop Sells",
                    data: daily.map(d => d.shopSells),
                    borderColor: chartColors.green,
                    backgroundColor: chartColors.greenSoft,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHitRadius: 10,
                  },
                  {
                    label: "HDV",
                    data: daily.map(d => d.marketTx),
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

        {/* Top spenders */}
        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Top joueurs economie" : "Top Economy Players"}
          </h3>
          {topSpenders.length > 0 ? (
            <div className="space-y-2 max-h-[260px] overflow-auto">
              {topSpenders.map((p, i) => (
                <div key={p.player_name} className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-text-muted w-4">{i + 1}</span>
                    <span className="text-[12px] font-medium text-text">{p.player_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-pink">{p.buys}A</span>
                    <span className="text-green">{p.sells}V</span>
                    <span className="text-violet">{p.pays}P</span>
                    <span className="font-semibold text-text-sub">{formatNumber(p.tx_count)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-text-muted">{locale === "fr" ? "Aucune donnee" : "No data"}</p>
          )}
        </div>
      </div>

      {/* Top items chart + table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Items les plus echanges" : "Most Traded Items"}
          </h3>
          {aggregatedItems.length > 0 ? (
            <div className="h-[300px]">
              <Bar
                data={{
                  labels: aggregatedItems.slice(0, 10).map(i => i.name),
                  datasets: [
                    {
                      label: locale === "fr" ? "Achats" : "Buys",
                      data: aggregatedItems.slice(0, 10).map(i => i.buys),
                      backgroundColor: chartColors.pink,
                      borderRadius: 4,
                    },
                    {
                      label: locale === "fr" ? "Ventes" : "Sells",
                      data: aggregatedItems.slice(0, 10).map(i => i.sells),
                      backgroundColor: chartColors.green,
                      borderRadius: 4,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: "y",
                  plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
                  scales: { x: { grid: { color: "#f0f0f0" }, ticks: { font: { size: 10 } } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } },
                }}
              />
            </div>
          ) : (
            <p className="text-[13px] text-text-muted">{locale === "fr" ? "Aucune donnee" : "No data"}</p>
          )}
        </div>

        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Detail par item" : "Item Details"}
          </h3>
          {aggregatedItems.length > 0 ? (
            <div className="overflow-auto max-h-[310px]">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-text-muted border-b border-border">
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 font-medium text-right">{locale === "fr" ? "Achats" : "Buys"}</th>
                    <th className="pb-2 font-medium text-right">{locale === "fr" ? "Qte achetee" : "Qty Bought"}</th>
                    <th className="pb-2 font-medium text-right">{locale === "fr" ? "Ventes" : "Sells"}</th>
                    <th className="pb-2 font-medium text-right">{locale === "fr" ? "Qte vendue" : "Qty Sold"}</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregatedItems.map((item) => (
                    <tr key={item.name} className="border-b border-border/50">
                      <td className="py-2 font-medium text-text">{item.name}</td>
                      <td className="py-2 text-right text-pink">{formatNumber(item.buys)}</td>
                      <td className="py-2 text-right text-text-sub">{formatNumber(item.buyQty)}</td>
                      <td className="py-2 text-right text-green">{formatNumber(item.sells)}</td>
                      <td className="py-2 text-right text-text-sub">{formatNumber(item.sellQty)}</td>
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
    </div>
  );
}
