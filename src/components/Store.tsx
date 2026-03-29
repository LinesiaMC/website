"use client";

import { useTranslations } from "next-intl";
import { useReveal, RevealDiv } from "@/lib/useReveal";
import { ExternalLink, Star, Zap, Crown } from "lucide-react";
import { GEM_PACKS, STORE_GOAL, getTebexCheckoutUrl } from "@/lib/store-config";
import { Link } from "@/i18n/routing";

function GemIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="gem-shine">
      <path d="M6 3h12l4 8-10 12L2 11l4-8z" fill="#E91E8C" />
      <path d="M12 3l-2 8 2 12 2-12-2-8z" fill="#7C3AED" opacity="0.6" />
      <path d="M2 11h20L12 23 2 11z" fill="#E91E8C" opacity="0.3" />
      <path d="M6 3l4 8H2l4-8zM18 3l-4 8h8l-4-8z" fill="white" opacity="0.25" />
    </svg>
  );
}

function formatGems(n: number) {
  return n.toLocaleString("fr-FR");
}

export default function Store({ showAll = false }: { showAll?: boolean }) {
  const t = useTranslations("store");
  const titleRef = useReveal();
  const goalRef = useReveal();
  const goalPercent = Math.min(100, (STORE_GOAL.current / STORE_GOAL.target) * 100);

  const packs = showAll ? GEM_PACKS : GEM_PACKS.slice(0, 3);

  return (
    <section className="py-20 bg-white" id="store">
      <div className="max-w-[1033px] mx-auto px-4">
        <div ref={titleRef} className="reveal text-center mb-10">
          <div className="section-badge">{t("label")}</div>
          <h2 className="text-[28px] sm:text-[32px] font-semibold mb-3">
            {t("title")} <span className="gradient-text">{t("titleHighlight")}</span>
          </h2>
          <p className="text-text-sub text-[15px] max-w-lg mx-auto">{t("subtitle")}</p>
        </div>

        {/* Monthly goal */}
        <div ref={goalRef} className="reveal mc-card p-5 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-pink" />
              <span className="text-[14px] font-semibold text-text">{t("goal")}</span>
              <span className="text-[12px] text-text-muted">{t("goalDesc")}</span>
            </div>
            <span className="text-[14px] font-bold text-text shrink-0">
              {STORE_GOAL.current} EUR <span className="text-text-muted font-normal">/ {STORE_GOAL.target} EUR</span>
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${goalPercent}%` }} />
          </div>
        </div>

        {/* Gem packs */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${showAll ? "" : "mb-8"}`}>
          {packs.map((pack, i) => (
              <RevealDiv
                key={pack.id}
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <div className={`mc-card overflow-hidden ${pack.popular ? "!border-pink" : ""}`}>
                  {pack.popular && (
                    <div className="bg-pink text-white text-center py-1.5 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                      <Zap size={12} />
                      {t("popular")}
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pack.popular ? "bg-pink-soft" : "bg-bg-soft"}`}>
                          <GemIcon size={24} />
                        </div>
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[20px] font-bold text-text">{formatGems(pack.gems)}</span>
                            {pack.bonus > 0 && (
                              <span className="text-[12px] font-semibold text-pink">+{formatGems(pack.bonus)}</span>
                            )}
                          </div>
                          <span className="text-[12px] text-text-muted">{t("gems")}</span>
                        </div>
                      </div>
                      {pack.gems >= 2500 && <Crown size={16} className="text-pink mt-1" />}
                    </div>

                    {pack.bonus > 0 && (
                      <div className="bg-bg-soft rounded-lg px-3 py-1.5 mb-4 inline-block">
                        <span className="text-[11px] font-semibold text-pink">
                          +{Math.round((pack.bonus / pack.gems) * 100)}% {t("bonus")}
                        </span>
                      </div>
                    )}

                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-[22px] font-bold text-text">{pack.price.toFixed(2)}</span>
                        <span className="text-[13px] text-text-muted ml-1">EUR</span>
                      </div>
                      <a
                        href={getTebexCheckoutUrl(pack)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-5 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${
                          pack.popular
                            ? "bg-pink text-white hover:bg-pink-hover"
                            : "bg-bg-soft text-text hover:bg-pink hover:text-white"
                        }`}
                      >
                        {t("buyNow")}
                      </a>
                    </div>
                  </div>
                </div>
              </RevealDiv>
          ))}
        </div>

        {/* See all link (only on homepage) */}
        {!showAll && (
          <div className="text-center">
            <Link href="/store" className="btn-ghost">
              {t("viewAll")}
              <ExternalLink size={14} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
