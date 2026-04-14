"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Users, Clock, ChevronDown, Check } from "lucide-react";
import { useServerStatus } from "@/lib/useServerStatus";
import { launchMinecraft } from "@/lib/playMinecraft";

export default function Hero() {
  const t = useTranslations("hero");
  const locale = useLocale();
  const { players, online } = useServerStatus();
  const [toast, setToast] = useState<string | null>(null);

  const onPlay = async () => {
    const r = await launchMinecraft(locale);
    if (r === "copied") {
      setToast(locale === "fr" ? "IP copiée : play.linesia.net" : "IP copied: play.linesia.net");
      setTimeout(() => setToast(null), 2500);
    } else if (r === "error") {
      setToast(locale === "fr" ? "Copiez : play.linesia.net" : "Copy: play.linesia.net");
      setTimeout(() => setToast(null), 2500);
    }
  };

  return (
    <section className="pt-32 pb-20 bg-white">
      <div className="max-w-[1033px] mx-auto px-4 text-center">
        {/* Online badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-bg-soft border border-border rounded-full px-4 py-2 mb-8"
        >
          <span className={online ? "online-dot" : "online-dot opacity-40"} />
          <span className="text-[13px] text-text-sub">
            <span className="font-semibold text-text">{players}</span> {t("players")}
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-[40px] sm:text-[52px] lg:text-[60px] font-extrabold leading-[1.08] tracking-tight mb-5"
        >
          {t("title")}{" "}
          <span className="gradient-text">{t("titleHighlight")}</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-[16px] text-text-sub max-w-[540px] mx-auto leading-relaxed mb-10"
        >
          {t("subtitle")}
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-3 justify-center mb-14"
        >
          <button onClick={onPlay} className="btn-primary !px-8 !py-3">
            <Gamepad2 size={18} />
            {t("play")}
          </button>
          <a
            href="https://discord.gg/linesia"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-discord !px-8 !py-3"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z"/></svg>
            Discord
          </a>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-8 sm:gap-16"
        >
          {[
            { icon: Users, value: "25,000+", label: t("uniquePlayers") },
            { icon: Gamepad2, value: "+100", label: t("dailyPlayers") },
            { icon: Clock, value: "99.9%", label: t("uptime") },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-[28px] sm:text-[32px] font-bold text-text">{stat.value}</p>
              <p className="text-[12px] text-text-muted font-medium uppercase tracking-wide">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12"
        >
          <ChevronDown size={24} className="mx-auto text-text-muted animate-bounce [animation-duration:1.5s]" />
        </motion.div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-text text-white text-[13px] font-medium rounded-full px-4 py-2.5 shadow-lg flex items-center gap-2"
          >
            <Check size={14} className="text-green" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
