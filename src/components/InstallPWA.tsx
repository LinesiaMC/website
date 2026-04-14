"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Download, Share, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPWA({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) setInstalled(true);

    const ua = window.navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(iOS);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const canPrompt = deferred !== null;
  const canShow = canPrompt || isIOS;
  if (!canShow) return null;

  const label = locale === "fr" ? "Installer" : "Install";

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    if (isIOS) setShowIOSHint(true);
  };

  return (
    <>
      <button
        onClick={onClick}
        title={locale === "fr" ? "Ajouter à l'écran d'accueil" : "Add to home screen"}
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
        {showIOSHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowIOSHint(false)}
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
                  {locale === "fr" ? "Installer Linesia" : "Install Linesia"}
                </h3>
                <button onClick={() => setShowIOSHint(false)} className="text-text-muted">
                  <X size={18} />
                </button>
              </div>
              <p className="text-[13px] text-text-sub leading-relaxed">
                {locale === "fr" ? (
                  <>
                    Dans Safari, appuyez sur <Share size={13} className="inline mx-1" />
                    puis sur <b>Sur l&apos;écran d&apos;accueil</b>.
                  </>
                ) : (
                  <>
                    In Safari, tap <Share size={13} className="inline mx-1" />
                    then <b>Add to Home Screen</b>.
                  </>
                )}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
