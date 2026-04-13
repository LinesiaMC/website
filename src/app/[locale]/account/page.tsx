"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { User, LogIn, LogOut, Link as LinkIcon, Unlink, Check, Copy, Clock, Coins, Skull, Dice5, Users as UsersIcon, Activity } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Account {
  id: string;
  microsoftGamertag: string | null;
  microsoftDisplayName: string | null;
  linkedPlayerUuid: string | null;
  linkedPlayerName: string | null;
  linkCode: string | null;
  linkCodeExpires: number | null;
  displayName: string | null;
}
interface Stats {
  username: string;
  platform: string;
  totalPlaytime: number;
  sessionCount: number;
  money: number | null;
  casinoNet: number | null;
  deaths: number;
  lastSeen: number;
}

function authErrorLabel(code: string, locale: string): string {
  const fr = locale === "fr";
  const map: Record<string, { fr: string; en: string }> = {
    xbox_no_account: {
      fr: "Ce compte Microsoft n'a pas de profil Xbox Live. Crée-en un sur xbox.com puis réessaie.",
      en: "This Microsoft account has no Xbox Live profile. Create one at xbox.com and retry.",
    },
    xbox_account_creation_required: {
      fr: "Ce compte Microsoft n'a pas de profil Xbox Live. Crée-en un sur xbox.com puis réessaie.",
      en: "This Microsoft account has no Xbox Live profile. Create one at xbox.com and retry.",
    },
    xbox_child_account: {
      fr: "Compte enfant : il doit être ajouté à une Family Microsoft par un adulte avant de se connecter.",
      en: "Child account: an adult must add it to a Microsoft Family before signing in.",
    },
    xbox_country_banned: {
      fr: "Xbox Live n'est pas disponible dans le pays de ce compte Microsoft.",
      en: "Xbox Live is not available in this account's country.",
    },
    xbox_banned: {
      fr: "Ce compte Xbox Live est banni.",
      en: "This Xbox Live account is banned.",
    },
    xbox_adult_verification_required: {
      fr: "Vérification d'âge requise sur ton compte Microsoft.",
      en: "Age verification required on your Microsoft account.",
    },
    not_configured: {
      fr: "Connexion Microsoft non configurée côté serveur.",
      en: "Microsoft sign-in is not configured on the server.",
    },
    state_mismatch: {
      fr: "Session expirée, réessaie la connexion.",
      en: "Session expired, please retry.",
    },
    ms_token_exchange_failed: {
      fr: "Microsoft a rejeté la connexion. Vérifie le client ID / secret / redirect URI.",
      en: "Microsoft rejected the sign-in. Check client ID / secret / redirect URI.",
    },
    no_xuid: {
      fr: "Profil Xbox introuvable sur ce compte Microsoft.",
      en: "No Xbox profile found on this Microsoft account.",
    },
    xbox_auth_failed: {
      fr: "Échec de l'authentification Xbox Live. Réessaie dans quelques minutes.",
      en: "Xbox Live authentication failed. Please retry in a few minutes.",
    },
  };
  const entry = map[code];
  if (entry) return fr ? entry.fr : entry.en;
  return (fr ? "Erreur d'authentification : " : "Auth error: ") + code;
}

function fmtDur(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h >= 24) return `${Math.floor(h / 24)}j ${h % 24}h`;
  return `${h}h ${m}m`;
}

export default function AccountPage() {
  return (
    <main>
      <Navbar />
      <Suspense fallback={
        <div className="min-h-screen bg-bg-soft pt-[110px] px-4">
          <div className="max-w-[640px] mx-auto mc-card p-12 text-center">
            <Activity size={24} className="text-pink mx-auto animate-pulse" />
          </div>
        </div>
      }>
        <AccountPageInner />
      </Suspense>
      <Footer />
    </main>
  );
}

function AccountPageInner() {
  const { locale } = useParams<{ locale: string }>();
  const sp = useSearchParams();
  const authError = sp.get("auth_error");
  const [account, setAccount] = useState<Account | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pseudo, setPseudo] = useState("");
  const [linkResult, setLinkResult] = useState<{ code?: string; command?: string; autoLinked?: boolean; name?: string } | null>(null);
  const [linkError, setLinkError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/account/me").then(async (r) => {
      const j = await r.json();
      setAccount(j.account);
      setStats(j.stats);
      setLoading(false);
    });
  }, []);
  useEffect(() => { load(); }, [load]);

  const startLink = async () => {
    setLinkError(""); setLinkResult(null);
    const p = pseudo.trim();
    if (!p) { setLinkError(locale === "fr" ? "Entre ton pseudo" : "Enter your name"); return; }
    const r = await fetch("/api/account/link/start", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pseudo: p }),
    });
    const j = await r.json();
    if (!r.ok) { setLinkError(j.error || "error"); return; }
    setLinkResult(j);
    if (j.autoLinked) load();
  };

  const unlink = async () => {
    await fetch("/api/account/unlink", { method: "POST" });
    setLinkResult(null);
    load();
  };

  const logout = async () => {
    await fetch("/api/account/logout", { method: "POST" });
    load();
  };

  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-soft pt-[110px] px-4">
        <div className="max-w-[640px] mx-auto mc-card p-12 text-center">
          <Activity size={24} className="text-pink mx-auto animate-pulse" />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-bg-soft pt-[110px] px-4">
        <div className="max-w-[520px] mx-auto">
          <div className="mc-card p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-pink/10 flex items-center justify-center mx-auto mb-4">
              <User size={26} className="text-pink" />
            </div>
            <h1 className="text-2xl font-bold text-text mb-1">{locale === "fr" ? "Mon compte" : "My account"}</h1>
            <p className="text-[13px] text-text-sub mb-6">
              {locale === "fr"
                ? "Connecte-toi pour voir tes stats, ton solde et ouvrir des tickets de support."
                : "Log in to see your stats, balance and open support tickets."}
            </p>
            {authError && (
              <p className="text-red-500 text-[12px] mb-3">
                {authErrorLabel(authError, locale)}
              </p>
            )}
            <button
              onClick={() => { window.location.href = "/api/account/microsoft"; }}
              className="btn-primary !py-3 !px-5 !text-[13px] inline-flex">
              <LogIn size={14} />{locale === "fr" ? "Se connecter avec Microsoft" : "Sign in with Microsoft"}
            </button>
            <p className="text-[11px] text-text-muted mt-4">
              {locale === "fr"
                ? "Pas de compte Microsoft ? Connecte-toi puis lie ton pseudo en jeu avec /link."
                : "No Microsoft account? Sign in, then link your in-game name with /link."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const linked = !!account.linkedPlayerUuid;

  return (
    <div className="min-h-screen bg-bg-soft pt-[110px] pb-16 px-4">
      <div className="max-w-[720px] mx-auto space-y-5">
        {/* Header */}
        <div className="mc-card p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink to-pink/70 flex items-center justify-center text-white text-xl font-bold">
              {(account.displayName || account.microsoftGamertag || "?")[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-text">{account.displayName || account.microsoftGamertag || "Compte"}</h1>
              {account.microsoftGamertag && (
                <p className="text-[12px] text-text-muted">Microsoft · {account.microsoftGamertag}</p>
              )}
            </div>
            <button onClick={logout} className="text-[12px] text-text-sub hover:text-pink inline-flex items-center gap-1">
              <LogOut size={12} />{locale === "fr" ? "Déconnexion" : "Logout"}
            </button>
          </div>
        </div>

        {/* Link status */}
        <div className="mc-card p-5">
          <h2 className="text-[14px] font-bold text-text mb-3 flex items-center gap-2">
            <LinkIcon size={14} className="text-pink" />
            {locale === "fr" ? "Compte en jeu" : "In-game account"}
          </h2>

          {linked ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Check size={14} className="text-green-600" />
                <span className="text-[13px] text-text">
                  {locale === "fr" ? "Lié à" : "Linked to"} <strong>{account.linkedPlayerName}</strong>
                </span>
                <Link href={`/${locale}/leaderboard/${account.linkedPlayerUuid}`} className="ml-auto text-[12px] text-pink hover:underline">
                  {locale === "fr" ? "Voir profil public →" : "Public profile →"}
                </Link>
              </div>
              <button onClick={unlink} className="text-[12px] text-red-500 hover:underline inline-flex items-center gap-1">
                <Unlink size={12} />{locale === "fr" ? "Dissocier" : "Unlink"}
              </button>
            </>
          ) : (
            <>
              <p className="text-[12px] text-text-sub mb-3">
                {locale === "fr"
                  ? "Entre ton pseudo Minecraft exact. Si ton Gamertag Microsoft correspond, le lien sera automatique. Sinon, tu recevras une commande à taper en jeu."
                  : "Enter your exact Minecraft name. If your Microsoft Gamertag matches, it links automatically. Otherwise you'll get a command to run in-game."}
              </p>
              <div className="flex gap-2">
                <input value={pseudo} onChange={(e) => setPseudo(e.target.value)}
                  placeholder={locale === "fr" ? "Pseudo en jeu" : "In-game name"}
                  className="flex-1 px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none" />
                <button onClick={startLink} className="btn-primary !py-2 !px-4 !text-[13px]">
                  <LinkIcon size={13} />{locale === "fr" ? "Lier" : "Link"}
                </button>
              </div>
              {linkError && <p className="text-red-500 text-[12px] mt-2">{linkError}</p>}
              {linkResult?.autoLinked && (
                <p className="text-green-600 text-[12px] mt-2">
                  {locale === "fr" ? `Lié à ${linkResult.name} !` : `Linked to ${linkResult.name}!`}
                </p>
              )}
              {linkResult?.code && !linkResult.autoLinked && (
                <div className="mt-3 p-3 rounded-xl bg-pink/5 border border-pink/20">
                  <p className="text-[12px] text-text-sub mb-2">
                    {locale === "fr" ? "Tape cette commande en jeu pour confirmer :" : "Run this command in-game to confirm:"}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-white rounded-lg font-mono text-[13px] text-pink border border-border">
                      {linkResult.command}
                    </code>
                    <button onClick={() => copy(linkResult.command!)} className="p-2 rounded-lg border border-border hover:bg-bg-soft">
                      {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} className="text-text-sub" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-text-muted mt-2">
                    {locale === "fr" ? "Le code expire dans 15 minutes." : "Code expires in 15 minutes."}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Stats */}
        {linked && stats && (
          <div>
            <h2 className="text-[14px] font-bold text-text mb-3">{locale === "fr" ? "Mes stats en jeu" : "My in-game stats"}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MiniStat icon={Clock}      label={locale === "fr" ? "Temps de jeu" : "Playtime"} value={fmtDur(stats.totalPlaytime)} />
              <MiniStat icon={UsersIcon}  label="Sessions" value={stats.sessionCount.toLocaleString()} />
              <MiniStat icon={Coins}      label={locale === "fr" ? "Solde" : "Balance"} value={stats.money != null ? stats.money.toLocaleString() : "—"} />
              <MiniStat icon={Dice5}      label={locale === "fr" ? "Casino" : "Casino"} value={stats.casinoNet != null ? stats.casinoNet.toLocaleString() : "—"} />
              <MiniStat icon={Skull}      label={locale === "fr" ? "Morts" : "Deaths"} value={stats.deaths.toLocaleString()} />
            </div>
          </div>
        )}

        <div className="mc-card p-5">
          <h2 className="text-[14px] font-bold text-text mb-2">{locale === "fr" ? "Mes tickets" : "My tickets"}</h2>
          <p className="text-[12px] text-text-sub mb-3">
            {locale === "fr" ? "Ouvre un ticket pour contacter le staff." : "Open a ticket to contact staff."}
          </p>
          <Link href={`/${locale}/support`} className="btn-primary !py-2 !px-4 !text-[13px] inline-flex">
            {locale === "fr" ? "Ouvrir un ticket" : "Open a ticket"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }) {
  return (
    <div className="mc-card p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-1">
        <Icon size={12} className="text-pink" />{label}
      </div>
      <div className="text-lg font-bold text-text">{value}</div>
    </div>
  );
}
