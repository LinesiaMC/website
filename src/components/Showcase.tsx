"use client";

import { useTranslations } from "next-intl";
import { useReveal, RevealDiv } from "@/lib/useReveal";

export default function Showcase() {
  const t = useTranslations("showcase");
  const titleRef = useReveal();

  const items = [
    {
      src: "/images/is.jpg",
      title: t("islands"),
      desc: t("islandsDesc"),
      tall: true,
    },
    {
      src: "/images/farm.jpg",
      title: t("farm"),
      desc: t("farmDesc"),
      tall: false,
    },
    {
      src: "/images/warzone.png",
      title: t("warzone"),
      desc: t("warzoneDesc"),
      tall: false,
    },
    {
      src: "/images/kitfffa.jpg",
      title: t("kitffa"),
      desc: t("kitffaDesc"),
      tall: true,
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-[1033px] mx-auto px-4">
        <div ref={titleRef} className="reveal text-center mb-12">
          <div className="section-badge">{t("label")}</div>
          <h2 className="text-[28px] sm:text-[32px] font-semibold mb-3">
            {t("title")} <span className="gradient-text">{t("titleHighlight")}</span>
          </h2>
          <p className="text-text-sub text-[15px] max-w-lg mx-auto">{t("subtitle")}</p>
        </div>

        {/* Bento grid: 2 columns, alternating tall/short */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left column */}
          <div className="flex flex-col gap-4">
            <ShowcaseCard item={items[0]} delay={0} />
            <ShowcaseCard item={items[1]} delay={100} />
          </div>
          {/* Right column */}
          <div className="flex flex-col gap-4">
            <ShowcaseCard item={items[2]} delay={50} />
            <ShowcaseCard item={items[3]} delay={150} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ShowcaseCard({ item, delay }: { item: { src: string; title: string; desc: string; tall: boolean }; delay: number }) {
  return (
    <RevealDiv
      className="group relative rounded-2xl overflow-hidden border border-border shadow-[0_2px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(142,45,226,0.10)] transition-shadow duration-300"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <img
        src={item.src}
        alt={item.title}
        className={`w-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ${
          item.tall ? "h-[260px] sm:h-[320px]" : "h-[200px] sm:h-[240px]"
        }`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
        <h3 className="text-white font-bold text-[18px] sm:text-[20px] mb-1">{item.title}</h3>
        <p className="text-white/80 text-[13px] sm:text-[14px] leading-relaxed">{item.desc}</p>
      </div>
    </RevealDiv>
  );
}
