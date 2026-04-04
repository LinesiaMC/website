"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Package, Search, Activity, Gem, TrendingUp, TrendingDown, ArrowRightLeft,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { createAnalyticsFetcher, formatNumber } from "@/components/admin/AnalyticsAPI";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler } from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

interface ItemCirculation {
  item_name: string;
  bought: number;
  sold: number;
  crafted: number;
  from_boxes: number;
  total_tx: number;
}

interface DailyItem {
  date: string;
  bought: number;
  sold: number;
  crafted: number;
}

export default function ItemsPage() {
  const { locale } = useParams<{ locale: string }>();
  const { headers } = useAdmin();
  const [items, setItems] = useState<ItemCirculation[]>([]);
  const [totalUnique, setTotalUnique] = useState(0);
  const [totalTx, setTotalTx] = useState(0);
  const [daily, setDaily] = useState<DailyItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const api = useRef(createAnalyticsFetcher(headers)).current;

  const fetchItems = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { limit: "100" };
    if (search) params.search = search;
    api("stats/items/circulation", params)
      .then((data) => {
        setItems(data.items);
        setTotalUnique(data.totalUniqueItems);
        setTotalTx(data.totalTransactions);
        setLoading(false);
      })
      .catch(() => {
        setError(locale === "fr" ? "Erreur de chargement" : "Loading error");
        setLoading(false);
      });
  }, [api, search, locale]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Fetch daily chart for selected item or all
  useEffect(() => {
    const params: Record<string, string> = { days: "14" };
    if (selectedItem) params.item = selectedItem;
    api("stats/items/daily", params)
      .then(setDaily)
      .catch(() => {});
  }, [api, selectedItem]);

  const handleSearch = () => fetchItems();

  const chartColors = {
    pink: "#E91E8C",
    green: "#22C55E",
    violet: "#7C3AED",
    pinkSoft: "rgba(233, 30, 140, 0.1)",
    greenSoft: "rgba(34, 197, 94, 0.1)",
    violetSoft: "rgba(124, 58, 237, 0.1)",
  };

  if (error && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="mc-card p-8 text-center">
          <p className="text-[14px] text-text-sub">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet flex items-center justify-center">
          <Gem size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text">
            {locale === "fr" ? "Items en circulation" : "Items in Circulation"}
          </h1>
          <p className="text-[12px] text-text-muted">
            {totalUnique} {locale === "fr" ? "items uniques" : "unique items"} &middot; {formatNumber(totalTx)} transactions
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="mc-card px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Package size={14} className="text-pink" />
            <p className="text-[11px] text-text-muted">{locale === "fr" ? "Items uniques" : "Unique Items"}</p>
          </div>
          <p className="text-[20px] font-bold text-text">{totalUnique}</p>
        </div>
        <div className="mc-card px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <ArrowRightLeft size={14} className="text-violet" />
            <p className="text-[11px] text-text-muted">{locale === "fr" ? "Total transactions" : "Total Transactions"}</p>
          </div>
          <p className="text-[20px] font-bold text-text">{formatNumber(totalTx)}</p>
        </div>
        <div className="mc-card px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-green" />
            <p className="text-[11px] text-text-muted">{locale === "fr" ? "Total achetes" : "Total Bought"}</p>
          </div>
          <p className="text-[20px] font-bold text-green">{formatNumber(items.reduce((s, i) => s + i.bought, 0))}</p>
        </div>
        <div className="mc-card px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} className="text-red-500" />
            <p className="text-[11px] text-text-muted">{locale === "fr" ? "Total vendus" : "Total Sold"}</p>
          </div>
          <p className="text-[20px] font-bold text-red-500">{formatNumber(items.reduce((s, i) => s + i.sold, 0))}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mc-card p-4 mb-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder={locale === "fr" ? "Rechercher un item (ex: onyx, diamant...)" : "Search item (e.g. onyx, diamond...)"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-white text-[12px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none"
            />
          </div>
          <button onClick={handleSearch} className="px-4 py-2 rounded-lg bg-pink text-white text-[12px] font-medium hover:bg-pink/90 transition-colors">
            {locale === "fr" ? "Rechercher" : "Search"}
          </button>
        </div>
      </div>

      {/* Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Daily chart */}
        <div className="mc-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold text-text">
              {selectedItem
                ? `${selectedItem} (14 ${locale === "fr" ? "jours" : "days"})`
                : locale === "fr" ? "Flux items (14 jours)" : "Item Flow (14 days)"
              }
            </h3>
            {selectedItem && (
              <button onClick={() => setSelectedItem("")} className="text-[11px] text-pink hover:underline">
                {locale === "fr" ? "Voir tout" : "View all"}
              </button>
            )}
          </div>
          <div className="h-[250px]">
            {daily.length > 0 ? (
              <Line
                data={{
                  labels: daily.map(d => d.date.slice(5)),
                  datasets: [
                    {
                      label: locale === "fr" ? "Achetes" : "Bought",
                      data: daily.map(d => d.bought),
                      borderColor: chartColors.pink,
                      backgroundColor: chartColors.pinkSoft,
                      fill: true,
                      tension: 0.4,
                      pointRadius: 2,
                    },
                    {
                      label: locale === "fr" ? "Vendus" : "Sold",
                      data: daily.map(d => d.sold),
                      borderColor: chartColors.green,
                      backgroundColor: chartColors.greenSoft,
                      fill: true,
                      tension: 0.4,
                      pointRadius: 2,
                    },
                    {
                      label: locale === "fr" ? "Craftes" : "Crafted",
                      data: daily.map(d => d.crafted),
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
            ) : (
              <div className="flex items-center justify-center h-full">
                <Activity size={24} className="text-pink animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* Top items bar chart */}
        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Top items" : "Top Items"}
          </h3>
          {items.length > 0 ? (
            <div className="h-[250px]">
              <Bar
                data={{
                  labels: items.slice(0, 8).map(i => i.item_name.length > 12 ? i.item_name.slice(0, 12) + "..." : i.item_name),
                  datasets: [{
                    label: locale === "fr" ? "Transactions" : "Transactions",
                    data: items.slice(0, 8).map(i => i.total_tx),
                    backgroundColor: chartColors.pink,
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
      </div>

      {/* Items table */}
      <div className="mc-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Activity size={24} className="text-pink mx-auto animate-pulse" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border bg-bg-soft">
                  <th className="text-left px-4 py-2.5 font-semibold text-text-sub">Item</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Achetes" : "Bought"}</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Vendus" : "Sold"}</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Craftes" : "Crafted"}</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Via Boxes" : "From Boxes"}</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Net circulation" : "Net Circulation"}</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Total TX" : "Total TX"}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const net = item.bought + item.crafted + item.from_boxes - item.sold;
                  return (
                    <tr
                      key={item.item_name}
                      onClick={() => setSelectedItem(item.item_name)}
                      className="border-b border-border/50 cursor-pointer hover:bg-pink/5 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-medium text-text">{item.item_name}</td>
                      <td className="px-4 py-2.5 text-right text-pink">{formatNumber(item.bought)}</td>
                      <td className="px-4 py-2.5 text-right text-green">{formatNumber(item.sold)}</td>
                      <td className="px-4 py-2.5 text-right text-violet">{formatNumber(item.crafted)}</td>
                      <td className="px-4 py-2.5 text-right text-orange-500">{formatNumber(item.from_boxes)}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${net >= 0 ? "text-green" : "text-red-500"}`}>
                        {net >= 0 ? "+" : ""}{formatNumber(net)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-text-sub">{formatNumber(item.total_tx)}</td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                      {locale === "fr" ? "Aucun item trouve" : "No items found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
