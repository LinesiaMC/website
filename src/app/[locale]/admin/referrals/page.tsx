"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Search, Ticket, UserCircle2, Hash, Calendar, Users, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";

interface ReferralCodeData {
  code: string;
  ownerAccountId: string;
  ownerXuid: string | null;
  ownerName: string | null;
  createdAt: number;
  usesCount: number;
}

interface ReferralOwner {
  accountId: string;
  microsoftId: string | null;
  microsoftGamertag: string | null;
  microsoftDisplayName: string | null;
  discordId: string | null;
  discordUsername: string | null;
  linkedPlayerUuid: string | null;
  linkedPlayerName: string | null;
  accountCreatedAt: number | null;
  accountLastLogin: number | null;
}

interface ReferralUse {
  id: number;
  referredName: string | null;
  referredXuid: string;
  referredAccountId: string | null;
  usedAt: number;
  referrerDelivered: boolean;
  referredDelivered: boolean;
}

interface LookupResult {
  code: ReferralCodeData;
  owner: ReferralOwner | null;
  uses: ReferralUse[];
}

function formatDate(ts: number | null): string {
  if (!ts) return "-";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "-";
  }
}

export default function ReferralsAdminPage() {
  const { locale } = useParams<{ locale: string }>();
  const L = locale === "fr" ? "fr" : "en";
  const { can } = useAdmin();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!can("community.view")) {
    return <div className="p-8 text-center text-text-sub">{L === "fr" ? "Accès refusé" : "Access denied"}</div>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/staff/referral/lookup?code=${encodeURIComponent(normalized)}`, { cache: "no-store" });
      if (res.status === 404) {
        setError(L === "fr" ? "Code inconnu." : "Unknown code.");
      } else if (res.status === 400) {
        setError(L === "fr" ? "Code invalide." : "Invalid code.");
      } else if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || (L === "fr" ? "Erreur" : "Error"));
      } else {
        const j = (await res.json()) as LookupResult;
        setResult(j);
      }
    } catch {
      setError(L === "fr" ? "Erreur réseau." : "Network error.");
    }
    setLoading(false);
  };

  const owner = result?.owner ?? null;
  const code_ = result?.code ?? null;
  const displayName =
    owner?.linkedPlayerName ||
    owner?.microsoftGamertag ||
    owner?.microsoftDisplayName ||
    owner?.discordUsername ||
    code_?.ownerName ||
    "?";

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-pink flex items-center justify-center">
          <Ticket size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text">{L === "fr" ? "Codes de parrainage" : "Referral codes"}</h1>
          <p className="text-[12px] text-text-muted">
            {L === "fr" ? "Recherche à qui appartient un code." : "Look up who owns a referral code."}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mc-card p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={L === "fr" ? "Code (ex: ABC123)" : "Code (e.g. ABC123)"}
              maxLength={12}
              autoFocus
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-white text-[13px] font-mono tracking-wider uppercase text-text placeholder:text-text-muted placeholder:normal-case placeholder:tracking-normal focus:border-pink focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="btn-primary !py-2.5 !px-5 !text-[13px] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (L === "fr" ? "Recherche..." : "Searching...") : (L === "fr" ? "Rechercher" : "Search")}
          </button>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-red-500">
            <AlertCircle size={13} />
            <span>{error}</span>
          </div>
        )}
      </form>

      {result && code_ && (
        <div className="space-y-4">
          <div className="mc-card p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[11px] text-text-muted">{L === "fr" ? "Propriétaire" : "Owner"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <UserCircle2 size={18} className="text-pink" />
                  <span className="text-[18px] font-bold text-text">{displayName}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-text-muted">{L === "fr" ? "Code" : "Code"}</p>
                <p className="text-[18px] font-bold font-mono tracking-wider text-pink">{code_.code}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
              <div>
                <p className="text-text-muted text-[11px]">{L === "fr" ? "Utilisations" : "Uses"}</p>
                <p className="text-text font-semibold flex items-center gap-1">
                  <Users size={12} /> {code_.usesCount}
                </p>
              </div>
              <div>
                <p className="text-text-muted text-[11px]">{L === "fr" ? "Code créé le" : "Code created"}</p>
                <p className="text-text font-semibold flex items-center gap-1">
                  <Calendar size={12} /> {formatDate(code_.createdAt)}
                </p>
              </div>
              {owner?.accountCreatedAt && (
                <div>
                  <p className="text-text-muted text-[11px]">{L === "fr" ? "Compte créé le" : "Account created"}</p>
                  <p className="text-text font-semibold">{formatDate(owner.accountCreatedAt)}</p>
                </div>
              )}
              {owner?.accountLastLogin && (
                <div>
                  <p className="text-text-muted text-[11px]">{L === "fr" ? "Dernière connexion" : "Last login"}</p>
                  <p className="text-text font-semibold">{formatDate(owner.accountLastLogin)}</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              {owner ? (
                <>
                  <IdRow label="Account ID" value={owner.accountId} />
                  <IdRow label="XUID" value={owner.linkedPlayerUuid} />
                  <IdRow label="Microsoft" value={owner.microsoftGamertag || owner.microsoftDisplayName} sub={owner.microsoftId} />
                  <IdRow label="Discord" value={owner.discordUsername} sub={owner.discordId} />
                </>
              ) : (
                <div className="col-span-full flex items-center gap-2 text-text-muted">
                  <AlertCircle size={13} />
                  <span>
                    {L === "fr"
                      ? "Compte propriétaire introuvable (supprimé ?)."
                      : "Owner account not found (deleted?)."}
                  </span>
                </div>
              )}
            </div>

            {owner?.linkedPlayerUuid && (
              <div className="mt-4">
                <Link
                  href={`/${locale}/admin/analytics/players?xuid=${encodeURIComponent(owner.linkedPlayerUuid)}`}
                  className="inline-flex items-center gap-1 text-[12px] text-pink hover:underline"
                >
                  <Users size={12} />
                  {L === "fr" ? "Voir le joueur dans les analytics" : "View player in analytics"}
                </Link>
              </div>
            )}
          </div>

          {result.uses.length > 0 && (
            <div className="mc-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-bg-soft">
                <p className="text-[13px] font-bold text-text">
                  {L === "fr" ? "Utilisations" : "Uses"}{" "}
                  <span className="text-text-muted font-normal">({result.uses.length})</span>
                </p>
              </div>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border bg-bg-soft/50">
                    <th className="text-left px-4 py-2 font-semibold text-text-sub">{L === "fr" ? "Parrainé" : "Referred"}</th>
                    <th className="text-left px-4 py-2 font-semibold text-text-sub">XUID</th>
                    <th className="text-left px-4 py-2 font-semibold text-text-sub">{L === "fr" ? "Date" : "When"}</th>
                    <th className="text-center px-4 py-2 font-semibold text-text-sub">{L === "fr" ? "Récompense parrain" : "Referrer reward"}</th>
                    <th className="text-center px-4 py-2 font-semibold text-text-sub">{L === "fr" ? "Récompense filleul" : "Referred reward"}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.uses.map((u) => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-pink/5">
                      <td className="px-4 py-2 font-medium text-text">{u.referredName || "?"}</td>
                      <td className="px-4 py-2 text-text-muted font-mono text-[11px]">{u.referredXuid || "-"}</td>
                      <td className="px-4 py-2 text-text-sub whitespace-nowrap">{formatDate(u.usedAt)}</td>
                      <td className="px-4 py-2 text-center">
                        {u.referrerDelivered ? (
                          <CheckCircle2 size={14} className="text-green-500 inline" />
                        ) : (
                          <XCircle size={14} className="text-text-muted inline" />
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {u.referredDelivered ? (
                          <CheckCircle2 size={14} className="text-green-500 inline" />
                        ) : (
                          <XCircle size={14} className="text-text-muted inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IdRow({ label, value, sub }: { label: string; value: string | null; sub?: string | null }) {
  if (!value && !sub) return null;
  return (
    <div className="flex items-center gap-2">
      <Hash size={11} className="text-text-muted shrink-0" />
      <div className="min-w-0">
        <span className="text-text-muted">{label}: </span>
        <span className="text-text font-medium">{value || "-"}</span>
        {sub && <span className="ml-1 text-text-muted font-mono break-all">({sub})</span>}
      </div>
    </div>
  );
}
