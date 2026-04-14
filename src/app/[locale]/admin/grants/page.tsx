"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Search, UserPlus, X, Check, Trash2, UserCircle2 } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import {
  PERMISSIONS, PERMISSION_LABELS, Permission,
  ROLE_LABELS, ROLE_COLORS, StaffRole,
} from "@/lib/roles";

interface Grant {
  staffId: string;
  role: StaffRole;
  source: "manual" | "ingame";
  displayName: string;
  gamertag: string | null;
  xuid: string | null;
  ingameRank: string | null;
  permissions: Permission[];
}

interface PlayerHit {
  uuid: string;
  xuid: string | null;
  username: string;
  lastSeen: number | null;
  ingameRank: string | null;
}

const GROUP_ORDER = ["content", "data", "tickets", "admin"] as const;
const GROUP_LABELS: Record<string, { fr: string; en: string }> = {
  content: { fr: "Contenu", en: "Content" },
  data: { fr: "Données", en: "Data" },
  tickets: { fr: "Tickets", en: "Tickets" },
  admin: { fr: "Administration", en: "Administration" },
};

export default function GrantsAdminPage() {
  const { locale } = useParams<{ locale: string }>();
  const L = locale === "fr" ? "fr" : "en";
  const { can } = useAdmin();

  const [grants, setGrants] = useState<Grant[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // "add grant" drawer state
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerHit[]>([]);
  const [selected, setSelected] = useState<PlayerHit | null>(null);
  const [pendingPerms, setPendingPerms] = useState<Set<Permission>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const searchReqId = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/grants", { cache: "no-store" });
      if (!res.ok) { setError(L === "fr" ? "Accès refusé." : "Forbidden."); setLoading(false); return; }
      const j = await res.json();
      setGrants(j.grants);
      setError("");
    } catch {
      setError(L === "fr" ? "Erreur de chargement." : "Load error.");
    }
    setLoading(false);
  }, [L]);

  useEffect(() => { load(); }, [load]);

  // debounced player search
  useEffect(() => {
    if (!adding) return;
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    const id = ++searchReqId.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/staff/grants/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (id === searchReqId.current) setResults(j.players);
      } catch { /* ignore */ }
    }, 200);
    return () => clearTimeout(t);
  }, [query, adding]);

  const groups = useMemo(() => {
    const g: Record<string, Permission[]> = {};
    for (const p of PERMISSIONS) {
      const grp = PERMISSION_LABELS[p].group;
      (g[grp] ||= []).push(p);
    }
    return g;
  }, []);

  if (!can("permissions.manage")) {
    return <div className="p-8 text-center text-text-sub">{L === "fr" ? "Accès refusé" : "Access denied"}</div>;
  }

  const openDrawer = () => {
    setAdding(true);
    setQuery("");
    setResults([]);
    setSelected(null);
    setPendingPerms(new Set());
  };
  const closeDrawer = () => { setAdding(false); };

  const togglePending = (p: Permission) => {
    setPendingPerms((s) => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p); else n.add(p);
      return n;
    });
  };

  const submitGrant = async () => {
    if (!selected || pendingPerms.size === 0) return;
    setSubmitting(true);
    const body = {
      xuid: selected.xuid ?? undefined,
      uuid: selected.uuid,
      username: selected.username,
      permissions: Array.from(pendingPerms),
    };
    const res = await fetch("/api/staff/grants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "grant_failed");
      return;
    }
    closeDrawer();
    await load();
  };

  const revoke = async (staffId: string, permission: Permission) => {
    const res = await fetch(`/api/staff/grants?staffId=${encodeURIComponent(staffId)}&permission=${encodeURIComponent(permission)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "revoke_failed");
      return;
    }
    await load();
  };

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink flex items-center justify-center">
            <UserCircle2 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text">{L === "fr" ? "Permissions individuelles" : "Per-user permissions"}</h1>
            <p className="text-[12px] text-text-muted">
              {L === "fr"
                ? "Donne à un joueur précis une ou plusieurs permissions, sans lui attribuer de grade."
                : "Grant one or more permissions to a specific player, without assigning a role."}
            </p>
          </div>
        </div>
        <button onClick={openDrawer} className="btn-primary !py-2 !px-4 !text-[13px]">
          <UserPlus size={14} />{L === "fr" ? "Accorder" : "Grant"}
        </button>
      </div>

      {error && (
        <div className="mc-card p-3 mb-4 text-[13px] text-red-600 bg-red-50 border-red-200 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}

      <div className="mc-card overflow-hidden">
        {loading && !grants && <div className="p-8 text-center text-text-muted">{L === "fr" ? "Chargement..." : "Loading..."}</div>}
        {grants && grants.length === 0 && (
          <div className="p-8 text-center text-text-muted text-[13px]">
            {L === "fr" ? "Aucune permission individuelle n'est accordée pour le moment." : "No per-user grants yet."}
          </div>
        )}
        {grants && grants.length > 0 && (
          <table className="w-full text-[13px]">
            <thead className="bg-bg-soft border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{L === "fr" ? "Joueur" : "Player"}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{L === "fr" ? "Grade" : "Role"}</th>
                <th className="text-left px-4 py-3 font-semibold text-text-sub">{L === "fr" ? "Permissions accordées" : "Granted permissions"}</th>
              </tr>
            </thead>
            <tbody>
              {grants.map((g) => {
                const c = ROLE_COLORS[g.role];
                return (
                  <tr key={g.staffId} className="border-t border-border hover:bg-bg-soft/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-text">{g.displayName}</div>
                      <div className="text-[11px] text-text-muted font-mono">
                        {g.xuid ? `xuid:${g.xuid}` : g.staffId}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>
                        {ROLE_LABELS[g.role][L]}
                      </span>
                      {g.source === "ingame" && (
                        <span className="ml-1 text-[10px] text-text-muted">(in-game)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {g.permissions.map((p) => (
                          <span
                            key={p}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-pink/10 text-pink border border-pink/20"
                          >
                            {PERMISSION_LABELS[p][L]}
                            <button
                              onClick={() => revoke(g.staffId, p)}
                              className="hover:text-red-600"
                              title={L === "fr" ? "Retirer" : "Revoke"}
                            >
                              <Trash2 size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Drawer */}
      {adding && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={closeDrawer} />
          <div className="w-full max-w-[500px] bg-white shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-text">{L === "fr" ? "Accorder des permissions" : "Grant permissions"}</h2>
              <button onClick={closeDrawer} className="text-text-sub hover:text-text"><X size={16} /></button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="text-[12px] font-semibold text-text-sub mb-1.5 block">
                  {L === "fr" ? "1. Choisir un joueur" : "1. Pick a player"}
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                    placeholder={L === "fr" ? "Pseudo, xuid ou uuid..." : "Username, xuid or uuid..."}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-[13px] bg-bg-soft/40 focus:outline-none focus:border-pink/50"
                  />
                </div>
                {!selected && results.length > 0 && (
                  <div className="mt-2 border border-border rounded-lg overflow-hidden max-h-[180px] overflow-y-auto">
                    {results.map((p) => (
                      <button
                        key={p.uuid}
                        onClick={() => { setSelected(p); setQuery(p.username); setResults([]); }}
                        className="w-full text-left px-3 py-2 text-[13px] hover:bg-bg-soft border-b border-border last:border-b-0 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-text">{p.username}</div>
                          <div className="text-[11px] text-text-muted font-mono">
                            {p.xuid ? `xuid:${p.xuid}` : p.uuid}
                          </div>
                        </div>
                        {p.ingameRank && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-soft text-text-sub">{p.ingameRank}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {selected && (
                  <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-[12px]">
                    <div>
                      <span className="font-semibold text-green-800">{selected.username}</span>
                      <span className="text-text-muted ml-2 font-mono">{selected.xuid ? `xuid:${selected.xuid}` : selected.uuid}</span>
                    </div>
                    <button onClick={() => { setSelected(null); setQuery(""); }} className="text-text-sub hover:text-red-600">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[12px] font-semibold text-text-sub mb-1.5 block">
                  {L === "fr" ? "2. Permissions à accorder" : "2. Permissions to grant"}
                </label>
                <div className="space-y-3">
                  {GROUP_ORDER.map((grp) => {
                    const perms = groups[grp] ?? [];
                    if (perms.length === 0) return null;
                    return (
                      <div key={grp}>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-pink mb-1">
                          {GROUP_LABELS[grp]?.[L] || grp}
                        </div>
                        <div className="space-y-1">
                          {perms.map((p) => {
                            const checked = pendingPerms.has(p);
                            return (
                              <label
                                key={p}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-bg-soft cursor-pointer"
                              >
                                <button
                                  type="button"
                                  onClick={() => togglePending(p)}
                                  className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                                    checked ? "bg-pink border-pink" : "bg-white border-border"
                                  }`}
                                >
                                  {checked && <Check size={12} className="text-white" />}
                                </button>
                                <div className="flex-1">
                                  <div className="text-[13px] text-text">{PERMISSION_LABELS[p][L]}</div>
                                  <div className="text-[10px] text-text-muted font-mono">{p}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-2">
              <button onClick={closeDrawer} className="px-3 py-2 rounded-lg text-[13px] text-text-sub hover:bg-bg-soft">
                {L === "fr" ? "Annuler" : "Cancel"}
              </button>
              <button
                onClick={submitGrant}
                disabled={!selected || pendingPerms.size === 0 || submitting}
                className="btn-primary !py-2 !px-4 !text-[13px] disabled:opacity-50"
              >
                <Check size={14} />
                {submitting
                  ? "..."
                  : L === "fr"
                    ? `Accorder ${pendingPerms.size > 0 ? `(${pendingPerms.size})` : ""}`
                    : `Grant ${pendingPerms.size > 0 ? `(${pendingPerms.size})` : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
