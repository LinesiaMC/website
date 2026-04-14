"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Shield, Check, Trash2, Ban, ArrowLeft, Flag, UserX } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { timeAgo } from "@/components/community/utils";

interface Report {
  id: string;
  reporterAccountId: string;
  targetType: "thread" | "post";
  targetId: string;
  reason: string | null;
  createdAt: number;
  resolved: boolean;
}
interface Ban {
  accountId: string;
  reason: string | null;
  bannedBy: string;
  bannedAt: number;
  expiresAt: number | null;
}

const L = (fr: string, en: string, loc: string) => (loc === "fr" ? fr : en);

export default function ModerationPage() {
  const { locale } = useParams<{ locale: string }>();
  const loc = locale || "fr";

  const [reports, setReports] = useState<Report[] | null>(null);
  const [bans, setBans] = useState<Ban[] | null>(null);
  const [canModerate, setCanModerate] = useState(false);
  const [canBan, setCanBan] = useState(false);
  const [loading, setLoading] = useState(true);

  const [banAccount, setBanAccount] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banDays, setBanDays] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const meta = await fetch("/api/community/meta", { cache: "no-store" }).then((r) => r.json());
    setCanModerate(!!meta.staff?.moderate);
    setCanBan(!!meta.staff?.ban);
    if (meta.staff?.moderate) {
      const r = await fetch("/api/community/reports", { cache: "no-store" });
      if (r.ok) { const j = await r.json(); setReports(j.reports); }
    }
    if (meta.staff?.ban) {
      const r = await fetch("/api/community/bans", { cache: "no-store" });
      if (r.ok) { const j = await r.json(); setBans(j.bans); }
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const resolve = async (id: string) => {
    await fetch("/api/community/reports", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    refresh();
  };

  const deleteTarget = async (r: Report) => {
    if (!confirm(L("Supprimer la cible ?", "Delete the target?", loc))) return;
    const url = r.targetType === "thread"
      ? `/api/community/threads/${r.targetId}`
      : `/api/community/posts/${r.targetId}`;
    await fetch(url, { method: "DELETE" });
    await resolve(r.id);
  };

  const submitBan = async () => {
    if (!banAccount.trim()) return;
    await fetch("/api/community/bans", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: banAccount.trim(),
        reason: banReason.trim() || null,
        durationDays: banDays ? Number(banDays) : undefined,
      }),
    });
    setBanAccount(""); setBanReason(""); setBanDays("");
    refresh();
  };

  const unban = async (accountId: string) => {
    if (!confirm(L("Débannir ce compte ?", "Unban this account?", loc))) return;
    await fetch(`/api/community/bans?accountId=${encodeURIComponent(accountId)}`, { method: "DELETE" });
    refresh();
  };

  if (loading) {
    return (<main><Navbar /><div className="min-h-screen bg-bg-soft pt-[110px] pb-16 px-4 text-center"><p className="text-text-muted text-[13px]">{L("Chargement…", "Loading…", loc)}</p></div><Footer /></main>);
  }

  if (!canModerate && !canBan) {
    return (
      <main><Navbar />
        <div className="min-h-screen bg-bg-soft pt-[110px] pb-16 px-4 text-center">
          <p className="text-[13px] text-text-muted">{L("Accès refusé.", "Access denied.", loc)}</p>
          <Link href={`/${loc}/community` as never} className="mt-4 inline-block text-pink font-semibold text-[13px]">
            ← {L("Retour", "Back", loc)}
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main>
      <Navbar />
      <div className="min-h-screen bg-bg-soft pt-[110px] pb-16 px-4">
        <div className="max-w-[960px] mx-auto">
          <Link href={`/${loc}/community` as never} className="inline-flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text mb-4">
            <ArrowLeft size={13} />{L("Communauté", "Community", loc)}
          </Link>

          <div className="flex items-center gap-2 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-pink/10 flex items-center justify-center">
              <Shield size={22} className="text-pink" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text leading-none">
                {L("Modération communauté", "Community moderation", loc)}
              </h1>
              <p className="text-[12px] text-text-sub mt-1">
                {L("Signalements, bannissements, actions rapides.", "Reports, bans, quick actions.", loc)}
              </p>
            </div>
          </div>

          {canModerate && (
            <section className="mc-card p-5 mb-5">
              <h2 className="text-[13px] font-bold text-text mb-3 inline-flex items-center gap-1.5">
                <Flag size={14} className="text-orange-600" />
                {L("Signalements ouverts", "Open reports", loc)}
                <span className="text-text-muted font-normal">({reports?.length || 0})</span>
              </h2>
              {!reports || reports.length === 0 ? (
                <p className="text-[12px] text-text-muted text-center py-4">
                  {L("Aucun signalement ouvert.", "No open reports.", loc)}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {reports.map((r) => (
                    <li key={r.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-text">
                          <span className="font-semibold">{r.targetType}</span>
                          <span className="mx-1.5 text-text-muted">·</span>
                          <Link
                            href={(r.targetType === "thread"
                              ? `/${loc}/community/${r.targetId}`
                              : `/${loc}/community`) as never}
                            className="text-pink font-mono text-[11px] underline"
                          >
                            {r.targetId}
                          </Link>
                        </p>
                        {r.reason && <p className="text-[12px] text-text-sub mt-0.5">{r.reason}</p>}
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {L("Par", "By", loc)} <span className="font-mono">{r.reporterAccountId}</span>
                          {" · "}{timeAgo(r.createdAt, loc)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => deleteTarget(r)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                          title={L("Supprimer la cible", "Delete target", loc)}
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={() => resolve(r.id)}
                          className="p-2 rounded-lg text-green-600 hover:bg-green-50"
                          title={L("Résoudre", "Resolve", loc)}
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {canBan && (
            <section className="mc-card p-5">
              <h2 className="text-[13px] font-bold text-text mb-3 inline-flex items-center gap-1.5">
                <Ban size={14} className="text-red-600" />
                {L("Bannissements", "Bans", loc)}
                <span className="text-text-muted font-normal">({bans?.length || 0})</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_100px_auto] gap-2 items-end mb-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    {L("ID compte", "Account ID", loc)}
                  </label>
                  <input
                    value={banAccount}
                    onChange={(e) => setBanAccount(e.target.value)}
                    className="w-full bg-white border border-border rounded-[10px] py-2 px-3 text-[12px] font-mono focus:outline-none focus:border-pink"
                    placeholder="acct_id"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    {L("Raison", "Reason", loc)}
                  </label>
                  <input
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="w-full bg-white border border-border rounded-[10px] py-2 px-3 text-[12px] focus:outline-none focus:border-pink"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    {L("Durée (j)", "Days", loc)}
                  </label>
                  <input
                    type="number" min={0}
                    value={banDays}
                    onChange={(e) => setBanDays(e.target.value)}
                    placeholder="∞"
                    className="w-full bg-white border border-border rounded-[10px] py-2 px-3 text-[12px] focus:outline-none focus:border-pink"
                  />
                </div>
                <button onClick={submitBan} className="btn-primary !text-[12px] !py-2 !px-3 !rounded-[10px] inline-flex items-center gap-1.5">
                  <UserX size={13} />{L("Bannir", "Ban", loc)}
                </button>
              </div>

              {!bans || bans.length === 0 ? (
                <p className="text-[12px] text-text-muted text-center py-3">
                  {L("Aucun bannissement actif.", "No active bans.", loc)}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {bans.map((b) => (
                    <li key={b.accountId} className="py-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-mono text-text">{b.accountId}</p>
                        {b.reason && <p className="text-[12px] text-text-sub mt-0.5">{b.reason}</p>}
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {timeAgo(b.bannedAt, loc)}
                          {b.expiresAt
                            ? ` · ${L("expire", "expires", loc)} ${new Date(b.expiresAt).toLocaleDateString()}`
                            : ` · ${L("permanent", "permanent", loc)}`}
                        </p>
                      </div>
                      <button onClick={() => unban(b.accountId)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-text-sub border border-border hover:border-pink hover:text-pink">
                        {L("Débannir", "Unban", loc)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
