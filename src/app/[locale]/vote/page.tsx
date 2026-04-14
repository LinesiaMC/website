"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Trophy, ExternalLink, Activity, Check, Info } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type SiteId = "minecraftpocket" | "top-serveurs" | "serveur-prive";

interface Voter { username: string; votes: number; sites: SiteId[]; }
interface AccountSummary { linkedPlayerName: string | null }

const SITES: { id: SiteId; name: string; color: string; voteUrl: (u: string) => string }[] = [
  {
    id: "minecraftpocket",
    name: "MinecraftPocket-Servers",
    color: "bg-emerald-500",
    // The site shows a form with a "nickname" field; the query param is a best-effort prefill.
    voteUrl: u => `https://minecraftpocket-servers.com/server/114106/vote/${u ? `?username=${encodeURIComponent(u)}` : ""}`,
  },
  {
    id: "top-serveurs",
    name: "Top-Serveurs",
    color: "bg-sky-500",
    voteUrl: u => `https://top-serveurs.net/minecraft-bedrock/vote/linesia-be${u ? `?nickname=${encodeURIComponent(u)}` : ""}`,
  },
  {
    id: "serveur-prive",
    name: "Serveur-Privé",
    color: "bg-violet-500",
    voteUrl: u => `https://serveur-prive.net/minecraft-bedrock/linesia/vote${u ? `?username=${encodeURIComponent(u)}` : ""}`,
  },
];

export default function VotePage() {
  const { locale } = useParams<{ locale: string }>();
  const fr = locale === "fr";

  const [username, setUsername] = useState("");
  const [voters, setVoters] = useState<Voter[]>([]);
  const [enabled, setEnabled] = useState<Record<SiteId, boolean>>({ "minecraftpocket": true, "top-serveurs": false, "serveur-prive": false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account/me")
      .then(r => r.json())
      .then((j: { account: AccountSummary | null }) => { if (j.account?.linkedPlayerName) setUsername(j.account.linkedPlayerName); })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/vote/top");
      const j = await r.json() as { voters: Voter[]; sites: Record<SiteId, boolean> };
      setVoters(j.voters || []);
      setEnabled(j.sites);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const cleanName = username.trim();

  return (
    <main>
      <Navbar />
      <div className="min-h-screen bg-bg-soft pt-[110px] pb-16 px-4">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink/10 text-pink text-[12px] font-semibold mb-3">
              <Trophy size={13} />{fr ? "Vote" : "Vote"}
            </div>
            <h1 className="text-3xl font-bold text-text mb-2">
              {fr ? "Vote pour Linesia" : "Vote for Linesia"}
            </h1>
            <p className="text-[14px] text-text-sub">
              {fr
                ? "Vote sur chaque site et récupère tes récompenses en jeu avec /vote."
                : "Vote on every site and claim your in-game rewards with /vote."}
            </p>
          </div>

          <div className="mc-card p-5 mb-6">
            <label className="block text-[12px] font-semibold text-text-sub mb-2">
              {fr ? "Ton pseudo en jeu" : "Your in-game name"}
            </label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={fr ? "Pseudo Bedrock" : "Bedrock username"}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] focus:border-pink focus:outline-none mb-4"
            />

            <div className="grid md:grid-cols-3 gap-3">
              {SITES.map(s => {
                const on = enabled[s.id];
                return (
                  <a
                    key={s.id}
                    href={s.voteUrl(cleanName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-3 p-4 rounded-xl border-2 border-border bg-white hover:border-pink transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-text truncate">{s.name}</div>
                      <div className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${on ? "bg-green-500" : "bg-gray-300"}`} />
                        {on
                          ? (fr ? "Classement actif" : "Ranking active")
                          : (fr ? "Vote seul (sans classement)" : "Vote only (no ranking)")}
                      </div>
                    </div>
                    <ExternalLink size={15} className="text-text-muted group-hover:text-pink shrink-0" />
                  </a>
                );
              })}
            </div>

            <div className="mt-4 p-3 rounded-lg bg-bg-soft text-[12px] text-text-sub flex items-start gap-2">
              <Info size={13} className="mt-0.5 text-pink shrink-0" />
              <span>
                {fr
                  ? <>Après avoir voté, rejoins le serveur et tape <code className="px-1 py-0.5 rounded bg-white border border-border font-mono text-[11px]">/vote</code> pour récupérer tes clés communes et un Fly Paper 10min.</>
                  : <>After voting, join the server and type <code className="px-1 py-0.5 rounded bg-white border border-border font-mono text-[11px]">/vote</code> to claim your common keys and a 10-minute Fly Paper.</>}
              </span>
            </div>
          </div>

          <div className="mc-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-bg-soft">
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-pink" />
                <span className="text-[13px] font-semibold text-text">
                  {fr ? "Top voteurs du mois (cumulé)" : "Top voters this month (combined)"}
                </span>
              </div>
              <span className="text-[11px] text-text-muted">{voters.length}</span>
            </div>
            {loading ? (
              <div className="p-12 text-center"><Activity size={22} className="text-pink mx-auto animate-pulse" /></div>
            ) : voters.length === 0 ? (
              <div className="p-10 text-center text-text-muted text-[13px]">
                {fr ? "Aucun vote pour le moment ce mois-ci." : "No votes yet this month."}
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-white">
                    <th className="text-left px-4 py-2.5 font-semibold text-text-sub w-12">#</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-text-sub">{fr ? "Pseudo" : "Name"}</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-text-sub hidden sm:table-cell">{fr ? "Sites" : "Sites"}</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-pink">{fr ? "Votes" : "Votes"}</th>
                  </tr>
                </thead>
                <tbody>
                  {voters.map((v, i) => {
                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                    return (
                      <tr key={v.username + i} className="border-b border-border/50 hover:bg-bg-soft/50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-text-muted">
                          {medal ? <span className="text-[15px]">{medal}</span> : i + 1}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-text inline-flex items-center gap-1.5">
                          {v.username}
                          {cleanName && v.username.toLowerCase() === cleanName.toLowerCase() && (
                            <Check size={11} className="text-green-600" />
                          )}
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <div className="flex items-center gap-1">
                            {SITES.filter(s => v.sites.includes(s.id)).map(s => (
                              <span key={s.id} title={s.name} className={`inline-block w-2 h-2 rounded-full ${s.color}`} />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-pink">{v.votes.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
