"use client";

import { useTranslations } from "next-intl";
import { useReveal } from "@/lib/useReveal";
import { Swords, Shield, Snowflake, Trophy, TrendingUp, Users } from "lucide-react";

function FeatureCard({ icon: Icon, title, desc, delay }: { icon: typeof Swords; title: string; desc: string; delay: number }) {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className="reveal mc-card p-6 group"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="w-10 h-10 rounded-xl bg-bg-soft flex items-center justify-center mb-4 group-hover:bg-pink-soft transition-colors">
        <Icon size={18} className="text-text-sub group-hover:text-pink transition-colors" />
      </div>
      <h3 className="text-[15px] font-semibold text-text mb-2">{title}</h3>
      <p className="text-[13px] text-text-sub leading-relaxed">{desc}</p>
    </div>
  );
}

export default function Features() {
  const t = useTranslations("features");
  const titleRef = useReveal();

  const features = [
    { icon: Swords, title: t("pvp.title"), desc: t("pvp.desc") },
    { icon: Shield, title: t("factions.title"), desc: t("factions.desc") },
    { icon: Snowflake, title: t("dimensions.title"), desc: t("dimensions.desc") },
    { icon: Trophy, title: t("events.title"), desc: t("events.desc") },
    { icon: TrendingUp, title: t("progression.title"), desc: t("progression.desc") },
    { icon: Users, title: t("community.title"), desc: t("community.desc") },
  ];

  return (
    <section className="py-20 bg-bg-soft">
      <div className="max-w-[1033px] mx-auto px-4">
        <div ref={titleRef} className="reveal text-center mb-12">
          <div className="section-badge">{t("label")}</div>
          <h2 className="text-[28px] sm:text-[32px] font-semibold mb-3">
            {t("title")} <span className="gradient-text">{t("titleHighlight")}</span>
          </h2>
          <p className="text-text-sub text-[15px] max-w-lg mx-auto">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} delay={i * 50} />
          ))}
        </div>
      </div>
    </section>
  );
}
