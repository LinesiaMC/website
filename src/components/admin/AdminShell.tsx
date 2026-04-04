"use client";

import { useState, useCallback, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Lock, LogOut, Newspaper, BarChart3, Users, TrendingUp,
  Globe, ScrollText, ChevronLeft, ChevronRight, LayoutDashboard, Dices, Coins, Gem, Box,
} from "lucide-react";

interface AdminShellProps {
  children: (props: { password: string; headers: () => Record<string, string> }) => ReactNode;
  locale: string;
}

const NAV_ITEMS = [
  { key: "articles", icon: Newspaper, path: "/admin" },
  { key: "dashboard", icon: LayoutDashboard, path: "/admin/analytics" },
  { key: "players", icon: Users, path: "/admin/analytics/players" },
  { key: "retention", icon: TrendingUp, path: "/admin/analytics/retention" },
  { key: "worlds", icon: Globe, path: "/admin/analytics/worlds" },
  { key: "economy", icon: Coins, path: "/admin/analytics/economy" },
  { key: "items", icon: Gem, path: "/admin/analytics/items" },
  { key: "casino", icon: Dices, path: "/admin/analytics/casino" },
  { key: "boxes", icon: Box, path: "/admin/analytics/boxes" },
  { key: "logs", icon: ScrollText, path: "/admin/analytics/logs" },
];

const NAV_LABELS: Record<string, { fr: string; en: string }> = {
  articles: { fr: "Articles", en: "Articles" },
  dashboard: { fr: "Dashboard", en: "Dashboard" },
  players: { fr: "Joueurs", en: "Players" },
  retention: { fr: "Retention", en: "Retention" },
  worlds: { fr: "Mondes", en: "Worlds" },
  economy: { fr: "Economie", en: "Economy" },
  items: { fr: "Items", en: "Items" },
  casino: { fr: "Casino", en: "Casino" },
  boxes: { fr: "Boxes", en: "Boxes" },
  logs: { fr: "Logs", en: "Logs" },
};

const SESSION_KEY = "linesia-admin-pwd";

export default function AdminShell({ children, locale }: AdminShellProps) {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [checking, setChecking] = useState(true);
  const pathname = usePathname();

  // Restore session from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      setPassword(saved);
      setAuthed(true);
    }
    setChecking(false);
  }, []);

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${password}`,
  }), [password]);

  const handleLogin = async () => {
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${password}` },
        body: JSON.stringify({ title: "__test__", excerpt: "t", content: "t", date: "2026-01-01", locale: "fr" }),
      });
      if (res.status === 401) {
        setError(locale === "fr" ? "Mot de passe incorrect" : "Wrong password");
        return;
      }
      if (res.ok) {
        const art = await res.json();
        await fetch(`/api/articles?id=${art.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${password}` },
        });
      }
      sessionStorage.setItem(SESSION_KEY, password);
      setAuthed(true);
      setError("");
    } catch {
      setError(locale === "fr" ? "Erreur de connexion" : "Connection error");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    setPassword("");
  };

  // Don't flash login screen while checking sessionStorage
  if (checking) {
    return <div className="min-h-screen bg-bg-soft" />;
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-bg-soft flex items-center justify-center p-4">
        <div className="mc-card p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-pink/10 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-pink" />
          </div>
          <h1 className="text-xl font-bold text-text mb-1">
            {locale === "fr" ? "Panel Admin" : "Admin Panel"}
          </h1>
          <p className="text-[13px] text-text-sub mb-6">Linesia</p>
          {error && <p className="text-red-500 text-[13px] mb-3">{error}</p>}
          <input
            type="password"
            placeholder={locale === "fr" ? "Mot de passe admin" : "Admin password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full px-4 py-2.5 rounded-xl border-2 border-border bg-white text-[14px] text-text placeholder:text-text-muted focus:border-pink focus:outline-none mb-3"
          />
          <button onClick={handleLogin} className="btn-primary w-full !py-2.5">
            {locale === "fr" ? "Connexion" : "Login"}
          </button>
        </div>
      </div>
    );
  }

  const isActive = (itemPath: string) => {
    const full = `/${locale}${itemPath}`;
    if (itemPath === "/admin") return pathname === full;
    return pathname.startsWith(full);
  };

  return (
    <div className="min-h-screen bg-bg-soft flex">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-[68px]" : "w-[220px]"} bg-white border-r border-border flex flex-col shrink-0 transition-all duration-200`}>
        {/* Logo */}
        <div className="px-4 py-5 flex items-center gap-3 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink to-violet flex items-center justify-center shrink-0">
            <BarChart3 size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-text truncate">Linesia</p>
              <p className="text-[11px] text-text-muted">Admin</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            const label = NAV_LABELS[item.key][locale as "fr" | "en"] || NAV_LABELS[item.key].en;
            return (
              <a
                key={item.key}
                href={`/${locale}${item.path}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-pink/10 text-pink"
                    : "text-text-sub hover:bg-bg-soft hover:text-text"
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </a>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-border space-y-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-text-sub hover:bg-bg-soft hover:text-text w-full transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!collapsed && <span>{locale === "fr" ? "Reduire" : "Collapse"}</span>}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-text-sub hover:bg-red-50 hover:text-red-500 w-full transition-colors"
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>{locale === "fr" ? "Deconnexion" : "Logout"}</span>}
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {children({ password, headers })}
      </main>
    </div>
  );
}
