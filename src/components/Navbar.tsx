"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { Menu, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const navLinks = [
    { href: "/" as const, label: t("home") },
    { href: "/news" as const, label: t("news") },
    { href: "/wiki" as const, label: t("wiki") },
    { href: "/store" as const, label: t("store") },
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
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[14px] transition-all duration-100 ${
                pathname === link.href
                  ? "font-semibold text-text"
                  : "font-normal text-text-sub hover:font-semibold hover:text-text"
              }`}
            >
              {link.label}
            </Link>
          ))}
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
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-xl text-[14px] font-medium ${
                  pathname === link.href ? "text-pink bg-pink-soft" : "text-text-sub"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/" onClick={() => setMobileOpen(false)} className="block mt-1 btn-primary text-center !py-3">
              {t("play")}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
