"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function Footer() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");

  return (
    <footer className="w-full bg-bg-soft border-t border-border">
      <div className="max-w-[1200px] mx-auto px-6 sm:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-pink flex items-center justify-center">
                <span className="text-text font-bold text-sm">L</span>
              </div>
              <span className="font-semibold text-[15px] text-text">Linesia</span>
            </div>
            <p className="text-[13px] text-text-sub leading-relaxed mb-4 max-w-[260px]">{t("description")}</p>
            <a href="https://discord.gg/linesia" target="_blank" rel="noopener noreferrer" className="btn-discord !py-2 !px-4 !text-[12px]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z"/></svg>
              Discord
            </a>
          </div>

          {/* Nav columns */}
          <div>
            <h4 className="text-[13px] font-semibold text-text mb-3">{t("navigation")}</h4>
            <ul className="space-y-2">
              {[
                { href: "/" as const, label: nav("home"), external: false },
                { href: "/news" as const, label: nav("news"), external: false },
                { href: "/wiki" as const, label: nav("wiki"), external: false },
                { href: "https://store.linesia.net", label: nav("store"), external: true },
              ].map((item) => (
                <li key={item.href}>
                  {item.external ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-[13px] text-text-sub hover:text-text transition-colors">{item.label}</a>
                  ) : (
                    <Link href={item.href as "/" | "/news" | "/wiki"} className="text-[13px] text-text-sub hover:text-text transition-colors">{item.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[13px] font-semibold text-text mb-3">{t("resources")}</h4>
            <ul className="space-y-2">
              <li><a href="https://discord.gg/linesia" target="_blank" rel="noopener noreferrer" className="text-[13px] text-text-sub hover:text-text transition-colors">Discord</a></li>
              <li><a href="https://linesia.tebex.io/" target="_blank" rel="noopener noreferrer" className="text-[13px] text-text-sub hover:text-text transition-colors">Tebex</a></li>
              <li><Link href="/support" className="text-[13px] text-text-sub hover:text-text transition-colors">Support</Link></li>
              <li><a href="mailto:support@linesia.net" className="text-[13px] text-text-sub hover:text-text transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[13px] font-semibold text-text mb-3">{t("legal")}</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-[13px] text-text-sub hover:text-text transition-colors">{t("privacy")}</a></li>
              <li><a href="#" className="text-[13px] text-text-sub hover:text-text transition-colors">{t("terms")}</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[12px] text-text-sub">&copy; 2026 Linesia &mdash; {t("notAffiliated")}</p>
          <div className="flex gap-3">
            {[
              { href: "https://tiktok.com/@linesiamc", label: "TikTok", d: "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.65a8.35 8.35 0 0 0 4.76 1.49V6.69h-1z" },
              { href: "https://instagram.com/linesiamc", label: "Instagram", d: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" },
              { href: "https://www.youtube.com/@linesiamc", label: "YouTube", d: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
            ].map((social) => (
              <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer"
                className="text-text-sub hover:text-text transition-colors" aria-label={social.label}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={social.d}/></svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
