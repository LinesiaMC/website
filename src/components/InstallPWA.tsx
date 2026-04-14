"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Download, Share, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPWA({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister().catch(() => {}));
      }).catch(() => {});
    }

    const ua = window.navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
    if (iOS && isSafari) setIsIOSSafari(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setIosHint(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!deferred && !isIOSSafari) return null;

  const fr = locale === "fr";
  const label = fr ? "Installer" : "Install";

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    if (isIOSSafari) setIosHint(true);
  };

  return (
    <>
      <button
        onClick={onClick}
        title={fr ? "Installer l'application" : "Install app"}
        className={
          compact
            ? "inline-flex items-center gap-1.5 px-2.5 py-2 rounded-[10px] border border-border bg-white text-text-sub hover:border-pink hover:text-pink transition-colors"
            : "inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] border border-border bg-white text-[13px] font-medium text-text-sub hover:border-pink hover:text-pink transition-colors"
        }
      >
        <Download size={13} />
        {!compact && <span className="hidden sm:inline">{label}</span>}
      </button>

      <AnimatePresence>
        {iosHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center p-4"
            onClick={() => setIosHint(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl border border-border max-w-sm w-full p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-[16px] font-semibold text-text">
                  {fr ? "Installer Linesia" : "Install Linesia"}
                </h3>
                <button onClick={() => setIosHint(false)} className="text-text-muted">
                  <X size={18} />
                </button>
              </div>
              <ol className="space-y-3">
                <li className="flex items-start gap-3 text-[13px] text-text-sub">
                  <span className="shrink-0 w-7 h-7 rounded-lg bg-bg-soft flex items-center justify-center text-text"><Share size={14} /></span>
                  <span className="pt-1">{fr ? <>Appuyez sur <b>Partager</b> dans Safari.</> : <>Tap <b>Share</b> in Safari.</>}</span>
                </li>
                <li className="flex items-start gap-3 text-[13px] text-text-sub">
                  <span className="shrink-0 w-7 h-7 rounded-lg bg-bg-soft flex items-center justify-center text-text"><Plus size={14} /></span>
                  <span className="pt-1">{fr ? <>Sélectionnez <b>Sur l&apos;écran d&apos;accueil</b>.</> : <>Select <b>Add to Home Screen</b>.</>}</span>
                </li>
              </ol>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
