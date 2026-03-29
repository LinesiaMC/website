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

export default function NewsContent({ articles }: { articles: Article[] }) {
  const t = useTranslations("news");
  const titleRef = useReveal();

  return (
    <div className="max-w-[1033px] mx-auto px-4">
      <div ref={titleRef} className="reveal text-center mb-10">
        <div className="section-badge">{t("label")}</div>
        <h1 className="text-[28px] sm:text-[36px] font-bold mb-3">
          <span className="gradient-text">{t("title")}</span>
        </h1>
        <p className="text-text-sub text-[15px]">{t("subtitle")}</p>
      </div>

      {articles.length === 0 ? (
        <div className="mc-card p-16 text-center">
          <Newspaper size={36} className="text-text-muted mx-auto mb-3" />
          <p className="text-[15px] text-text-sub">{t("noArticles")}</p>
          <p className="text-[13px] text-text-muted mt-1">{t("noArticlesDesc")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article, i) => (
            <RevealDiv key={article.id} style={{ transitionDelay: `${i * 50}ms` }}>
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
      )}
    </div>
  );
}
