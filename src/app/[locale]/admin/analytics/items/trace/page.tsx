"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Fingerprint, Search, Activity, MapPin, User, Clock, ArrowRight, Package, AlertTriangle } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { createAnalyticsFetcher, formatDate } from "@/components/admin/AnalyticsAPI";

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
  target_player: string | null;
  world: string | null;
  x: number | null;
  y: number | null;
  z: number | null;
  level: string;
  timestamp: number;
  server_id: string | null;
}

function getEventColor(category: string, action: string): string {
  if (category === "economy" && action === "CashCreate") return "border-green-400 bg-green-50";
  if (category === "economy" && action === "CashUse") return "border-violet bg-violet/5";
  if (category === "trade") return "border-pink bg-pink/5";
  if (category === "death") return "border-red-400 bg-red-50";
  if (category === "craft") return "border-blue-400 bg-blue-50";
  if (action === "Drop") return "border-orange-400 bg-orange-50";
  if (action === "PickUp") return "border-teal-400 bg-teal-50";
  return "border-border bg-white";
}

function getEventLabel(category: string, action: string, locale: string): string {
  const labels: Record<string, { fr: string; en: string }> = {
    "economy:CashCreate": { fr: "Creation", en: "Created" },
    "economy:CashUse": { fr: "Utilisation", en: "Used" },
    "trade:TradeReceive": { fr: "Echange", en: "Trade" },
    "death:ItemLost": { fr: "Perdu (mort)", en: "Lost (death)" },
    "craft:Craft": { fr: "Craft", en: "Crafted" },
    "craft:Consumed": { fr: "Consomme", en: "Consumed" },
    "item:Drop": { fr: "Lache", en: "Dropped" },
    "item:PickUp": { fr: "Ramasse", en: "Picked up" },
    "item:Use": { fr: "Utilise", en: "Used" },
    "item:Chest": { fr: "Coffre", en: "Chest" },
    "item:DoubleChest": { fr: "Double Coffre", en: "Double Chest" },
    "item:EnderChest": { fr: "Ender Chest", en: "Ender Chest" },
    "item:Shulker": { fr: "Shulker", en: "Shulker" },
    "item:Barrel": { fr: "Tonneau", en: "Barrel" },
    "item:Armor": { fr: "Armure", en: "Armor" },
    "item:Transaction": { fr: "Transaction", en: "Transaction" },
    "item:Break": { fr: "Casse", en: "Broken" },
    "item:Place": { fr: "Place", en: "Placed" },
    "item:Creative": { fr: "Creatif", en: "Creative" },
  };
  const key = `${category}:${action}`;
  return labels[key]?.[locale as "fr" | "en"] || `${category}/${action}`;
}

export default function ItemTracePage() {
  const { locale } = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const { headers } = useAdmin();

  const initialUid = searchParams.get("uid") || "";
  const [uid, setUid] = useState(initialUid);
  const [searchUid, setSearchUid] = useState(initialUid);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(!!initialUid);
  const [error, setError] = useState("");

  const api = useRef(createAnalyticsFetcher(headers)).current;

  const fetchTrace = useCallback((uidToSearch: string) => {
    if (!uidToSearch.trim()) return;
    setLoading(true);
    setSearched(true);
    setError("");

    api("logs", {
      item_uid: uidToSearch.trim(),
      limit: "500",
      offset: "0",
    })
      .then((data) => {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => {
        setError(locale === "fr" ? "Erreur de chargement" : "Loading error");
        setLoading(false);
      });
  }, [api, locale]);

  // Auto-fetch on initial UID from URL
  useEffect(() => {
    if (initialUid) fetchTrace(initialUid);
  }, [initialUid, fetchTrace]);

  const handleSearch = () => {
    setSearchUid(uid);
    fetchTrace(uid);
  };

  const firstLog = logs.length > 0 ? logs[logs.length - 1] : null;
  const lastLog = logs.length > 0 ? logs[0] : null;

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink to-violet flex items-center justify-center">
          <Fingerprint size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text">
            {locale === "fr" ? "Tracer un item" : "Trace Item"}
          </h1>
          <p className="text-[12px] text-text-muted">
            {locale === "fr" ? "Suivez l'historique complet d'un item par son identifiant unique" : "Track the full history of an item by its unique ID"}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mc-card p-5 mb-6">
        <label className="text-[12px] font-semibold text-text-sub mb-2 block">
          {locale === "fr" ? "Identifiant unique (UID)" : "Unique Identifier (UID)"}
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Fingerprint size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder={locale === "fr" ? "Ex: a3f2b1c0" : "E.g. a3f2b1c0"}
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-border bg-white text-[13px] text-text font-mono placeholder:text-text-muted focus:border-pink focus:outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!uid.trim()}
            className="px-6 py-2.5 rounded-xl bg-pink text-white text-[13px] font-medium hover:bg-pink/90 disabled:opacity-40 transition-colors flex items-center gap-2"
          >
            <Search size={14} />
            {locale === "fr" ? "Tracer" : "Trace"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="mc-card p-12 text-center">
          <Activity size={24} className="text-pink mx-auto animate-pulse" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mc-card p-6 text-center">
          <AlertTriangle size={20} className="text-orange-500 mx-auto mb-2" />
          <p className="text-[13px] text-text-sub">{error}</p>
        </div>
      )}

      {/* Results */}
      {searched && !loading && !error && (
        <>
          {logs.length === 0 ? (
            <div className="mc-card p-8 text-center">
              <Fingerprint size={32} className="text-text-muted mx-auto mb-3" />
              <p className="text-[14px] font-medium text-text mb-1">
                {locale === "fr" ? "Aucun resultat" : "No results"}
              </p>
              <p className="text-[12px] text-text-muted">
                {locale === "fr"
                  ? `Aucun item avec l'identifiant "${searchUid}" n'a ete trouve.`
                  : `No item with ID "${searchUid}" was found.`}
              </p>
            </div>
          ) : (
            <>
              {/* Item summary */}
              <div className="mc-card p-5 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Package size={16} className="text-pink" />
                  <div>
                    <p className="text-[14px] font-bold text-text">{firstLog?.item_name || "Item"}</p>
                    <p className="text-[11px] text-text-muted font-mono">UID: {searchUid}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[11px] text-text-muted">{locale === "fr" ? "Evenements" : "Events"}</p>
                    <p className="text-[16px] font-bold text-text">{total}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-text-muted">{locale === "fr" ? "Premier evenement" : "First event"}</p>
                    <p className="text-[12px] font-medium text-text">{firstLog ? formatDate(firstLog.timestamp) : "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-text-muted">{locale === "fr" ? "Dernier evenement" : "Last event"}</p>
                    <p className="text-[12px] font-medium text-text">{lastLog ? formatDate(lastLog.timestamp) : "-"}</p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-0">
                {logs.map((log, i) => (
                  <div key={log.id} className="flex gap-4">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center w-6 shrink-0">
                      <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                        i === 0 ? "border-pink bg-pink" : "border-border bg-white"
                      }`} />
                      {i < logs.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
                    </div>

                    {/* Event card */}
                    <div className={`flex-1 mb-3 rounded-xl border-l-4 p-4 ${getEventColor(log.category, log.action)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-text">
                            {getEventLabel(log.category, log.action, locale)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-text-muted">
                          <Clock size={11} />
                          {formatDate(log.timestamp)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
                        <div className="flex items-center gap-1">
                          <User size={12} className="text-text-muted" />
                          <span className="font-medium text-text">{log.player_name}</span>
                        </div>

                        {log.target_player && (
                          <div className="flex items-center gap-1">
                            <ArrowRight size={12} className="text-text-muted" />
                            <span className="font-medium text-text">{log.target_player}</span>
                          </div>
                        )}

                        {log.world && (
                          <div className="flex items-center gap-1">
                            <MapPin size={12} className="text-text-muted" />
                            <span className="text-text-sub">
                              {log.world}
                              {log.x != null && <span className="text-text-muted"> ({log.x}, {log.y}, {log.z})</span>}
                            </span>
                          </div>
                        )}
                      </div>

                      {log.detail && (
                        <p className="text-[11px] text-text-sub mt-1.5">{log.detail}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Empty state */}
      {!searched && !loading && (
        <div className="mc-card p-12 text-center">
          <Fingerprint size={40} className="text-text-muted mx-auto mb-4" />
          <p className="text-[14px] font-medium text-text mb-1">
            {locale === "fr" ? "Tracez un item" : "Trace an item"}
          </p>
          <p className="text-[12px] text-text-muted max-w-sm mx-auto">
            {locale === "fr"
              ? "Entrez l'identifiant unique d'un item (visible dans les logs) pour voir son historique complet : creation, transactions, echanges, etc."
              : "Enter the unique identifier of an item (visible in logs) to see its full history: creation, transactions, trades, etc."}
          </p>
        </div>
      )}
    </div>
  );
}
