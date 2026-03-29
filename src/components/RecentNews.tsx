"use client";

import { useTranslations } from "next-intl";
import { useReveal, RevealDiv } from "@/lib/useReveal";
import { Calendar, ArrowRight, Newspaper } from "lucide-react";
import { Link } from "@/i18n/routing";

interface Article {
  id: string;
  title: string;
  excerpt: string;
  date: string;
}

export default function RecentNews({ articles }: { articles: Article[] }) {
  const t = useTranslations("news");
  const titleRef = useReveal();

  if (articles.length === 0) return null;

  return (
    <section className="py-20 bg-bg-soft">
      <div className="max-w-[1033px] mx-auto px-4">
        <div ref={titleRef} className="reveal text-center mb-12">
          <div className="section-badge">{t("label")}</div>
          <h2 className="text-[28px] sm:text-[32px] font-semibold mb-3">{t("title")}</h2>
          <p className="text-text-sub text-[15px] max-w-lg mx-auto">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {articles.slice(0, 3).map((article, i) => (
            <RevealDiv key={article.id} style={{ transitionDelay: `${i * 60}ms` }}>
              <Link
                href={`/news/${article.id}`}
                className="mc-card overflow-hidden group block h-full"
              >
                <div className="h-36 bg-bg-soft flex items-center justify-center">
                  <Newspaper size={28} className="text-text-muted" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-[11px] text-text-muted mb-2.5">
                    <Calendar size={11} />
                    <span>{article.date}</span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-text mb-2 group-hover:text-pink transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-[13px] text-text-sub line-clamp-2 mb-3">{article.excerpt}</p>
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-pink font-medium group-hover:gap-2.5 transition-all">
                    {t("readMore")}
                    <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            </RevealDiv>
          ))}
        </div>

        <div className="text-center">
          <Link href="/news" className="btn-ghost">
            {t("viewAll")}
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
