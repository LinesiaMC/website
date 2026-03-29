"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Calendar, ArrowLeft, Newspaper } from "lucide-react";
import { Link } from "@/i18n/routing";

interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  locale: string;
}

export default function ArticleContent({ article }: { article: Article }) {
  const t = useTranslations("news");

  return (
    <div className="max-w-[720px] mx-auto px-4">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/news"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-text-sub hover:text-pink transition-colors mb-8"
        >
          <ArrowLeft size={14} />
          {t("back")}
        </Link>
      </motion.div>

      {/* Article header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Image placeholder */}
        <div className="h-48 sm:h-64 bg-bg-soft rounded-2xl flex items-center justify-center mb-8 border border-border">
          <Newspaper size={40} className="text-text-muted" />
        </div>

        <div className="flex items-center gap-3 text-[13px] text-text-muted mb-4">
          <Calendar size={14} />
          <span>{article.date}</span>
        </div>

        <h1 className="text-[28px] sm:text-[36px] font-bold text-text leading-tight mb-4">
          {article.title}
        </h1>

        <p className="text-[16px] text-text-sub mb-8 leading-relaxed font-medium">
          {article.excerpt}
        </p>
      </motion.div>

      {/* Article body */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="border-t border-border pt-8"
      >
        <div className="text-[15px] text-text-sub leading-[1.8] whitespace-pre-line">
          {article.content}
        </div>
      </motion.div>

      {/* Back to news */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-12 pt-8 border-t border-border"
      >
        <Link href="/news" className="btn-ghost">
          <ArrowLeft size={14} />
          {t("back")}
        </Link>
      </motion.div>
    </div>
  );
}
