"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { Menu, X, ChevronDown, User, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AccountSummary {
  displayName: string | null;
  microsoftGamertag: string | null;
  linkedPlayerName: string | null;
}

export default function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [account, setAccount] = useState<AccountSummary | null>(null);

  useEffect(() => {
    fetch("/api/account/me").then((r) => r.json()).then((j) => setAccount(j.account)).catch(() => {});
  }, [pathname]);

  const navLinks = [
    { href: "/" as const, label: t("home") },
    { href: "/news" as const, label: t("news") },
    { href: "/leaderboard" as const, label: locale === "fr" ? "Classement" : "Leaderboard" },
    { href: "/wiki" as const, label: t("wiki") },
    { href: "/support" as const, label: locale === "fr" ? "Support" : "Support" },
    { href: "https://store.linesia.net", label: t("store"), external: true },
  ];

  const switchLocale = (newLocale: "fr" | "en") => {
    setLangOpen(false);
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <nav className="fixed top-[26px] left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-[1033px]">
      <div className="bg-white rounded-2xl shadow-lg border border-border px-5 h-[60px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/images/1024.jpg" alt="Linesia" className="w-8 h-8 rounded-lg" />
          <span className="font-semibold text-[15px] text-text hidden sm:block">Linesia</span>
        </Link>

        {/* Center nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] transition-all duration-100 font-normal text-text-sub hover:font-semibold hover:text-text"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href as "/" | "/news" | "/wiki" | "/support" | "/leaderboard"}
                className={`text-[14px] transition-all duration-100 ${
                  pathname === link.href
                    ? "font-semibold text-text"
                    : "font-normal text-text-sub hover:font-semibold hover:text-text"
                }`}
              >
                {link.label}
              </Link>
            )
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Language */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 text-[13px] font-medium text-text-sub hover:text-text transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span className="hidden sm:inline">{locale === "fr" ? "Francais" : "English"}</span>
              <ChevronDown size={12} className={`transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 mt-3 w-40 bg-white rounded-2xl shadow-lg border border-border overflow-hidden z-20"
                  >
                    {(["fr", "en"] as const).map((loc) => (
                      <button
                        key={loc}
                        onClick={() => switchLocale(loc)}
                        className={`w-full px-4 py-2.5 text-left text-[13px] font-medium transition-colors ${
                          locale === loc ? "text-pink bg-pink-soft" : "text-text hover:bg-bg-soft"
                        }`}
                      >
                        {loc === "fr" ? "🇫🇷 Francais" : "🇬🇧 English"}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {account ? (
            <Link
              href={"/account" as never}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] border border-border bg-white text-[13px] font-medium text-text hover:border-pink hover:text-pink transition-colors"
            >
              <User size={13} />
              <span className="max-w-[110px] truncate">
                {account.linkedPlayerName || account.microsoftGamertag || account.displayName || "Compte"}
              </span>
            </Link>
          ) : (
            <button
              onClick={() => { window.location.href = "/api/account/microsoft"; }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] border border-border bg-white text-[13px] font-medium text-text-sub hover:border-pink hover:text-pink transition-colors"
            >
              <LogIn size={13} />
              <span>{locale === "fr" ? "Connexion" : "Login"}</span>
            </button>
          )}

          <Link href="/" className="btn-primary !py-2 !px-5 !text-[13px] !rounded-[10px] hidden sm:inline-flex">
            {t("play")}
          </Link>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-text-sub">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-2 bg-white rounded-2xl shadow-lg border border-border p-2 md:hidden"
          >
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-xl text-[14px] font-medium text-text-sub"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href as "/" | "/news" | "/wiki" | "/support" | "/leaderboard"}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-[14px] font-medium ${
                    pathname === link.href ? "text-pink bg-pink-soft" : "text-text-sub"
                  }`}
                >
                  {link.label}
                </Link>
              )
            )}
            {account ? (
              <Link href={"/account" as never} onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-[14px] font-medium text-text-sub">
                <User size={14} />{account.linkedPlayerName || account.microsoftGamertag || (locale === "fr" ? "Mon compte" : "Account")}
              </Link>
            ) : (
              <button
                onClick={() => { setMobileOpen(false); window.location.href = "/api/account/microsoft"; }}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-[14px] font-medium text-text-sub text-left">
                <LogIn size={14} />{locale === "fr" ? "Connexion" : "Login"}
              </button>
            )}
            <Link href="/" onClick={() => setMobileOpen(false)} className="block mt-1 btn-primary text-center !py-3">
              {t("play")}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
