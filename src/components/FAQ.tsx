"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useReveal, RevealDiv } from "@/lib/useReveal";
import { Plus, Minus } from "lucide-react";

export default function FAQ() {
  const t = useTranslations("faq");
  const titleRef = useReveal();
  const [open, setOpen] = useState<number | null>(null);

  const questions = [
    { q: t("q1"), a: t("a1") },
    { q: t("q2"), a: t("a2") },
    { q: t("q3"), a: t("a3") },
    { q: t("q4"), a: t("a4") },
    { q: t("q5"), a: t("a5") },
  ];

  return (
    <section className="py-20 bg-bg-soft">
      <div className="max-w-[640px] mx-auto px-4">
        <div ref={titleRef} className="reveal text-center mb-10">
          <div className="section-badge">FAQ</div>
          <h2 className="text-[28px] sm:text-[32px] font-semibold">
            {t("title")} <span className="gradient-text">{t("titleHighlight")}</span>
          </h2>
        </div>

        <div className="space-y-3">
          {questions.map((item, i) => {
            const isOpen = open === i;
            return (
              <RevealDiv key={i} style={{ transitionDelay: `${i * 40}ms` }}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className={`w-full mc-card !rounded-2xl px-5 py-4 flex items-center justify-between text-left ${
                    isOpen ? "!border-pink !shadow-[0_4px_20px_rgba(233,30,140,0.06)]" : ""
                  }`}
                >
                  <span className="font-medium text-[14px] text-text pr-4">{item.q}</span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isOpen ? "bg-pink" : "bg-bg-soft"
                  }`}>
                    {isOpen
                      ? <Minus size={14} className="text-white" />
                      : <Plus size={14} className="text-text-sub" />
                    }
                  </div>
                </button>
                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{ maxHeight: isOpen ? "200px" : "0px", opacity: isOpen ? 1 : 0 }}
                >
                  <div className="px-5 py-3 text-[13px] text-text-sub leading-relaxed">
                    {item.a}
                  </div>
                </div>
              </RevealDiv>
            );
          })}
        </div>
      </div>
    </section>
  );
}
