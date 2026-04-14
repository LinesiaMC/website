"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Gift, Users, Activity, Check, Copy, Sparkles, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface TopReferrer { name: string; xuid: string | null; code: string; count: number }
interface AccountSummary { linkedPlayerName: string | null; linkedPlayerUuid: string | null }

export default function ParrainagePage() {
  return (
    <main>
      <Navbar />
      <Suspense fallback={
        <div className="min-h-screen bg-bg-soft pt-[110px] px-4">
          <div className="max-w-[1100px] mx-auto mc-card p-12 text-center">
            <Activity size={22} className="text-pink mx-auto animate-pulse" />
          </div>
        </div>
      }>
        <ParrainagePageInner />
      </Suspense>
      <Footer />
    </main>
  );
}

function ParrainagePageInner() {
  const { locale } = useParams<{ locale: string }>();
  const fr = locale === "fr";
  const sp = useSearchParams();
  const sharedCode = (sp.get("code") || "").toUpperCase();

  const [top, setTop] = useState<TopReferrer[]>([]);
  const [loading, setLoading] = useState(true);
  const [myCode, setMyCode] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/referral/top");
      const j = await r.json() as { top: TopReferrer[] };
      setTop(j.top || []);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/account/me")
      .then(r => r.json())
      .then((j: { account: AccountSummary | null }) => { setAccount(j.account); })
      .catch(() => {});
    fetch("/api/account/referral/me")
      .then(r => r.ok ? r.json() : null)
      .then((j: { code?: string } | null) => { if (j?.code) setMyCode(j.code); })
      .catch(() => {});
  }, []);

  const copy = async (s: string) => {
    try { await navigator.clipboard.writeText(s); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-bg-soft pt-[110px] pb-16 px-4">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink/10 text-pink text-[12px] font-semibold mb-3">
            <Gift size={13} />{fr ? "Parrainage" : "Referral"}
          </div>
          <h1 className="text-3xl font-bold text-text mb-2">
            {fr ? "Invite tes amis sur Linesia" : "Invite your friends to Linesia"}
          </h1>
          <p className="text-[14px] text-text-sub max-w-[640px] mx-auto">
            {fr
              ? "Partage ton code de parrainage. Pour chaque ami qui rejoint le serveur dans les 24h suivant sa première connexion, tu gagnes des récompenses — et lui aussi."
              : "Share your referral code. For each friend who joins the server within 24h of their first connection, you earn rewards — and so do they."}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="mc-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-pink/10 flex items-center justify-center">
                <Sparkles size={14} className="text-pink" />
              </div>
              <h2 className="text-[14px] font-bold text-text">
                {fr ? "Pour le parrain" : "For the referrer"}
              </h2>
            </div>
            <ul className="text-[13px] text-text-sub space-y-1.5">
              <li className="flex items-center gap-2"><Check size={13} className="text-green-600" /> 10 Pocket Box</li>
              <li className="flex items-center gap-2"><Check size={13} className="text-green-600" /> 250 000 $</li>
              <li className="flex items-center gap-2 text-text-muted text-[12px]">
                {fr ? "Cumulable, aucune limite de parrainages." : "Stackable, no referral limit."}
              </li>
            </ul>
          </div>
          <div className="mc-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-pink/10 flex items-center justify-center">
                <Gift size={14} className="text-pink" />
              </div>
              <h2 className="text-[14px] font-bold text-text">
                {fr ? "Pour le filleul" : "For the referred"}
              </h2>
            </div>
            <ul className="text-[13px] text-text-sub space-y-1.5">
              <li className="flex items-center gap-2"><Check size={13} className="text-green-600" /> {fr ? "Armure complète en rubis" : "Full rubis armor set"}</li>
              <li className="flex items-center gap-2"><Check size={13} className="text-green-600" /> 250 000 $</li>
              <li className="flex items-center gap-2"><Check size={13} className="text-green-600" /> 3 Pocket Box</li>
              <li className="flex items-center gap-2 text-text-muted text-[12px]">
                {fr ? "À réclamer dans les 24h avec /parrainage." : "Claim within 24h using /parrainage."}
              </li>
            </ul>
          </div>
        </div>

        <div className="mc-card p-5 mb-6">
          <h2 className="text-[14px] font-bold text-text mb-3">
            {fr ? "Comment ça marche" : "How it works"}
          </h2>
          <ol className="text-[13px] text-text-sub space-y-2 list-decimal pl-5">
            <li>
              {fr
                ? <>Lie ton compte sur <Link href={`/${locale}/account`} className="text-pink hover:underline">linesia.net/account</Link> pour obtenir ton code de parrainage.</>
                : <>Link your account on <Link href={`/${locale}/account`} className="text-pink hover:underline">linesia.net/account</Link> to get your referral code.</>}
            </li>
            <li>{fr ? "Partage ton code ou ton lien avec tes amis, sur Discord, YouTube, etc." : "Share your code or link with friends, on Discord, YouTube, etc."}</li>
            <li>{fr ? "Dès qu'un ami rejoint le serveur, il a 24h pour taper /parrainage et entrer ton code." : "Once a friend joins the server, they have 24h to type /parrainage and enter your code."}</li>
            <li>{fr ? "Vous recevez tous les deux vos récompenses immédiatement." : "You both receive your rewards immediately."}</li>
          </ol>
        </div>

        {account ? (
          myCode ? (
            <div className="mc-card p-5 mb-6 border-2 border-pink/20">
              <p className="text-[11px] font-semibold text-pink uppercase tracking-wider mb-2">
                {fr ? "Ton code de parrainage" : "Your referral code"}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-3 bg-white rounded-xl font-mono text-[22px] font-bold text-pink border-2 border-pink/20 text-center">
                  {myCode}
                </code>
                <button onClick={() => copy(myCode)} className="px-4 py-3 rounded-xl border-2 border-border hover:bg-bg-soft">
                  {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-text-sub" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="mc-card p-5 mb-6">
              <p className="text-[13px] text-text-sub mb-3">
                {fr ? "Lie ton pseudo en jeu pour recevoir ton code de parrainage." : "Link your in-game name to get your referral code."}
              </p>
              <Link href={`/${locale}/account`} className="btn-primary !py-2 !px-4 !text-[13px] inline-flex">
                {fr ? "Aller sur mon compte" : "Go to my account"} <ArrowRight size={13} />
              </Link>
            </div>
          )
        ) : (
          <div className="mc-card p-5 mb-6">
            <p className="text-[13px] text-text-sub mb-3">
              {fr
                ? "Connecte-toi pour obtenir ton propre code de parrainage à partager."
                : "Log in to get your own referral code to share."}
            </p>
            <Link href={`/${locale}/account`} className="btn-primary !py-2 !px-4 !text-[13px] inline-flex">
              {fr ? "Se connecter" : "Log in"} <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {sharedCode && (
          <div className="mc-card p-5 mb-6 bg-pink/5 border-2 border-pink/20">
            <p className="text-[13px] text-text">
              {fr ? <>Tu as été invité avec le code <strong className="text-pink font-mono">{sharedCode}</strong>.</> : <>You were invited with code <strong className="text-pink font-mono">{sharedCode}</strong>.</>}
            </p>
            <p className="text-[12px] text-text-sub mt-2">
              {fr
                ? <>Rejoins le serveur puis tape <code className="px-1 py-0.5 rounded bg-white border border-border font-mono text-[11px]">/parrainage</code> et entre ce code pour recevoir ton kit de bienvenue.</>
                : <>Join the server then type <code className="px-1 py-0.5 rounded bg-white border border-border font-mono text-[11px]">/parrainage</code> and enter this code to get your welcome kit.</>}
            </p>
          </div>
        )}

        <div className="mc-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-bg-soft">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-pink" />
              <span className="text-[13px] font-semibold text-text">
                {fr ? "Top parrains" : "Top referrers"}
              </span>
            </div>
            <span className="text-[11px] text-text-muted">{top.length}</span>
          </div>
          {loading ? (
            <div className="p-12 text-center"><Activity size={22} className="text-pink mx-auto animate-pulse" /></div>
          ) : top.length === 0 ? (
            <div className="p-10 text-center text-text-muted text-[13px]">
              {fr ? "Aucun parrainage pour le moment. Sois le premier !" : "No referrals yet. Be the first!"}
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-white">
                  <th className="text-left px-4 py-2.5 font-semibold text-text-sub w-12">#</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-text-sub">{fr ? "Parrain" : "Referrer"}</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-pink">{fr ? "Filleuls" : "Referred"}</th>
                </tr>
              </thead>
              <tbody>
                {top.map((t, i) => {
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                  const isMe = account?.linkedPlayerName && t.name.toLowerCase() === account.linkedPlayerName.toLowerCase();
                  return (
                    <tr key={t.code + i} className="border-b border-border/50 hover:bg-bg-soft/50">
                      <td className="px-4 py-2.5 font-mono text-text-muted">
                        {medal ? <span className="text-[15px]">{medal}</span> : i + 1}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-text inline-flex items-center gap-1.5">
                        {t.xuid ? (
                          <Link href={`/${locale}/profile/${t.xuid}`} className="hover:text-pink">{t.name}</Link>
                        ) : t.name}
                        {isMe && <Check size={11} className="text-green-600" />}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-pink">{t.count.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
