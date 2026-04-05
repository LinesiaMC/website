"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useReveal } from "@/lib/useReveal";
import { Copy, Check, Monitor, Smartphone, Gamepad, UserPlus } from "lucide-react";
import { useServerStatus } from "@/lib/useServerStatus";

type Platform = "pc" | "mobile" | "console";

export default function ServerJoin() {
  const t = useTranslations("server");
  const titleRef = useReveal();
  const contentRef = useReveal();
  const [platform, setPlatform] = useState<Platform>("pc");
  const [copied, setCopied] = useState(false);
  const { players, online } = useServerStatus();

  const copyIP = () => {
    navigator.clipboard.writeText("play.linesia.net");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const platforms = [
    { id: "pc" as const, icon: Monitor, label: t("platformPC") },
    { id: "mobile" as const, icon: Smartphone, label: t("platformMobile") },
    { id: "console" as const, icon: Gamepad, label: t("platformConsole") },
  ];

  const steps: Record<Platform, { num: string; title: string; desc: string }[]> = {
    pc: [
      { num: "1", title: t("pcStep1"), desc: t("pcStep1desc") },
      { num: "2", title: t("pcStep2"), desc: t("pcStep2desc") },
      { num: "3", title: t("pcStep3"), desc: t("pcStep3desc") },
    ],
    mobile: [
      { num: "1", title: t("mobileStep1"), desc: t("mobileStep1desc") },
      { num: "2", title: t("mobileStep2"), desc: t("mobileStep2desc") },
      { num: "3", title: t("mobileStep3"), desc: t("mobileStep3desc") },
    ],
    console: [
      { num: "1", title: t("consoleStep1"), desc: t("consoleStep1desc") },
      { num: "2", title: t("consoleStep2"), desc: t("consoleStep2desc") },
      { num: "3", title: t("consoleStep3"), desc: t("consoleStep3desc") },
    ],
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-[1033px] mx-auto px-4">
        <div ref={titleRef} className="reveal text-center mb-10">
          <div className="section-badge">{t("label")}</div>
          <h2 className="text-[28px] sm:text-[32px] font-semibold mb-3">{t("title")}</h2>
          <p className="text-text-sub text-[15px] max-w-lg mx-auto">{t("subtitle")}</p>
        </div>

        <div ref={contentRef} className="reveal max-w-[640px] mx-auto">
          {/* Platform tabs */}
          <div className="flex justify-center mb-6">
            <div className="tab-bar">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`tab-item ${platform === p.id ? "active" : ""}`}
                >
                  <p.icon size={16} />
                  <span className="hidden sm:inline">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content card */}
          <div className="mc-card p-6 sm:p-8">
            {/* IP */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <span className={online ? "online-dot" : "online-dot opacity-40"} />
                <span className="text-[13px] text-text-sub">
                  <span className="font-semibold text-text">{players}</span> {t("onlinePlayers")}
                </span>
              </div>
              <button onClick={copyIP} className="ip-pill">
                <span>play.linesia.net</span>
                {copied ? <Check size={16} className="text-green" /> : <Copy size={16} className="text-text-muted" />}
              </button>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {steps[platform].map((step) => (
                <div key={step.num} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-bg-soft flex items-center justify-center shrink-0">
                    <span className="text-[13px] font-bold text-text-sub">{step.num}</span>
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-text">{step.title}</h4>
                    <p className="text-[13px] text-text-sub mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Console special note */}
            {platform === "console" && (
              <div className="mt-6 bg-pink-soft rounded-xl p-4 flex items-start gap-3">
                <UserPlus size={18} className="text-pink shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-text">{t("consoleNote")}</p>
                  <p className="text-[12px] text-text-sub mt-1">{t("consoleNoteDesc")}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
