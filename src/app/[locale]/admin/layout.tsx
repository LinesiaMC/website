"use client";

import { useState, useCallback, useEffect, ReactNode } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LogOut, Newspaper, BarChart3, Users, TrendingUp,
  ScrollText, ChevronLeft, ChevronRight, LayoutDashboard,
  Coins, Dices, Gem, Box, Shield, MessageSquare, Fingerprint, BookOpen,
  LifeBuoy, UserCircle2, Map, LogIn, User, Briefcase, Award,
} from "lucide-react";
import { AdminContext, CurrentStaff } from "@/components/admin/AdminContext";
import { hasPermission, Permission, ROLE_LABELS, ROLE_COLORS } from "@/lib/roles";

const NAV_ITEMS: { key: string; icon: typeof Newspaper; path: string; perm: Permission }[] = [
  { key: "profile",    icon: UserCircle2,     path: "/admin/profile",                   perm: "analytics.view" },
  { key: "articles",   icon: Newspaper,       path: "/admin",                           perm: "articles.manage" },
  { key: "wiki",       icon: BookOpen,        path: "/admin/wiki",                      perm: "wiki.manage" },
  { key: "roadmap",    icon: Map,             path: "/admin/roadmap",                   perm: "roadmap.manage" },
  { key: "tickets",    icon: LifeBuoy,        path: "/admin/tickets",                   perm: "tickets.view" },
  { key: "rolesMgr",   icon: Shield,          path: "/admin/roles",                     perm: "permissions.manage" },
  { key: "grants",     icon: UserCircle2,     path: "/admin/grants",                    perm: "permissions.manage" },
  { key: "dashboard",  icon: LayoutDashboard, path: "/admin/analytics",                 perm: "analytics.view" },
  { key: "players",    icon: Users,           path: "/admin/analytics/players",         perm: "analytics.view" },
  { key: "retention",  icon: TrendingUp,      path: "/admin/analytics/retention",       perm: "analytics.view" },
  { key: "jobs",       icon: Briefcase,       path: "/admin/analytics/jobs",            perm: "analytics.view" },
  { key: "prestige",   icon: Award,           path: "/admin/analytics/prestige",        perm: "analytics.view" },
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
  rolesMgr: { fr: "Permissions", en: "Permissions" },
  grants: { fr: "Permissions perso.", en: "Per-user grants" },
  dashboard: { fr: "Dashboard", en: "Dashboard" },
  players: { fr: "Joueurs", en: "Players" },
  retention: { fr: "Rétention", en: "Retention" },
  jobs: { fr: "Métiers", en: "Jobs" },
  prestige: { fr: "Prestige", en: "Prestige" },
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
      <div className="min-h-screen bg-bg-soft pt-[110px] px-4">
        <div className="max-w-[520px] mx-auto">
          <div className="mc-card p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-pink/10 flex items-center justify-center mx-auto mb-4">
              <User size={26} className="text-pink" />
            </div>
            <h1 className="text-2xl font-bold text-text mb-1">
              {locale === "fr" ? "Panel Staff" : "Staff Panel"}
            </h1>
            <p className="text-[13px] text-text-sub mb-6">
              {locale === "fr"
                ? "Connecte-toi pour accéder au panel d'administration Linesia."
                : "Log in to access the Linesia admin panel."}
            </p>
            {authError && (
              <p className="text-red-500 text-[12px] mb-3">
                {authError === "not_authorized"
                  ? (locale === "fr" ? "Compte non autorisé. Contactez un administrateur." : "Account not authorized.")
                  : authError === "already_linked"
                  ? (locale === "fr" ? "Ce compte est déjà lié à un autre membre du staff." : "This account is already linked.")
                  : (locale === "fr" ? "Erreur de connexion." : "Login error.")}
              </p>
            )}
            <div className="flex flex-col gap-2 items-center">
              <button
                onClick={() => { window.location.href = `/api/auth/microsoft?return=${ret}`; }}
                className="btn-primary !py-3 !px-5 !text-[13px] inline-flex">
                <LogIn size={14} />{locale === "fr" ? "Se connecter avec Microsoft" : "Sign in with Microsoft"}
              </button>
              <button
                onClick={() => { window.location.href = `/api/auth/discord?return=${ret}`; }}
                className="!py-3 !px-5 !text-[13px] inline-flex items-center gap-2 rounded-xl bg-[#5865F2] text-white font-semibold hover:bg-[#4752C4] transition">
                <LogIn size={14} />{locale === "fr" ? "Se connecter avec Discord" : "Sign in with Discord"}
              </button>
            </div>
            <p className="text-[11px] text-text-muted mt-4">
              {locale === "fr"
                ? "Discord ou compte Minecraft/Xbox. Accès réservé au staff Linesia."
                : "Discord or Minecraft/Xbox. Linesia staff only."}
            </p>
          </div>
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
