"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Download, Share, X, Plus, MoreVertical } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "android-chrome" | "ios-safari" | "ios-other" | "desktop-chromium" | "desktop-safari" | "desktop-firefox" | "other";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "other";
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints! > 1);
  const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
  const isFirefox = /firefox|fxios/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isChromium = /chrome|crios|edg|edgios|opr/i.test(ua);

  if (iOS) return isSafari ? "ios-safari" : "ios-other";
  if (isAndroid) return "android-chrome";
  if (isFirefox) return "desktop-firefox";
  if (isSafari) return "desktop-safari";
  if (isChromium) return "desktop-chromium";
  return "other";
}

export default function InstallPWA({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) setInstalled(true);

    setPlatform(detectPlatform());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setOpen(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const fr = locale === "fr";
  const label = fr ? "Installer" : "Install";

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        onClick={onClick}
        title={fr ? "Ajouter à l'écran d'accueil" : "Add to home screen"}
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
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center p-4"
            onClick={() => setOpen(false)}
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
                <button onClick={() => setOpen(false)} className="text-text-muted">
                  <X size={18} />
                </button>
              </div>
              <InstructionsFor platform={platform} fr={fr} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function InstructionsFor({ platform, fr }: { platform: Platform; fr: boolean }) {
  const steps: { icon: React.ReactNode; text: React.ReactNode }[] =
    platform === "ios-safari"
      ? [
          { icon: <Share size={14} />, text: fr ? <>Appuyez sur le bouton <b>Partager</b> en bas de Safari.</> : <>Tap the <b>Share</b> button at the bottom of Safari.</> },
          { icon: <Plus size={14} />, text: fr ? <>Sélectionnez <b>Sur l&apos;écran d&apos;accueil</b>.</> : <>Select <b>Add to Home Screen</b>.</> },
          { icon: <Download size={14} />, text: fr ? <>Confirmez avec <b>Ajouter</b>.</> : <>Confirm with <b>Add</b>.</> },
        ]
      : platform === "ios-other"
      ? [
          { icon: <Share size={14} />, text: fr ? <>Ouvrez ce site dans <b>Safari</b> (l&apos;installation PWA n&apos;est pas disponible dans ce navigateur sur iOS).</> : <>Open this site in <b>Safari</b> (PWA install is unavailable in this browser on iOS).</> },
          { icon: <Plus size={14} />, text: fr ? <>Puis utilisez <b>Partager → Sur l&apos;écran d&apos;accueil</b>.</> : <>Then use <b>Share → Add to Home Screen</b>.</> },
        ]
      : platform === "android-chrome"
      ? [
          { icon: <MoreVertical size={14} />, text: fr ? <>Ouvrez le menu <b>⋮</b> en haut à droite.</> : <>Open the <b>⋮</b> menu at the top right.</> },
          { icon: <Download size={14} />, text: fr ? <>Choisissez <b>Installer l&apos;application</b> ou <b>Ajouter à l&apos;écran d&apos;accueil</b>.</> : <>Choose <b>Install app</b> or <b>Add to Home screen</b>.</> },
        ]
      : platform === "desktop-chromium"
      ? [
          { icon: <Download size={14} />, text: fr ? <>Cliquez sur l&apos;icône <b>Installer</b> à droite de la barre d&apos;adresse.</> : <>Click the <b>Install</b> icon on the right of the address bar.</> },
          { icon: <MoreVertical size={14} />, text: fr ? <>Ou via le menu <b>⋮ → Installer Linesia</b>.</> : <>Or via menu <b>⋮ → Install Linesia</b>.</> },
        ]
      : platform === "desktop-safari"
      ? [
          { icon: <Share size={14} />, text: fr ? <>Dans la barre d&apos;outils Safari, cliquez sur <b>Partager</b>.</> : <>In the Safari toolbar, click <b>Share</b>.</> },
          { icon: <Plus size={14} />, text: fr ? <>Sélectionnez <b>Ajouter au Dock</b>.</> : <>Select <b>Add to Dock</b>.</> },
        ]
      : platform === "desktop-firefox"
      ? [
          { icon: <Download size={14} />, text: fr ? <>Firefox ne propose pas l&apos;installation PWA sur ordinateur.</> : <>Firefox does not support PWA install on desktop.</> },
          { icon: <Plus size={14} />, text: fr ? <>Créez un raccourci via <b>Menu → Plus d&apos;outils → Créer un raccourci</b> ou utilisez Chrome/Edge/Safari.</> : <>Create a shortcut via <b>Menu → More tools → Create shortcut</b>, or use Chrome/Edge/Safari.</> },
        ]
      : [
          { icon: <Download size={14} />, text: fr ? <>Ouvrez le menu de votre navigateur et cherchez <b>Installer l&apos;application</b> ou <b>Ajouter à l&apos;écran d&apos;accueil</b>.</> : <>Open your browser menu and look for <b>Install app</b> or <b>Add to Home screen</b>.</> },
        ];

  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-3 text-[13px] text-text-sub leading-relaxed">
          <span className="shrink-0 w-7 h-7 rounded-lg bg-bg-soft flex items-center justify-center text-text">{s.icon}</span>
          <span className="pt-1">{s.text}</span>
        </li>
      ))}
    </ol>
  );
}
