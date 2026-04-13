"use client";

import { useTranslations } from "next-intl";
import { useReveal } from "@/lib/useReveal";
import { ShoppingBag } from "lucide-react";

export default function StoreTeaser() {
  const t = useTranslations("storeTeaser");
  const ref = useReveal();

  return (
    <section className="py-20 bg-white">
      <div className="max-w-[1033px] mx-auto px-4">
        <div ref={ref} className="reveal mc-card overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-8 p-8 sm:p-10">
            {/* Gem images */}
            <div className="flex items-center gap-[-8px] shrink-0">
              <img src="/images/gems1.png" alt="" className="w-16 h-16 object-contain -mr-2 drop-shadow-lg" />
              <img src="/images/gems2.png" alt="" className="w-20 h-20 object-contain z-10 drop-shadow-lg" />
              <img src="/images/gems3.png" alt="" className="w-16 h-16 object-contain -ml-2 drop-shadow-lg" />
            </div>

            {/* Text */}
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-[22px] sm:text-[26px] font-bold text-text mb-2">
                {t("title")} <span className="gradient-text">{t("titleHighlight")}</span>
              </h3>
              <p className="text-[14px] text-text-sub leading-relaxed max-w-md">
                {t("desc")}
              </p>
            </div>

            {/* CTA */}
            <a
              href="https://store.linesia.net"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary !px-8 !py-3 shrink-0"
            >
              <ShoppingBag size={18} />
              {t("cta")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
