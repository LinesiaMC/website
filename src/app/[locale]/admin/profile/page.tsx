"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { UserCircle2, Link as LinkIcon, Unlink, CheckCircle2, AlertCircle, Gamepad2 } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/roles";

interface FullStaff {
  id: string;
  discordId: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
  microsoftId: string | null;
  microsoftGamertag: string | null;
  microsoftDisplayName: string | null;
  displayName: string | null;
  role: string;
  createdAt: number;
  lastLogin: number | null;
}

export default function ProfilePage() {
  const { locale } = useParams<{ locale: string }>();
  const search = useSearchParams();
  const { staff: me } = useAdmin();
  const [data, setData] = useState<FullStaff | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const authError = search.get("auth_error");

  const load = useCallback(async () => {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const j = await res.json();
    setData(j.staff);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (authError) {
      setMsg({ type: "err", text:
        authError === "already_linked" ? (locale === "fr" ? "Ce compte est déjà lié à un autre staff." : "Already linked to another account.")
        : authError === "xbox_auth_failed" ? (locale === "fr" ? "Échec de l'authentification Xbox. Assure-toi d'avoir un compte Xbox/Minecraft actif." : "Xbox auth failed.")
        : (locale === "fr" ? "Erreur de liaison." : "Link error.")
      });
    }
  }, [authError, locale]);

  const unlink = async (provider: "discord" | "microsoft") => {
    if (!confirm(locale === "fr" ? `Délier le compte ${provider} ?` : `Unlink ${provider}?`)) return;
    setBusy(true);
    const res = await fetch("/api/auth/unlink", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    if (res.ok) {
      setMsg({ type: "ok", text: locale === "fr" ? "Compte délié." : "Unlinked." });
      load();
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg({ type: "err", text: j.error || "Erreur" });
    }
    setBusy(false);
  };

  if (!data) return <div className="p-10 text-center text-text-muted">{locale === "fr" ? "Chargement..." : "Loading..."}</div>;

  const roleColor = ROLE_COLORS[me.role];
  const discordAvatar = data.discordAvatar && data.discordId
    ? `https://cdn.discordapp.com/avatars/${data.discordId}/${data.discordAvatar}.png?size=128`
    : null;

  return (
    <div className="max-w-[800px] mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-pink flex items-center justify-center">
          <UserCircle2 size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text">{locale === "fr" ? "Mon compte" : "My account"}</h1>
          <p className="text-[12px] text-text-muted">{locale === "fr" ? "Gère tes comptes liés" : "Manage your linked accounts"}</p>
        </div>
      </div>

      {msg && (
        <div className={`mc-card p-3 mb-4 flex items-center gap-2 ${msg.type === "ok" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          {msg.type === "ok" ? <CheckCircle2 size={15} className="text-green-600" /> : <AlertCircle size={15} className="text-red-500" />}
          <span className={`text-[12px] ${msg.type === "ok" ? "text-green-700" : "text-red-600"}`}>{msg.text}</span>
        </div>
      )}

      <div className="mc-card p-5 mb-6">
        <div className="flex items-center gap-4">
          {discordAvatar ? (
            <Image src={discordAvatar} alt="" width={56} height={56} className="rounded-full" unoptimized />
          ) : (
            <div className="w-14 h-14 rounded-full bg-bg-soft flex items-center justify-center text-lg font-bold text-text-sub">
              {(data.displayName || data.discordUsername || data.microsoftGamertag || "?")[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-bold text-text">{data.displayName || data.discordUsername || data.microsoftGamertag}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${roleColor.bg} ${roleColor.text}`}>
                {ROLE_LABELS[me.role][locale as "fr" | "en"] || ROLE_LABELS[me.role].fr}
              </span>
              <span className="text-[11px] text-text-muted">
                {locale === "fr" ? "Membre depuis" : "Member since"} {new Date(data.createdAt).toLocaleDateString("fr-FR")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-[13px] font-bold text-text-sub uppercase tracking-wider mb-3">{locale === "fr" ? "Comptes liés" : "Linked accounts"}</h3>

      <ProviderCard
        provider="discord"
        locale={locale}
        linked={!!data.discordId}
        title="Discord"
        subtitle={data.discordUsername ? `@${data.discordUsername}` : null}
        detail={data.discordId}
        color="#5865F2"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.74 19.74 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.3 12.3 0 01-1.873.892.077.077 0 00-.04.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.84 19.84 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
        }
        canUnlink={!!data.microsoftId}
        onUnlink={() => unlink("discord")}
        busy={busy}
      />

      <ProviderCard
        provider="microsoft"
        locale={locale}
        linked={!!data.microsoftId}
        title={locale === "fr" ? "Microsoft / Xbox" : "Microsoft / Xbox"}
        subtitle={data.microsoftGamertag}
        detail={data.microsoftId ? `XUID: ${data.microsoftId}` : null}
        extra={data.microsoftGamertag && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-text-sub bg-bg-soft px-2 py-1 rounded">
            <Gamepad2 size={11} />
            {locale === "fr" ? "Pseudo Minecraft Bedrock :" : "Minecraft Bedrock name:"} <strong className="text-text">{data.microsoftGamertag}</strong>
          </div>
        )}
        color="#00A4EF"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24">
            <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
            <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
            <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
            <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
          </svg>
        }
        canUnlink={!!data.discordId}
        onUnlink={() => unlink("microsoft")}
        busy={busy}
      />

      <div className="mt-6 mc-card p-4 bg-bg-soft/50">
        <p className="text-[12px] text-text-sub">
          <strong className="text-text">{locale === "fr" ? "Astuce :" : "Tip:"}</strong>{" "}
          {locale === "fr"
            ? "Lie les deux comptes pour te connecter via l'un ou l'autre. Tu dois conserver au moins un compte lié."
            : "Link both accounts to log in with either one. You must keep at least one linked."}
        </p>
      </div>
    </div>
  );
}

function ProviderCard({
  provider, locale, linked, title, subtitle, detail, color, icon, canUnlink, onUnlink, busy, extra,
}: {
  provider: "discord" | "microsoft"; locale: string;
  linked: boolean; title: string; subtitle: string | null; detail: string | null;
  color: string; icon: React.ReactNode;
  canUnlink: boolean; onUnlink: () => void; busy: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="mc-card p-5 mb-3">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-[14px] font-bold text-text">{title}</h4>
            {linked ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-50 text-green-700">{locale === "fr" ? "LIÉ" : "LINKED"}</span>
            ) : (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-bg-soft text-text-muted">{locale === "fr" ? "NON LIÉ" : "NOT LINKED"}</span>
            )}
          </div>
          {linked ? (
            <>
              {subtitle && <p className="text-[13px] text-text">{subtitle}</p>}
              {detail && <p className="text-[11px] text-text-muted font-mono mt-0.5">{detail}</p>}
              {extra}
            </>
          ) : (
            <p className="text-[12px] text-text-sub">
              {locale === "fr" ? "Aucun compte lié pour ce fournisseur." : "No account linked."}
            </p>
          )}
        </div>
        <div className="shrink-0">
          {linked ? (
            <button onClick={onUnlink} disabled={!canUnlink || busy}
              className="btn-ghost !py-1.5 !px-3 !text-[12px] hover:!text-red-500 disabled:opacity-30"
              title={!canUnlink ? (locale === "fr" ? "Impossible : dernier compte lié" : "Cannot unlink last provider") : ""}>
              <Unlink size={12} />
              {locale === "fr" ? "Délier" : "Unlink"}
            </button>
          ) : (
            <a href={`/api/auth/${provider}?mode=link&return=/${locale}/admin/profile`}
              className="btn-primary !py-1.5 !px-3 !text-[12px]" style={{ backgroundColor: color }}>
              <LinkIcon size={12} />
              {locale === "fr" ? "Lier" : "Link"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
