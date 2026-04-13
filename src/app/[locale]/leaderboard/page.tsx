"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Trophy, Search, Clock, ChevronLeft, ChevronRight, Activity, Check, Crown, Sword, Coins, Zap, Flag, Star } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Row {
  uuid: string;
  username: string;
  platform: string;
  total_playtime: number;
  session_count: number;
  last_seen: number;
  first_seen: number;
  linked?: boolean;
  linked_ms_gamertag?: string | null;
  rank: string | null;
  prestige: number;
  money: number | null;
  power: number;
  prime: number | null;
  kills: number;
  deaths: number;
  killstreak: number;
  kd: number;
  faction: string | null;
  stat_value: number | null;
}

interface SortOpt { key: string; fr: string; en: string }
const SORT_GROUPS: { title: { fr: string; en: string }; items: SortOpt[] }[] = [
  {
    title: { fr: "Général", en: "General" },
    items: [
      { key: "total_playtime", fr: "Temps de jeu",       en: "Playtime" },
      { key: "in_playtime",    fr: "Temps in-game",      en: "In-game time" },
      { key: "session_count",  fr: "Sessions",           en: "Sessions" },
      { key: "last_seen",      fr: "Dernière connexion", en: "Last seen" },
      { key: "first_seen",     fr: "Ancienneté",         en: "Oldest" },
      { key: "prestige",       fr: "Prestige",           en: "Prestige" },
      { key: "prime",          fr: "VIP",                en: "VIP" },
    ],
  },
  {
    title: { fr: "Économie & pouvoir", en: "Economy & power" },
    items: [
      { key: "money",          fr: "Argent",             en: "Money" },
      { key: "power",          fr: "Puissance",          en: "Power" },
      { key: "shop_gain",      fr: "Gains shop",         en: "Shop gains" },
      { key: "vote_streak",    fr: "Streak votes",       en: "Vote streak" },
    ],
  },
  {
    title: { fr: "Combat", en: "Combat" },
    items: [
      { key: "kills",          fr: "Kills",              en: "Kills" },
      { key: "deaths",         fr: "Morts",              en: "Deaths" },
      { key: "kd_ratio",       fr: "Ratio K/D",          en: "K/D ratio" },
      { key: "killstreak",     fr: "Killstreak",         en: "Killstreak" },
      { key: "damage_dealt",   fr: "Dégâts infligés",    en: "Damage dealt" },
      { key: "critical_hit",   fr: "Coups critiques",    en: "Crits" },
      { key: "bow_use",        fr: "Tirs à l’arc",       en: "Bow shots" },
      { key: "pearl",          fr: "Perles lancées",     en: "Pearls" },
      { key: "gapple",         fr: "Gapples mangées",    en: "Gapples" },
      { key: "healing_heart",  fr: "Cœurs régénérés",    en: "Hearts healed" },
    ],
  },
  {
    title: { fr: "Mine", en: "Mining" },
    items: [
      { key: "mine",           fr: "Blocs minés",        en: "Blocks mined" },
      { key: "place",          fr: "Blocs posés",        en: "Blocks placed" },
      { key: "coal_ore",       fr: "Charbon / bois",     en: "Coal / wood" },
      { key: "emerald_ore",    fr: "Émeraudes",          en: "Emeralds" },
      { key: "amethyste_ore",  fr: "Améthystes",         en: "Amethysts" },
      { key: "rubis_ore",      fr: "Rubis",              en: "Rubies" },
    ],
  },
  {
    title: { fr: "Ferme", en: "Farming" },
    items: [
      { key: "wheat",          fr: "Blé",                en: "Wheat" },
      { key: "beetroot",       fr: "Betteraves",         en: "Beetroot" },
      { key: "potatoes",       fr: "Pommes de terre",    en: "Potatoes" },
      { key: "carrots",        fr: "Carottes",           en: "Carrots" },
      { key: "pumpkin",        fr: "Citrouilles",        en: "Pumpkins" },
      { key: "melon",          fr: "Pastèques",          en: "Melons" },
      { key: "nether_wart",    fr: "Nether wart",        en: "Nether wart" },
    ],
  },
  {
    title: { fr: "Mobs & artisanat", en: "Mobs & crafting" },
    items: [
      { key: "zombie",         fr: "Zombies",            en: "Zombies" },
      { key: "pigman",         fr: "Zombie-cochons",     en: "Pigmen" },
      { key: "wither",         fr: "Wither skeletons",   en: "Wither skeletons" },
      { key: "fish",           fr: "Poissons pêchés",    en: "Fish caught" },
      { key: "fishstreak",     fr: "Streak pêche",       en: "Fish streak" },
      { key: "repair",         fr: "Réparations",        en: "Repairs" },
      { key: "enchant",        fr: "Enchantements",      en: "Enchants" },
      { key: "walk",           fr: "Pas",                en: "Steps" },
      { key: "message",        fr: "Messages",           en: "Messages" },
    ],
  },
];

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h >= 24) return `${Math.floor(h / 24)}j ${h % 24}h`;
  return `${h}h ${m}m`;
}
function formatDate(ts: number, locale: string): string {
  return new Date(ts).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { day: "2-digit", month: "short", year: "numeric" });
}
function findSortLabel(key: string, locale: string): string {
  for (const g of SORT_GROUPS) for (const i of g.items) if (i.key === key) return locale === "fr" ? i.fr : i.en;
  return key;
}

export default function LeaderboardPage() {
  const { locale } = useParams<{ locale: string }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("total_playtime");
  const [loading, setLoading] = useState(true);
  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      sort, limit: String(limit), offset: String(page * limit),
    });
    if (search) params.set("search", search);
    const res = await fetch(`/api/leaderboard?${params.toString()}`);
    const j = await res.json();
    setRows(j.players || []);
    setTotal(j.total || 0);
    setLoading(false);
  }, [sort, page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setTimeout(() => setPage(0), 0); return () => clearTimeout(t); }, [search, sort]);

  const totalPages = Math.ceil(total / limit);

  const renderSortValue = (r: Row): string => {
    if (r.stat_value != null) return r.stat_value.toLocaleString();
    switch (sort) {
      case "total_playtime": return formatDuration(r.total_playtime);
      case "in_playtime":    return formatDuration((r as unknown as { in_playtime?: number }).in_playtime ?? 0);
      case "session_count":  return r.session_count.toLocaleString();
      case "last_seen":      return formatDate(r.last_seen, locale);
      case "first_seen":     return formatDate(r.first_seen, locale);
      case "prestige":       return `P${r.prestige}`;
      case "prime":          return r.prime != null ? `${r.prime}$` : "—";
      case "money":          return r.money != null ? r.money.toLocaleString() : "—";
      case "power":          return r.power.toLocaleString(undefined, { maximumFractionDigits: 1 });
      case "kills":          return r.kills.toLocaleString();
      case "deaths":         return r.deaths.toLocaleString();
      case "kd_ratio":       return r.kd.toFixed(2);
      case "killstreak":     return r.killstreak.toLocaleString();
      default:               return "—";
    }
  };

  const sortLabel = findSortLabel(sort, locale);

  return (
    <main>
      <Navbar />
    <div className="min-h-screen bg-bg-soft pt-[110px] pb-16 px-4">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink/10 text-pink text-[12px] font-semibold mb-3">
            <Trophy size={13} />{locale === "fr" ? "Classement" : "Leaderboard"}
          </div>
          <h1 className="text-3xl font-bold text-text mb-2">
            {locale === "fr" ? "Top joueurs Linesia" : "Top Linesia players"}
          </h1>
          <p className="text-[14px] text-text-sub">
            {locale === "fr" ? "Choisis un tracker et découvre les meilleurs du serveur." : "Pick a tracker and see the top of the server."}
          </p>
        </div>

        <div className="mc-card p-4 mb-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={locale === "fr" ? "Rechercher un pseudo..." : "Search a name..."}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none"
              />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none min-w-[220px]">
              {SORT_GROUPS.map((g) => (
                <optgroup key={g.title.en} label={locale === "fr" ? g.title.fr : g.title.en}>
                  {g.items.map((s) => (
                    <option key={s.key} value={s.key}>{locale === "fr" ? s.fr : s.en}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        <div className="mc-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><Activity size={24} className="text-pink mx-auto animate-pulse" /></div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-text-muted text-[13px]">
              {locale === "fr" ? "Aucun joueur trouvé" : "No players found"}
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-bg-soft">
                  <th className="text-left px-4 py-3 font-semibold text-text-sub w-12">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Joueur" : "Player"}</th>
                  <th className="text-left px-3 py-3 font-semibold text-text-sub"><Crown size={12} className="inline mr-1" />{locale === "fr" ? "Rang" : "Rank"}</th>
                  <th className="text-left px-3 py-3 font-semibold text-text-sub hidden md:table-cell"><Flag size={12} className="inline mr-1" />Faction</th>
                  <th className="text-left px-3 py-3 font-semibold text-text-sub hidden md:table-cell"><Sword size={12} className="inline mr-1" />K/D</th>
                  <th className="text-left px-3 py-3 font-semibold text-text-sub hidden lg:table-cell"><Coins size={12} className="inline mr-1" />{locale === "fr" ? "Solde" : "Money"}</th>
                  <th className="text-left px-3 py-3 font-semibold text-text-sub hidden lg:table-cell"><Zap size={12} className="inline mr-1" />{locale === "fr" ? "Puiss." : "Power"}</th>
                  <th className="text-left px-3 py-3 font-semibold text-text-sub"><Clock size={12} className="inline mr-1" />{locale === "fr" ? "Jeu" : "Time"}</th>
                  <th className="text-left px-3 py-3 font-semibold text-pink">{sortLabel}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const absRank = page * limit + i + 1;
                  const medal = absRank === 1 ? "🥇" : absRank === 2 ? "🥈" : absRank === 3 ? "🥉" : null;
                  return (
                    <tr key={r.uuid} className="border-b border-border/50 hover:bg-bg-soft/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-text-muted">
                        {medal ? <span className="text-[15px]">{medal}</span> : absRank}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/${locale}/profile/${r.uuid}`} className="font-semibold text-text hover:text-pink transition-colors inline-flex items-center gap-1.5">
                          {r.username}
                          {r.prestige > 0 && <span className="text-[10px] font-bold text-pink bg-pink/10 px-1 py-0.5 rounded">P{r.prestige}</span>}
                          {r.prime != null && <Star size={11} className="text-amber-500" />}
                          {r.linked && <Check size={11} className="text-green-600" />}
                        </Link>
                        <div className="text-[11px] text-text-muted">{r.platform}</div>
                      </td>
                      <td className="px-3 py-3">
                        {r.rank ? (
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-pink bg-pink/10 px-2 py-0.5 rounded">
                            {r.rank}
                          </span>
                        ) : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-3 py-3 text-text-sub hidden md:table-cell">
                        {r.faction ? (
                          <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">{r.faction}</span>
                        ) : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <span className="text-text font-semibold">{r.kills.toLocaleString()}</span>
                        <span className="text-text-muted mx-1">/</span>
                        <span className="text-text-sub">{r.deaths.toLocaleString()}</span>
                        <span className="ml-1 text-[11px] text-text-muted">({r.kd.toFixed(2)})</span>
                      </td>
                      <td className="px-3 py-3 text-text-sub hidden lg:table-cell">
                        {r.money != null ? r.money.toLocaleString() : "—"}
                      </td>
                      <td className="px-3 py-3 text-text-sub hidden lg:table-cell">
                        {r.power.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-3 py-3 text-text-sub">{formatDuration(r.total_playtime)}</td>
                      <td className="px-3 py-3 font-bold text-pink">{renderSortValue(r)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-[12px] text-text-muted">
              {page * limit + 1}-{Math.min((page + 1) * limit, total)} / {total}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="p-2 rounded-lg border border-border bg-white text-text-sub hover:bg-bg-soft disabled:opacity-40 transition-colors"><ChevronLeft size={14} /></button>
              <span className="text-[12px] text-text-sub">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                className="p-2 rounded-lg border border-border bg-white text-text-sub hover:bg-bg-soft disabled:opacity-40 transition-colors"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
      <Footer />
    </main>
  );
}
