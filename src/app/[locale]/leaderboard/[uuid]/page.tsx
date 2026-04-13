"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Users, Coins, Skull, Dice5, Activity, Sword, Crown, Sparkles, Briefcase, Link as LinkIcon, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface JobInfo { name: string; level: number; xp: number }
interface CosmeticInfo { fullId: string; type: string; identifier: string; name: string | null; active: boolean }
interface ProfileExtra {
  rank: string | null;
  prestige: number;
  kills: number;
  killstreak: number;
  joinCount: number;
  firstJoin: string | null;
  lastLeave: string | null;
  jobs: JobInfo[];
}
interface Stats {
  uuid: string;
  xuid: string | null;
  username: string;
  platform: string;
  firstSeen: number;
  lastSeen: number;
  totalPlaytime: number;
  sessionCount: number;
  money: number | null;
  casinoNet: number | null;
  deaths: number;
  extra: ProfileExtra | null;
  cosmetics: CosmeticInfo[];
}

function fmtDur(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h >= 24) return `${Math.floor(h / 24)}j ${h % 24}h`;
  return `${h}h ${m}m`;
}
function fmtDate(ts: number, locale: string): string {
  return new Date(ts).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { day: "2-digit", month: "short", year: "numeric" });
}

const COSMETIC_TYPE_LABEL: Record<string, string> = {
  cape: "Cape",
  hat: "Chapeau",
  wing: "Aile",
  tag: "Tag",
};

interface LinkInfo { microsoftGamertag: string | null; microsoftDisplayName: string | null; linkedSince: number | null }

export default function PlayerProfilePage() {
  const { locale, uuid } = useParams<{ locale: string; uuid: string }>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [link, setLink] = useState<LinkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/leaderboard/${uuid}`).then(async (r) => {
      if (r.status === 404) { setNotFound(true); setLoading(false); return; }
      const j = await r.json();
      setStats(j.stats);
      setLink(j.link || null);
      setLoading(false);
    });
  }, [uuid]);

  const cosmeticsByType = stats?.cosmetics.reduce<Record<string, CosmeticInfo[]>>((acc, c) => {
    (acc[c.type] ||= []).push(c);
    return acc;
  }, {}) ?? {};

  return (
    <main>
      <Navbar />
    <div className="min-h-screen bg-bg-soft pt-[110px] pb-16 px-4">
      <div className="max-w-[820px] mx-auto">
        <Link href={`/${locale}/leaderboard`} className="inline-flex items-center gap-1.5 text-[13px] text-text-sub hover:text-pink mb-4">
          <ArrowLeft size={14} />{locale === "fr" ? "Retour au classement" : "Back to leaderboard"}
        </Link>

        {loading ? (
          <div className="mc-card p-12 text-center"><Activity size={24} className="text-pink mx-auto animate-pulse" /></div>
        ) : notFound || !stats ? (
          <div className="mc-card p-12 text-center text-text-muted text-[13px]">
            {locale === "fr" ? "Joueur introuvable" : "Player not found"}
          </div>
        ) : (
          <>
            <div className="mc-card p-6 mb-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink to-pink/70 flex items-center justify-center text-white text-2xl font-bold">
                  {stats.username[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-text">{stats.username}</h1>
                  <p className="text-[12px] text-text-muted">
                    {stats.platform} · {locale === "fr" ? "Depuis le" : "Since"} {fmtDate(stats.firstSeen, locale)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {stats.extra?.rank && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-pink bg-pink/10 px-2 py-1 rounded">
                        <Crown size={12} />{stats.extra.rank}
                        {stats.extra.prestige > 0 && <span className="ml-1 text-text-sub">· P{stats.extra.prestige}</span>}
                      </div>
                    )}
                    {link ? (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">
                        <Check size={12} />
                        {locale === "fr" ? "Compte lié" : "Account linked"}
                        {link.microsoftGamertag && <span className="font-normal text-text-sub">· {link.microsoftGamertag}</span>}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text-muted bg-bg-soft border border-border px-2 py-1 rounded">
                        <LinkIcon size={11} />
                        {locale === "fr" ? "Non lié" : "Not linked"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
              <Stat icon={Clock}    label={locale === "fr" ? "Temps de jeu" : "Playtime"} value={fmtDur(stats.totalPlaytime)} />
              <Stat icon={Users}    label="Sessions"                                       value={stats.sessionCount.toLocaleString()} />
              <Stat icon={Clock}    label={locale === "fr" ? "Dernière vue" : "Last seen"} value={fmtDate(stats.lastSeen, locale)} />
              <Stat icon={Coins}    label={locale === "fr" ? "Solde" : "Balance"}          value={stats.money != null ? stats.money.toLocaleString() : "—"} />
              <Stat icon={Dice5}    label={locale === "fr" ? "Casino (net)" : "Casino net"} value={stats.casinoNet != null ? stats.casinoNet.toLocaleString() : "—"} />
              <Stat icon={Skull}    label={locale === "fr" ? "Morts" : "Deaths"}           value={stats.deaths.toLocaleString()} />
              {stats.extra && <>
                <Stat icon={Sword}  label={locale === "fr" ? "Kills" : "Kills"}            value={stats.extra.kills.toLocaleString()} />
                <Stat icon={Sword}  label="Killstreak"                                     value={stats.extra.killstreak.toLocaleString()} />
                <Stat icon={Users}  label={locale === "fr" ? "Connexions" : "Joins"}       value={stats.extra.joinCount.toLocaleString()} />
              </>}
            </div>

            {stats.extra && stats.extra.jobs.length > 0 && (
              <div className="mc-card p-5 mb-5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-3">
                  <Briefcase size={12} className="text-pink" />{locale === "fr" ? "Métiers" : "Jobs"}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {stats.extra.jobs.map((j) => (
                    <div key={j.name} className="bg-bg-soft rounded-lg p-3 flex items-center justify-between">
                      <span className="text-[13px] font-medium text-text capitalize">{j.name}</span>
                      <span className="text-[12px] text-text-sub">Lv. {j.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mc-card p-5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-3">
                <Sparkles size={12} className="text-pink" />{locale === "fr" ? "Cosmétiques" : "Cosmetics"}
                <span className="ml-auto text-text-muted normal-case tracking-normal">{stats.cosmetics.length}</span>
              </div>
              {stats.cosmetics.length === 0 ? (
                <p className="text-[12px] text-text-muted">{locale === "fr" ? "Aucun cosmétique." : "No cosmetics."}</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(cosmeticsByType).map(([type, items]) => (
                    <div key={type}>
                      <div className="text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-2">
                        {COSMETIC_TYPE_LABEL[type] ?? type} <span className="text-text-muted">({items.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {items.map((c) => (
                          <span
                            key={c.fullId}
                            className={`text-[12px] px-2.5 py-1 rounded-full border ${
                              c.active
                                ? "bg-pink/10 border-pink/30 text-pink font-semibold"
                                : "bg-white border-gray-200 text-text-sub"
                            }`}
                            title={c.fullId}
                          >
                            {c.name || c.identifier}
                            {c.active && <span className="ml-1">●</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
      <Footer />
    </main>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }) {
  return (
    <div className="mc-card p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-1">
        <Icon size={12} className="text-pink" />{label}
      </div>
      <div className="text-xl font-bold text-text">{value}</div>
    </div>
  );
}
