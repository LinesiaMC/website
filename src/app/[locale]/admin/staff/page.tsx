"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Plus, Trash2, UserCog, X, Save, ShieldCheck, Gamepad2 } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { ROLE_LABELS, ROLE_COLORS, ROLES, StaffRole } from "@/lib/roles";

interface StaffUser {
  id: string;
  discordId: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
  microsoftId: string | null;
  microsoftGamertag: string | null;
  microsoftDisplayName: string | null;
  displayName: string | null;
  role: StaffRole;
  createdAt: number;
  lastLogin: number | null;
}

interface FormData {
  discordId: string;
  discordUsername: string;
  microsoftId: string;
  microsoftGamertag: string;
  displayName: string;
  role: StaffRole;
}

export default function StaffManagementPage() {
  const { locale } = useParams<{ locale: string }>();
  const { staff: me, can } = useAdmin();
  const [list, setList] = useState<StaffUser[]>([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/staff", { cache: "no-store" });
    if (res.ok) setList(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: FormData) => {
    setError("");
    const payload: Record<string, string | StaffRole | undefined> = { role: data.role, displayName: data.displayName || undefined };
    if (data.discordId) { payload.discordId = data.discordId; payload.discordUsername = data.discordUsername || data.discordId; }
    if (data.microsoftId) { payload.microsoftId = data.microsoftId; payload.microsoftGamertag = data.microsoftGamertag || undefined; }
    const res = await fetch("/api/staff", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Erreur");
      return;
    }
    setCreating(false);
    load();
  };

  const handleChangeRole = async (id: string, role: StaffRole) => {
    await fetch("/api/staff", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, role }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(locale === "fr" ? "Retirer ce membre du staff ?" : "Remove this staff member?")) return;
    await fetch(`/api/staff?id=${id}`, { method: "DELETE" });
    load();
  };

  if (!can("staff.manage")) {
    return <div className="p-8 text-center text-text-sub">{locale === "fr" ? "Accès refusé" : "Access denied"}</div>;
  }

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink flex items-center justify-center">
            <UserCog size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text">{locale === "fr" ? "Gestion du Staff" : "Staff Management"}</h1>
            <p className="text-[12px] text-text-muted">{list.length} membre{list.length > 1 ? "s" : ""}</p>
          </div>
        </div>
        <button onClick={() => { setCreating(true); setError(""); }} className="btn-primary !py-2 !px-4 !text-[13px]">
          <Plus size={15} />
          {locale === "fr" ? "Ajouter un membre" : "Add member"}
        </button>
      </div>

      {creating && (
        <div className="mc-card p-6 mb-6">
          <StaffForm onCancel={() => setCreating(false)} onSave={handleCreate} error={error} canAssignFounder={me.role === "founder"} locale={locale} />
        </div>
      )}

      <div className="mc-card">
        {loading ? (
          <div className="p-10 text-center text-text-muted">{locale === "fr" ? "Chargement..." : "Loading..."}</div>
        ) : list.length === 0 ? (
          <div className="p-10 text-center text-text-muted">
            <ShieldCheck size={28} className="mx-auto mb-2 opacity-40" />
            {locale === "fr" ? "Aucun staff enregistré" : "No staff yet"}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {list.map((u) => {
              const color = ROLE_COLORS[u.role];
              const avatar = u.discordAvatar && u.discordId
                ? `https://cdn.discordapp.com/avatars/${u.discordId}/${u.discordAvatar}.png?size=64`
                : null;
              const primary = u.displayName || u.discordUsername || u.microsoftGamertag || "staff";
              const isMe = u.id === me.id;
              const canEditRole = !isMe && (me.role === "founder" || u.role !== "founder");
              return (
                <div key={u.id} className="px-5 py-4 flex items-center gap-4">
                  {avatar ? (
                    <Image src={avatar} alt="" width={40} height={40} className="rounded-full" unoptimized />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-bg-soft flex items-center justify-center text-[13px] font-bold text-text-sub">
                      {primary[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-[14px] font-semibold text-text truncate">{primary}</h3>
                      {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-soft text-text-sub">{locale === "fr" ? "vous" : "you"}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                      {u.discordUsername && (
                        <span className="inline-flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.74 19.74 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.3 12.3 0 01-1.873.892.077.077 0 00-.04.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.84 19.84 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                          @{u.discordUsername}
                        </span>
                      )}
                      {u.microsoftGamertag && (
                        <span className="inline-flex items-center gap-1">
                          <Gamepad2 size={10} className="text-[#00A4EF]" />
                          {u.microsoftGamertag}
                        </span>
                      )}
                      {!u.discordUsername && !u.microsoftGamertag && <span className="italic">—</span>}
                    </div>
                  </div>
                  <select
                    value={u.role}
                    onChange={(e) => handleChangeRole(u.id, e.target.value as StaffRole)}
                    disabled={!canEditRole}
                    className={`text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border-2 ${color.border} ${color.bg} ${color.text} disabled:opacity-50`}
                  >
                    {ROLES.map((r) => {
                      const disabled = r === "founder" && me.role !== "founder";
                      return <option key={r} value={r} disabled={disabled}>{ROLE_LABELS[r].fr}</option>;
                    })}
                  </select>
                  <button onClick={() => handleDelete(u.id)} disabled={isMe}
                    className="p-2 rounded-lg hover:bg-red-50 text-text-sub hover:text-red-500 transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 mc-card p-5 bg-bg-soft/50">
        <p className="text-[12px] text-text-sub">
          <strong className="text-text">{locale === "fr" ? "Comment ça marche :" : "How it works:"}</strong>{" "}
          {locale === "fr"
            ? "Chaque membre peut se connecter via Discord ou Microsoft/Xbox. Renseigne au moins un identifiant. Le staff pourra ensuite lier le 2ème compte depuis sa page 'Mon compte'."
            : "Each member can log in with Discord or Microsoft/Xbox. Provide at least one ID. Staff can link the other account later from their profile page."}
        </p>
      </div>
    </div>
  );
}

function StaffForm({
  onCancel, onSave, error, canAssignFounder, locale,
}: {
  onCancel: () => void;
  onSave: (d: FormData) => void;
  error: string; canAssignFounder: boolean; locale: string;
}) {
  const [discordId, setDiscordId] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [microsoftId, setMicrosoftId] = useState("");
  const [microsoftGamertag, setMicrosoftGamertag] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<StaffRole>("guide");

  const submit = () => {
    if (!discordId.trim() && !microsoftId.trim()) return;
    onSave({
      discordId: discordId.trim(), discordUsername: discordUsername.trim(),
      microsoftId: microsoftId.trim(), microsoftGamertag: microsoftGamertag.trim(),
      displayName: displayName.trim() || discordUsername.trim() || microsoftGamertag.trim(),
      role,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-bold text-text">{locale === "fr" ? "Nouveau membre staff" : "New staff member"}</h2>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-bg-soft text-text-sub"><X size={16} /></button>
      </div>
      {error && <p className="text-red-500 text-[13px] mb-3">{error}</p>}

      <p className="text-[12px] text-text-sub mb-3">
        {locale === "fr" ? "Renseigne au moins un identifiant (Discord OU Microsoft)." : "Provide at least one ID (Discord OR Microsoft)."}
      </p>

      <div className="mc-card p-4 mb-3 bg-bg-soft/40 border-0">
        <h3 className="text-[11px] font-bold text-text-sub uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.74 19.74 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.3 12.3 0 01-1.873.892.077.077 0 00-.04.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.84 19.84 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
          Discord
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <input value={discordId} onChange={(e) => setDiscordId(e.target.value)} placeholder="Discord ID (123456789...)"
            className="w-full px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none" />
          <input value={discordUsername} onChange={(e) => setDiscordUsername(e.target.value)} placeholder="Username"
            className="w-full px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none" />
        </div>
      </div>

      <div className="mc-card p-4 mb-4 bg-bg-soft/40 border-0">
        <h3 className="text-[11px] font-bold text-text-sub uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24">
            <rect x="1" y="1" width="10" height="10" fill="#F25022"/><rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
            <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/><rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
          </svg>
          Microsoft / Xbox
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <input value={microsoftId} onChange={(e) => setMicrosoftId(e.target.value)} placeholder="XUID (2535...)"
            className="w-full px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none" />
          <input value={microsoftGamertag} onChange={(e) => setMicrosoftGamertag(e.target.value)} placeholder="Gamertag (pseudo Bedrock)"
            className="w-full px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-[11px] font-semibold text-text-sub mb-1 block uppercase tracking-wider">{locale === "fr" ? "Nom affiché" : "Display name"}</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={locale === "fr" ? "Optionnel" : "Optional"}
            className="w-full px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-text-sub mb-1 block uppercase tracking-wider">{locale === "fr" ? "Rôle" : "Role"}</label>
          <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)}
            className="w-full px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none">
            {ROLES.map((r) => (
              <option key={r} value={r} disabled={r === "founder" && !canAssignFounder}>{ROLE_LABELS[r].fr}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost !py-2 !px-5 !text-[13px]">{locale === "fr" ? "Annuler" : "Cancel"}</button>
        <button onClick={submit} disabled={!discordId.trim() && !microsoftId.trim()}
          className="btn-primary !py-2 !px-5 !text-[13px] disabled:opacity-50">
          <Save size={14} />{locale === "fr" ? "Ajouter" : "Add"}
        </button>
      </div>
    </div>
  );
}
