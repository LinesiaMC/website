"use client";

import { useState, useCallback, useEffect, ReactNode } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Lock, LogOut, Newspaper, BarChart3, Users, TrendingUp,
  Globe, ScrollText, ChevronLeft, ChevronRight, LayoutDashboard,
  Coins, Dices, Gem, Box, Shield, MessageSquare, Fingerprint, BookOpen,
  UserCog, LifeBuoy, UserCircle2, Map,
} from "lucide-react";
import { AdminContext, CurrentStaff } from "@/components/admin/AdminContext";
import { hasPermission, Permission, ROLE_LABELS, ROLE_COLORS } from "@/lib/roles";

const NAV_ITEMS: { key: string; icon: typeof Newspaper; path: string; perm: Permission }[] = [
  { key: "profile",    icon: UserCircle2,     path: "/admin/profile",                   perm: "analytics.view" },
  { key: "articles",   icon: Newspaper,       path: "/admin",                           perm: "articles.manage" },
  { key: "wiki",       icon: BookOpen,        path: "/admin/wiki",                      perm: "wiki.manage" },
  { key: "roadmap",    icon: Map,             path: "/admin/roadmap",                   perm: "roadmap.manage" },
  { key: "tickets",    icon: LifeBuoy,        path: "/admin/tickets",                   perm: "tickets.view" },
  { key: "staffMgr",   icon: UserCog,         path: "/admin/staff",                     perm: "staff.manage" },
  { key: "rolesMgr",   icon: Shield,          path: "/admin/roles",                     perm: "permissions.manage" },
  { key: "community",  icon: Users,           path: "/admin/community",                 perm: "community.view" },
  { key: "dashboard",  icon: LayoutDashboard, path: "/admin/analytics",                 perm: "analytics.view" },
  { key: "players",    icon: Users,           path: "/admin/analytics/players",         perm: "analytics.view" },
  { key: "retention",  icon: TrendingUp,      path: "/admin/analytics/retention",       perm: "analytics.view" },
  { key: "worlds",     icon: Globe,           path: "/admin/analytics/worlds",          perm: "analytics.view" },
  { key: "economy",    icon: Coins,           path: "/admin/analytics/economy",         perm: "analytics.view" },
  { key: "items",      icon: Gem,             path: "/admin/analytics/items",           perm: "analytics.view" },
  { key: "itemTrace",  icon: Fingerprint,     path: "/admin/analytics/items/trace",     perm: "analytics.view" },
  { key: "messages",   icon: MessageSquare,   path: "/admin/analytics/messages",        perm: "analytics.view" },
  { key: "casino",     icon: Dices,           path: "/admin/analytics/casino",          perm: "analytics.view" },
  { key: "boxes",      icon: Box,             path: "/admin/analytics/boxes",           perm: "analytics.view" },
  { key: "staff",      icon: Shield,          path: "/admin/analytics/staff",           perm: "analytics.view" },
  { key: "logs",       icon: ScrollText,      path: "/admin/analytics/logs",            perm: "logs.view" },
];

const NAV_LABELS: Record<string, { fr: string; en: string }> = {
  profile: { fr: "Mon compte", en: "My account" },
  articles: { fr: "Articles", en: "Articles" },
  wiki: { fr: "Wiki", en: "Wiki" },
  roadmap: { fr: "Roadmap", en: "Roadmap" },
  tickets: { fr: "Tickets", en: "Tickets" },
  staffMgr: { fr: "Gestion Staff", en: "Staff Management" },
  rolesMgr: { fr: "Permissions", en: "Permissions" },
  community: { fr: "Communauté", en: "Community" },
  dashboard: { fr: "Dashboard", en: "Dashboard" },
  players: { fr: "Joueurs", en: "Players" },
  retention: { fr: "Rétention", en: "Retention" },
  worlds: { fr: "Mondes", en: "Worlds" },
  economy: { fr: "Économie", en: "Economy" },
  items: { fr: "Items", en: "Items" },
  itemTrace: { fr: "Tracer Item", en: "Trace Item" },
  messages: { fr: "Messages", en: "Messages" },
  casino: { fr: "Casino", en: "Casino" },
  boxes: { fr: "Boxes", en: "Boxes" },
  staff: { fr: "Staff actions", en: "Staff actions" },
  logs: { fr: "Logs", en: "Logs" },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { locale } = useParams<{ locale: string }>();
  const pathname = usePathname();
  const [staff, setStaff] = useState<CurrentStaff | null>(null);
  const [permissions, setPermissions] = useState<Partial<Record<Permission, boolean>>>({});
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAuthError(params.get("auth_error"));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        setStaff(data.staff);
        if (data.permissions) setPermissions(data.permissions);
      } catch { /* ignore */ }
      setReady(true);
    })();
  }, []);

  const headers = useCallback(() => ({ "Content-Type": "application/json" }), []);
  const can = useCallback((perm: Permission) => {
    if (!staff) return false;
    if (staff.role === "founder") return true;
    if (perm in permissions) return permissions[perm] === true;
    return hasPermission(staff.role, perm);
  }, [staff, permissions]);
  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setStaff(null);
    window.location.href = `/${locale}/admin`;
  }, [locale]);

  if (!ready) return <div className="min-h-screen bg-bg-soft" />;

  if (!staff) {
    const ret = encodeURIComponent(pathname);
    return (
      <div className="min-h-screen bg-bg-soft flex items-center justify-center p-4">
        <div className="mc-card p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-pink/10 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-pink" />
          </div>
          <h1 className="text-xl font-bold text-text mb-1">
            {locale === "fr" ? "Panel Staff" : "Staff Panel"}
          </h1>
          <p className="text-[13px] text-text-sub mb-6">Linesia</p>
          {authError && (
            <p className="text-red-500 text-[12px] mb-3">
              {authError === "not_authorized"
                ? (locale === "fr" ? "Compte non autorisé. Contactez un administrateur." : "Account not authorized.")
                : authError === "already_linked"
                ? (locale === "fr" ? "Ce compte est déjà lié à un autre membre du staff." : "This account is already linked.")
                : (locale === "fr" ? "Erreur de connexion." : "Login error.")}
            </p>
          )}
          <div className="space-y-2">
            <a href={`/api/auth/discord?return=${ret}`} className="btn-primary w-full !py-2.5 inline-flex items-center justify-center gap-2" style={{ backgroundColor: "#5865F2" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.74 19.74 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.3 12.3 0 01-1.873.892.077.077 0 00-.04.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.84 19.84 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              {locale === "fr" ? "Connexion avec Discord" : "Login with Discord"}
            </a>
            <a href={`/api/auth/microsoft?return=${ret}`} className="w-full !py-2.5 inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-[13px] border-2 border-border bg-white text-text hover:bg-bg-soft transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
                <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
                <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
                <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
              </svg>
              {locale === "fr" ? "Connexion avec Microsoft" : "Login with Microsoft"}
            </a>
          </div>
          <p className="text-[11px] text-text-muted mt-4">
            {locale === "fr" ? "Discord ou compte Minecraft/Xbox. Accès réservé au staff Linesia." : "Discord or Minecraft/Xbox. Linesia staff only."}
          </p>
        </div>
      </div>
    );
  }

  const isActive = (itemPath: string) => {
    const full = `/${locale}${itemPath}`;
    if (itemPath === "/admin") return pathname === full;
    if (itemPath === "/admin/wiki") return pathname === full || pathname.startsWith(full + "/");
    if (itemPath === "/admin/analytics/items") return pathname === full;
    return pathname.startsWith(full);
  };

  const roleColor = ROLE_COLORS[staff.role];
  const avatarUrl = staff.discordAvatar && staff.discordId
    ? `https://cdn.discordapp.com/avatars/${staff.discordId}/${staff.discordAvatar}.png?size=64`
    : null;
  const primaryName = staff.displayName || staff.discordUsername || staff.microsoftGamertag || "staff";

  return (
    <AdminContext.Provider value={{ staff, can, logout, headers }}>
      <div className="min-h-screen bg-bg-soft flex">
        <aside className={`${collapsed ? "w-[68px]" : "w-[230px]"} bg-white border-r border-border flex flex-col shrink-0 transition-all duration-200`}>
          <div className="px-4 py-5 flex items-center gap-3 border-b border-border">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink to-violet flex items-center justify-center shrink-0">
              <BarChart3 size={16} className="text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-text truncate">Linesia</p>
                <p className="text-[11px] text-text-muted">Staff Panel</p>
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="px-3 py-3 border-b border-border">
              <div className="flex items-center gap-2.5 px-2">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="" width={32} height={32} className="rounded-full" unoptimized />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-bg-soft flex items-center justify-center text-[12px] font-bold text-text-sub">
                    {primaryName[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-text truncate">{primaryName}</p>
                  <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${roleColor.bg} ${roleColor.text}`}>
                    {ROLE_LABELS[staff.role][locale as "fr" | "en"] || ROLE_LABELS[staff.role].fr}
                  </span>
                </div>
              </div>
            </div>
          )}

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.filter((i) => can(i.perm)).map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              const label = NAV_LABELS[item.key][locale as "fr" | "en"] || NAV_LABELS[item.key].en;
              return (
                <Link
                  key={item.key}
                  href={`/${locale}${item.path}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                    active ? "bg-pink/10 text-pink" : "text-text-sub hover:bg-bg-soft hover:text-text"
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="px-3 py-4 border-t border-border space-y-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-text-sub hover:bg-bg-soft hover:text-text w-full transition-colors"
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              {!collapsed && <span>{locale === "fr" ? "Réduire" : "Collapse"}</span>}
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-text-sub hover:bg-red-50 hover:text-red-500 w-full transition-colors"
            >
              <LogOut size={18} className="shrink-0" />
              {!collapsed && <span>{locale === "fr" ? "Déconnexion" : "Logout"}</span>}
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </AdminContext.Provider>
  );
}
