"use client";

import { useTranslations } from "next-intl";
import { useReveal, RevealDiv } from "@/lib/useReveal";
import { Star, Zap, Crown } from "lucide-react";
import { GEM_PACKS, STORE_GOAL, getTebexCheckoutUrl } from "@/lib/store-config";

function formatGems(n: number) {
  return n.toLocaleString("fr-FR");
}

export default function Store() {
  const t = useTranslations("store");
  const titleRef = useReveal();
  const goalRef = useReveal();
  const goalPercent = Math.min(100, (STORE_GOAL.current / STORE_GOAL.target) * 100);

  return (
    <section className="py-20 bg-bg-soft" id="store">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GEM_PACKS.map((pack, i) => (
            <RevealDiv
              key={pack.id}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className={`mc-card overflow-hidden h-full flex flex-col ${pack.popular ? "!border-pink !shadow-[0_4px_24px_rgba(142,45,226,0.12)]" : ""}`}>
                {pack.popular && (
                  <div className="bg-pink text-white text-center py-1.5 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <Zap size={12} />
                    {t("popular")}
                  </div>
                )}

                {/* Gem image */}
                <div className={`flex items-center justify-center py-6 ${pack.popular ? "bg-pink-soft/40" : "bg-bg-soft/50"}`}>
                  <img
                    src={pack.image}
                    alt={`${formatGems(pack.gems)} gemmes`}
                    className="w-24 h-24 object-contain drop-shadow-lg"
                  />
                </div>

                <div className="p-5 flex flex-col flex-1">
                  {/* Gems amount */}
                  <div className="text-center mb-3">
                    <div className="flex items-baseline justify-center gap-1.5">
                      <span className="text-[24px] font-bold text-text">{formatGems(pack.gems)}</span>
                      {pack.bonus > 0 && (
                        <span className="text-[13px] font-semibold text-pink">+{formatGems(pack.bonus)}</span>
                      )}
                    </div>
                    <span className="text-[12px] text-text-muted">{t("gems")}</span>
                  </div>

                  {/* Bonus badge */}
                  {pack.bonus > 0 && (
                    <div className="text-center mb-4">
                      <span className="inline-block bg-pink-soft rounded-full px-3 py-1 text-[11px] font-semibold text-pink">
                        +{Math.round((pack.bonus / pack.gems) * 100)}% {t("bonus")}
                      </span>
                    </div>
                  )}

                  <div className="mt-auto">
                    {/* Price */}
                    <div className="text-center mb-4">
                      <span className="text-[28px] font-bold text-text">{pack.price.toFixed(2)}</span>
                      <span className="text-[14px] text-text-muted ml-1">EUR</span>
                    </div>

                    {/* CTA */}
                    <a
                      href={getTebexCheckoutUrl(pack)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block w-full text-center px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                        pack.popular
                          ? "bg-pink text-white hover:bg-pink-hover shadow-[0_4px_12px_rgba(142,45,226,0.25)]"
                          : "bg-bg-soft text-text hover:bg-pink hover:text-white"
                      }`}
                    >
                      {t("buyNow")}
                    </a>
                  </div>
                </div>

                {pack.gems >= 3500 && (
                  <div className="absolute top-3 right-3">
                    <Crown size={16} className="text-pink" />
                  </div>
                )}
              </div>
            </RevealDiv>
          ))}
        </div>
      </div>
    </section>
  );
}
