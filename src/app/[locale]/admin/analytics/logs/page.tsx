"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { ScrollText, Search, Activity, ChevronLeft, ChevronRight, AlertTriangle, Info, X, MapPin, Package, User, Clock, Skull, Swords, Backpack, Sparkles } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { createAnalyticsFetcher, formatDate } from "@/components/admin/AnalyticsAPI";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { enchantmentName, enchantmentLevel, parseEnchantments } from "@/lib/enchantments";

interface LogEntry {
  id: number;
  player_uuid: string;
  player_name: string;
  category: string;
  action: string;
  detail: string | null;
  item_name: string | null;
  item_count: number | null;
  item_uid: string | null;
  item_enchantments: string | null;
  target_player: string | null;
  world: string | null;
  x: number | null;
  y: number | null;
  z: number | null;
  level: string;
  timestamp: number;
  server_id: string | null;
}

interface LogStats {
  totalLogs: number;
  logsLast24h: number;
  warnings: number;
  warningsLast24h: number;
  topPlayers: { player_name: string; count: number }[];
  topItems: { item_name: string; count: number }[];
  topActions: { action: string; count: number }[];
}

// Canonical list emitted by LinesiaCore's AnalyticsManager. Merged with
// live counts from /logs/categories so the dropdown still shows categories
// that haven't been logged yet (otherwise a fresh category is invisible
// until someone triggers it).
const KNOWN_CATEGORIES = [
  "box", "casino", "chat", "command", "connection",
  "craft", "death", "economy", "item", "trade",
];

const KNOWN_ACTIONS: Record<string, string[]> = {
  box: ["Cosmetic", "Commun", "Farm", "Fire", "Ice", "Legendary", "Void"],
  casino: ["blackjack", "coinflip", "roulette", "rps"],
  chat: ["Message", "PrivateMessage", "StaffChat", "FactionChat"],
  connection: ["Join", "Quit"],
  craft: ["Craft", "Consumed"],
  death: ["Death", "ItemLost"],
  economy: ["CashCreate", "CashUse", "MarketBuy", "MarketSell", "Pay", "ShopBuy", "ShopSell"],
  item: [
    "Break", "Drop", "PickUp", "Place", "Use", "Creative",
    "EnderChest", "Furnace", "Armor", "Barrel", "Anvil", "BrewingStand",
    "Chest", "DoubleChest", "Enchant", "Hopper", "Shulker", "Transaction",
  ],
  trade: ["CosmeticTrade", "TradeReceive"],
};

function parseDeathDetail(detail: string | null): { cause?: string; killer?: string; killer_uuid?: string; victim_inventory?: { name: string; count: number }[]; killer_inventory?: { name: string; count: number }[]; raw?: string } | null {
  if (!detail) return null;
  try {
    const parsed = JSON.parse(detail);
    if (typeof parsed === "object" && parsed !== null && (parsed.cause || parsed.killer || parsed.victim_inventory)) {
      return parsed;
    }
  } catch {
    // Not JSON, return as raw text
  }
  return { raw: detail };
}

function InventoryList({ items, label }: { items: { name: string; count: number }[]; label: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] text-text-muted mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="px-2 py-0.5 rounded bg-bg-soft text-[11px] text-text-sub font-medium">
            {item.name}{item.count > 1 ? ` x${item.count}` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function LogDetailModal({ log, locale, onClose }: { log: LogEntry; locale: string; onClose: () => void }) {
  const isDeath = log.category === "death";
  const deathData = isDeath ? parseDeathDetail(log.detail) : null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="mc-card p-0 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`px-5 py-3 flex items-center justify-between shrink-0 ${isDeath ? "bg-red-50" : log.level === "warning" ? "bg-orange-50" : "bg-bg-soft"}`}>
          <div className="flex items-center gap-2">
            {isDeath ? <Skull size={15} className="text-red-500" /> : log.level === "warning" ? <AlertTriangle size={15} className="text-orange-500" /> : <Info size={15} className="text-pink" />}
            <span className="text-[13px] font-bold text-text">{log.category} / {log.action}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-black/5 transition-colors">
            <X size={16} className="text-text-sub" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          {/* Player */}
          <div className="flex items-start gap-3">
            <User size={14} className="text-text-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-text-muted">{locale === "fr" ? "Joueur" : "Player"}</p>
              <p className="text-[13px] font-medium text-text">{log.player_name || "-"}</p>
              {log.player_uuid && <p className="text-[10px] text-text-muted font-mono">{log.player_uuid}</p>}
            </div>
          </div>

          {/* Death-specific: Killer */}
          {isDeath && deathData && deathData.killer && (
            <div className="flex items-start gap-3">
              <Swords size={14} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] text-text-muted">{locale === "fr" ? "Tue par" : "Killed by"}</p>
                <p className="text-[13px] font-semibold text-red-600">{deathData.killer}</p>
                {deathData.killer_uuid && <p className="text-[10px] text-text-muted font-mono">{deathData.killer_uuid}</p>}
              </div>
            </div>
          )}

          {/* Death cause */}
          {isDeath && deathData && deathData.cause && (
            <div className="flex items-start gap-3">
              <Skull size={14} className="text-text-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] text-text-muted">{locale === "fr" ? "Cause" : "Cause"}</p>
                <p className="text-[13px] text-text">{deathData.cause}</p>
              </div>
            </div>
          )}

          {/* Death: Victim inventory */}
          {isDeath && deathData?.victim_inventory && deathData.victim_inventory.length > 0 && (
            <div className="flex items-start gap-3">
              <Backpack size={14} className="text-orange-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <InventoryList items={deathData.victim_inventory} label={locale === "fr" ? "Inventaire de la victime" : "Victim's Inventory"} />
              </div>
            </div>
          )}

          {/* Death: Killer inventory */}
          {isDeath && deathData?.killer_inventory && deathData.killer_inventory.length > 0 && (
            <div className="flex items-start gap-3">
              <Backpack size={14} className="text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <InventoryList items={deathData.killer_inventory} label={locale === "fr" ? "Inventaire du tueur" : "Killer's Inventory"} />
              </div>
            </div>
          )}

          {/* Target (non-death) */}
          {log.target_player && (
            <div className="flex items-start gap-3">
              <User size={14} className="text-violet mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] text-text-muted">{locale === "fr" ? "Cible" : "Target"}</p>
                <p className="text-[13px] font-medium text-text">{log.target_player}</p>
              </div>
            </div>
          )}

          {/* Detail (non-death or raw death text) */}
          {log.detail && (!isDeath || (deathData?.raw)) && (
            <div className="flex items-start gap-3">
              <Info size={14} className="text-text-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] text-text-muted">Detail</p>
                <p className="text-[13px] text-text break-all">{isDeath && deathData?.raw ? deathData.raw : log.detail}</p>
              </div>
            </div>
          )}

          {/* Item */}
          {log.item_name && (() => {
            const enchs = parseEnchantments(log.item_enchantments);
            return (
              <div className="flex items-start gap-3">
                <Package size={14} className="text-text-muted mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[11px] text-text-muted">Item</p>
                  <p className="text-[13px] text-text">
                    {log.item_name}{log.item_count && log.item_count > 1 ? ` x${log.item_count}` : ""}
                  </p>
                  {log.item_uid && (
                    <a href={`/${locale}/admin/analytics/items/trace?uid=${log.item_uid}`} className="text-[10px] text-pink font-mono hover:underline" onClick={(e) => e.stopPropagation()}>
                      UID: {log.item_uid}
                    </a>
                  )}
                  {enchs.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <Sparkles size={11} className="text-violet" />
                      {enchs.map((e, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-violet/10 text-[11px] font-medium text-violet">
                          {enchantmentName(e.id)} {enchantmentLevel(e.level)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Location */}
          {log.world && (
            <div className="flex items-start gap-3">
              <MapPin size={14} className="text-text-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] text-text-muted">{locale === "fr" ? "Position" : "Location"}</p>
                <p className="text-[13px] text-text">
                  {log.world}
                  {log.x != null && <span className="text-text-muted"> ({log.x}, {log.y}, {log.z})</span>}
                </p>
              </div>
            </div>
          )}

          {/* Time + Server */}
          <div className="flex items-start gap-3">
            <Clock size={14} className="text-text-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-text-muted">Date</p>
              <p className="text-[13px] text-text">{formatDate(log.timestamp)}</p>
              {log.server_id && <p className="text-[10px] text-text-muted">Server: {log.server_id}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LogsPage() {
  const { locale } = useParams<{ locale: string }>();
  const { headers } = useAdmin();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [page, setPage] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  // Filters (raw = what the user types, deb = debounced value used for fetching)
  const [player, setPlayer] = useState("");
  const [category, setCategory] = useState("");
  const [action, setAction] = useState("");
  const [item, setItem] = useState("");
  const [level, setLevel] = useState("");
  const [searchText, setSearchText] = useState("");

  const [debPlayer, setDebPlayer] = useState("");
  const [debAction, setDebAction] = useState("");
  const [debItem, setDebItem] = useState("");
  const [debSearch, setDebSearch] = useState("");

  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const limit = 50;
  const api = useRef(createAnalyticsFetcher(headers)).current;

  // Debounce text inputs so typing doesn't trigger a fetch per keystroke.
  // Resetting `page` here keeps the user on page 1 when filters change.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebPlayer(player);
      setDebAction(action);
      setDebItem(item);
      setDebSearch(searchText);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [player, action, item, searchText]);

  useEffect(() => {
    Promise.all([
      api("logs/categories"),
      api("logs/stats"),
    ]).then(([cats, s]) => {
      setCategories(cats);
      setStats(s);
    }).catch(() => {});
  }, [api]);

  const fetchLogs = useCallback(() => {
    setRefreshing(true);
    const params: Record<string, string> = {
      limit: limit.toString(),
      offset: (page * limit).toString(),
    };
    if (debPlayer) params.player = debPlayer;
    if (category) params.category = category;
    if (debAction) params.action = debAction;
    if (debItem) params.item = debItem;
    if (level) params.level = level;
    if (debSearch) params.search = debSearch;

    api("logs", params)
      .then((data) => {
        setLogs(data.logs);
        setTotal(data.total);
        setInitialLoading(false);
        setRefreshing(false);
      })
      .catch(() => {
        setError(locale === "fr" ? "Erreur de chargement" : "Loading error");
        setInitialLoading(false);
        setRefreshing(false);
      });
  }, [api, page, debPlayer, category, debAction, debItem, level, debSearch, locale]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useAutoRefresh(fetchLogs);

  const totalPages = Math.ceil(total / limit);

  // Merge live counts with the canonical list so freshly-added categories
  // still show up in the dropdown, and known categories keep their count.
  const mergedCategories = (() => {
    const seen = new Set(categories.map(c => c.category));
    const out = [...categories];
    for (const c of KNOWN_CATEGORIES) {
      if (!seen.has(c)) out.push({ category: c, count: 0 });
    }
    return out;
  })();

  const actionSuggestions = category && KNOWN_ACTIONS[category] ? KNOWN_ACTIONS[category] : [];

  if (error && !stats) {
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
      {selectedLog && <LogDetailModal log={selectedLog} locale={locale} onClose={() => setSelectedLog(null)} />}

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-pink flex items-center justify-center">
          <ScrollText size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-text">Logs</h1>
          <p className="text-[12px] text-text-muted">{total} {locale === "fr" ? "entrees" : "entries"}</p>
        </div>
        {refreshing && !initialLoading && (
          <Activity size={14} className="text-pink animate-pulse" />
        )}
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="mc-card px-4 py-3">
            <p className="text-[11px] text-text-muted">{locale === "fr" ? "Total logs" : "Total Logs"}</p>
            <p className="text-[18px] font-bold text-text">{stats.totalLogs.toLocaleString()}</p>
          </div>
          <div className="mc-card px-4 py-3">
            <p className="text-[11px] text-text-muted">{locale === "fr" ? "Logs (24h)" : "Logs (24h)"}</p>
            <p className="text-[18px] font-bold text-text">{stats.logsLast24h.toLocaleString()}</p>
          </div>
          <div className="mc-card px-4 py-3">
            <p className="text-[11px] text-text-muted">{locale === "fr" ? "Alertes" : "Warnings"}</p>
            <p className="text-[18px] font-bold text-orange-500">{stats.warnings.toLocaleString()}</p>
          </div>
          <div className="mc-card px-4 py-3">
            <p className="text-[11px] text-text-muted">{locale === "fr" ? "Alertes (24h)" : "Warnings (24h)"}</p>
            <p className="text-[18px] font-bold text-orange-500">{stats.warningsLast24h.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mc-card p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder={locale === "fr" ? "Recherche..." : "Search..."}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-white text-[12px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none"
            />
          </div>
          <input
            type="text"
            placeholder={locale === "fr" ? "Joueur" : "Player"}
            value={player}
            onChange={(e) => setPlayer(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-white text-[12px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none"
          />
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(0); }}
            className="px-3 py-2 rounded-lg border border-border bg-white text-[12px] text-text focus:border-pink focus:outline-none"
          >
            <option value="">{locale === "fr" ? "Categorie" : "Category"}</option>
            {mergedCategories.map(c => (
              <option key={c.category} value={c.category}>
                {c.category}{c.count > 0 ? ` (${c.count})` : ""}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            list="log-actions"
            className="px-3 py-2 rounded-lg border border-border bg-white text-[12px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none"
          />
          <datalist id="log-actions">
            {actionSuggestions.map(a => <option key={a} value={a} />)}
          </datalist>
          <input
            type="text"
            placeholder="Item"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-white text-[12px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none"
          />
          <select
            value={level}
            onChange={(e) => { setLevel(e.target.value); setPage(0); }}
            className="px-3 py-2 rounded-lg border border-border bg-white text-[12px] text-text focus:border-pink focus:outline-none"
          >
            <option value="">{locale === "fr" ? "Niveau" : "Level"}</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
          </select>
        </div>
      </div>

      {/* Logs table */}
      <div className="mc-card overflow-hidden">
        {initialLoading ? (
          <div className="p-12 text-center">
            <Activity size={24} className="text-pink mx-auto animate-pulse" />
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity ${refreshing ? "opacity-60" : ""}`}>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border bg-bg-soft">
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub w-8"></th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Joueur" : "Player"}</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Categorie" : "Category"}</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub">Action</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub">Detail</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub">Item</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub">{locale === "fr" ? "Monde" : "World"}</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-text-sub">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`border-b border-border/50 cursor-pointer hover:bg-pink/5 transition-colors ${log.level === "warning" ? "bg-orange-50/50" : ""}`}
                  >
                    <td className="px-3 py-2">
                      {log.level === "warning" ? (
                        <AlertTriangle size={13} className="text-orange-500" />
                      ) : (
                        <Info size={13} className="text-text-muted" />
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium text-text">{log.player_name || "-"}</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded bg-bg-soft text-[11px] font-semibold text-text-sub">
                        {log.category}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-text-sub">{log.action}</td>
                    <td className="px-3 py-2 text-text-sub max-w-[200px] truncate">{log.detail || "-"}</td>
                    <td className="px-3 py-2 text-text-sub">
                      {log.item_name ? (() => {
                        const enchs = parseEnchantments(log.item_enchantments);
                        return (
                          <span>
                            {log.item_name}
                            {log.item_count && log.item_count > 1 ? <span className="text-text-muted"> x{log.item_count}</span> : ""}
                            {log.item_uid && (
                              <a
                                href={`/${locale}/admin/analytics/items/trace?uid=${log.item_uid}`}
                                className="ml-1 text-[10px] text-pink font-mono hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {log.item_uid}
                              </a>
                            )}
                            {enchs.length > 0 && (
                              <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-violet" title={enchs.map(e => `${enchantmentName(e.id)} ${enchantmentLevel(e.level)}`).join(", ")}>
                                <Sparkles size={10} />
                                {enchs.length}
                              </span>
                            )}
                          </span>
                        );
                      })() : "-"}
                    </td>
                    <td className="px-3 py-2 text-text-sub">{log.world || "-"}</td>
                    <td className="px-3 py-2 text-text-muted whitespace-nowrap">{formatDate(log.timestamp)}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-text-muted">
                      {locale === "fr" ? "Aucun log trouve" : "No logs found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-[12px] text-text-muted">
            {page * limit + 1}-{Math.min((page + 1) * limit, total)} / {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg border border-border bg-white text-text-sub hover:bg-bg-soft disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[12px] text-text-sub">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg border border-border bg-white text-text-sub hover:bg-bg-soft disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
