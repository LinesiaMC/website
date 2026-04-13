"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Save, Shield, Lock, RotateCcw, Check } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import {
  ROLES, ROLE_LABELS, ROLE_COLORS, StaffRole,
  PERMISSIONS, PERMISSION_LABELS, Permission,
  DEFAULT_PERMISSIONS,
} from "@/lib/roles";

type PermMap = Record<StaffRole, Record<Permission, boolean>>;

const GROUP_ORDER = ["content", "data", "tickets", "admin"] as const;
const GROUP_LABELS: Record<string, { fr: string; en: string }> = {
  content: { fr: "Contenu", en: "Content" },
  data: { fr: "Données", en: "Data" },
  tickets: { fr: "Tickets", en: "Tickets" },
  admin: { fr: "Administration", en: "Administration" },
};

export default function RolesAdminPage() {
  const { locale } = useParams<{ locale: string }>();
  const { can } = useAdmin();
  const [map, setMap] = useState<PermMap | null>(null);
  const [dirty, setDirty] = useState<Set<string>>(new Set()); // "role:perm"
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/permissions", { cache: "no-store" });
    if (!res.ok) { setError(locale === "fr" ? "Accès refusé ou erreur." : "Forbidden or error."); return; }
    const j = await res.json();
    setMap(j.map);
    setDirty(new Set());
  }, [locale]);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const g: Record<string, Permission[]> = {};
    for (const p of PERMISSIONS) {
      const grp = PERMISSION_LABELS[p].group;
      (g[grp] ||= []).push(p);
    }
    return g;
  }, []);

  if (!can("permissions.manage")) {
    return <div className="p-8 text-center text-text-sub">{locale === "fr" ? "Accès refusé" : "Access denied"}</div>;
  }

  const toggle = (role: StaffRole, perm: Permission) => {
    if (!map) return;
    if (role === "founder") return;
    const next = { ...map, [role]: { ...map[role], [perm]: !map[role][perm] } };
    setMap(next);
    setDirty((d) => {
      const key = `${role}:${perm}`;
      const n = new Set(d);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const resetToDefaults = (role: StaffRole) => {
    if (!map || role === "founder") return;
    const def = DEFAULT_PERMISSIONS[role];
    const next = { ...map, [role]: { ...def } };
    setMap(next);
    setDirty((d) => {
      const n = new Set(d);
      for (const p of PERMISSIONS) {
        if (def[p] !== map[role][p]) n.add(`${role}:${p}`);
      }
      return n;
    });
  };

  const save = async () => {
    if (!map || dirty.size === 0) return;
    setSaving(true);
    setError("");
    const changes: Array<{ role: StaffRole; permission: Permission; allowed: boolean }> = [];
    for (const key of dirty) {
      const [role, perm] = key.split(":") as [StaffRole, Permission];
      changes.push({ role, permission: perm, allowed: map[role][perm] });
    }
    const res = await fetch("/api/permissions", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "save_failed");
    } else {
      const j = await res.json();
      setMap(j.map);
      setDirty(new Set());
      setSavedAt(Date.now());
    }
    setSaving(false);
  };

  if (!map) {
    return <div className="p-8 text-center text-text-muted">{locale === "fr" ? "Chargement..." : "Loading..."}</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text">{locale === "fr" ? "Permissions des rôles" : "Role Permissions"}</h1>
            <p className="text-[12px] text-text-muted">
              {dirty.size > 0
                ? (locale === "fr" ? `${dirty.size} modification(s) non sauvegardée(s)` : `${dirty.size} unsaved change(s)`)
                : (locale === "fr" ? "Tout est à jour" : "All saved")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && Date.now() - savedAt < 3000 && (
            <span className="inline-flex items-center gap-1 text-[12px] text-green-700">
              <Check size={14} />{locale === "fr" ? "Sauvegardé" : "Saved"}
            </span>
          )}
          <button
            disabled={dirty.size === 0 || saving}
            onClick={save}
            className="btn-primary !py-2 !px-4 !text-[13px] disabled:opacity-50"
          >
            <Save size={14} />{saving ? (locale === "fr" ? "..." : "...") : (locale === "fr" ? "Sauvegarder" : "Save")}
          </button>
        </div>
      </div>

      {error && <div className="mc-card p-3 mb-4 text-[13px] text-red-600 bg-red-50 border-red-200">{error}</div>}

      <div className="mc-card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-bg-soft border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Permission" : "Permission"}</th>
              {ROLES.map((r) => {
                const c = ROLE_COLORS[r];
                return (
                  <th key={r} className="px-3 py-3 text-center w-[110px]">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${c.bg} ${c.text}`}>
                      {ROLE_LABELS[r].fr}
                      {r === "founder" && <Lock size={9} />}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {GROUP_ORDER.map((grp) => {
              const perms = groups[grp] ?? [];
              if (perms.length === 0) return null;
              return (
                <>
                  <tr key={`grp-${grp}`} className="bg-bg-soft/40">
                    <td colSpan={ROLES.length + 1} className="px-4 py-2 text-[11px] font-bold text-pink uppercase tracking-wider">
                      {GROUP_LABELS[grp]?.fr || grp}
                    </td>
                  </tr>
                  {perms.map((p) => (
                    <tr key={p} className="border-t border-border hover:bg-bg-soft/30">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-text">{PERMISSION_LABELS[p].fr}</div>
                        <div className="text-[11px] text-text-muted font-mono">{p}</div>
                      </td>
                      {ROLES.map((r) => {
                        const allowed = map[r][p];
                        const isFounder = r === "founder";
                        const isDirty = dirty.has(`${r}:${p}`);
                        return (
                          <td key={r} className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              disabled={isFounder}
                              onClick={() => toggle(r, p)}
                              className={`w-6 h-6 rounded-md border-2 transition-all relative ${
                                isFounder
                                  ? "bg-red-100 border-red-300 cursor-not-allowed"
                                  : allowed
                                    ? "bg-pink border-pink hover:bg-pink/90"
                                    : "bg-white border-border hover:border-pink/40"
                              } ${isDirty ? "ring-2 ring-yellow-400 ring-offset-1" : ""}`}
                              title={isFounder ? "Founder = immuable" : (allowed ? "Activé" : "Désactivé")}
                            >
                              {(isFounder || allowed) && <Check size={14} className={`absolute inset-0 m-auto ${isFounder ? "text-red-700" : "text-white"}`} />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 mc-card p-4 bg-bg-soft/50 flex flex-wrap items-center gap-4">
        <p className="text-[12px] text-text-sub flex-1 min-w-[260px]">
          {locale === "fr"
            ? "Le rôle Fondateur dispose toujours de toutes les permissions (verrouillé pour des raisons de sécurité)."
            : "The Founder role always has all permissions (security-locked)."}
        </p>
        <div className="flex flex-wrap gap-2">
          {ROLES.filter((r) => r !== "founder").map((r) => (
            <button
              key={r}
              onClick={() => resetToDefaults(r)}
              className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-lg border border-border bg-white hover:bg-bg-soft text-text-sub"
            >
              <RotateCcw size={11} />{locale === "fr" ? "Défauts" : "Defaults"} {ROLE_LABELS[r].fr}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
