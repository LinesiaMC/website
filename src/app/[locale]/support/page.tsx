"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { LifeBuoy, Send, Search, ShoppingBag, RefreshCcw, Shield, Flag, HelpCircle } from "lucide-react";
import { CATEGORY_LABELS, TicketCategory } from "@/lib/tickets";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PUBLIC_CATEGORIES: { key: TicketCategory; icon: typeof ShoppingBag; desc: { fr: string; en: string } }[] = [
  { key: "purchase", icon: ShoppingBag, desc: { fr: "Question sur un achat en boutique", en: "Question about a store purchase" } },
  { key: "refund",   icon: RefreshCcw,  desc: { fr: "Demande de remboursement",          en: "Refund request" } },
  { key: "report",   icon: Flag,        desc: { fr: "Signaler un joueur ou un bug",      en: "Report a player or bug" } },
  { key: "other",    icon: HelpCircle,  desc: { fr: "Autre demande",                     en: "Other request" } },
];

export default function SupportPage() {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [step, setStep] = useState<"choose" | "form">("choose");
  const [category, setCategory] = useState<TicketCategory>("purchase");
  const [playerName, setPlayerName] = useState("");
  const [contact, setContact] = useState("");
  const [subject, setSubject] = useState("");
  const [reason, setReason] = useState("");
  const [proof, setProof] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [lookup, setLookup] = useState("");

  useEffect(() => {
    fetch("/api/account/me").then((r) => r.json()).then((j) => {
      if (j.account) {
        setPlayerName(j.account.linkedPlayerName || j.account.microsoftGamertag || "");
      }
    }).catch(() => {});
  }, []);

  const submit = async () => {
    setError("");
    if (!playerName.trim() || !subject.trim() || !reason.trim()) {
      setError(locale === "fr" ? "Pseudo, sujet et raison sont obligatoires." : "Name, subject and reason are required.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/tickets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: playerName.trim(), contact: contact.trim() || null, category,
        subject: subject.trim(), reason: reason.trim(), proof: proof.trim() || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Erreur");
      setSubmitting(false);
      return;
    }
    const t = await res.json();
    router.push(`/${locale}/support/${t.code}`);
  };

  return (
    <main>
      <Navbar />
    <div className="min-h-screen bg-bg-soft pt-[110px] pb-16 px-4">
      <div className="max-w-[720px] mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-pink/10 flex items-center justify-center mx-auto mb-3">
            <LifeBuoy size={26} className="text-pink" />
          </div>
          <h1 className="text-2xl font-bold text-text mb-1">{locale === "fr" ? "Support Linesia" : "Linesia Support"}</h1>
          <p className="text-[13px] text-text-sub">
            {locale === "fr" ? "Une question ? Un problème ? Ouvre un ticket, le staff répond." : "A question or problem? Open a ticket and our staff will help."}
          </p>
        </div>

        <div className="mc-card p-5 mb-6">
          <h2 className="text-[13px] font-bold text-text mb-2">{locale === "fr" ? "Retrouver un ticket" : "Find a ticket"}</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (lookup.trim()) router.push(`/${locale}/support/${lookup.trim().toUpperCase()}`); }}
            className="flex gap-2">
            <input value={lookup} onChange={(e) => setLookup(e.target.value)}
              placeholder={locale === "fr" ? "Code (ex: LIN-AB23CD)" : "Code (e.g. LIN-AB23CD)"}
              className="flex-1 px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] font-mono focus:border-pink focus:outline-none" />
            <button type="submit" className="btn-primary !py-2 !px-4 !text-[13px]"><Search size={13} />{locale === "fr" ? "Ouvrir" : "Open"}</button>
          </form>
        </div>

        {step === "choose" ? (
          <div className="mc-card p-6">
            <h2 className="text-[15px] font-bold text-text mb-4">{locale === "fr" ? "Choisissez une catégorie" : "Choose a category"}</h2>
            <div className="grid grid-cols-2 gap-3">
              {PUBLIC_CATEGORIES.map(({ key, icon: Icon, desc }) => (
                <button key={key} onClick={() => { setCategory(key); setStep("form"); }}
                  className="p-4 rounded-xl border-2 border-border hover:border-pink hover:bg-pink/5 transition-colors text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={16} className="text-pink" />
                    <span className="text-[14px] font-bold text-text">{CATEGORY_LABELS[key].fr}</span>
                  </div>
                  <p className="text-[12px] text-text-sub">{desc[locale as "fr" | "en"] || desc.fr}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mc-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Shield size={16} className="text-pink" />
              <h2 className="text-[15px] font-bold text-text">{locale === "fr" ? "Ouvrir un ticket" : "Open a ticket"}</h2>
              <span className="text-[12px] text-text-muted">· {CATEGORY_LABELS[category].fr}</span>
              <button onClick={() => setStep("choose")} className="ml-auto text-[12px] text-text-sub hover:text-pink underline">
                {locale === "fr" ? "Changer" : "Change"}
              </button>
            </div>

            {error && <p className="text-red-500 text-[13px] mb-3">{error}</p>}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label={locale === "fr" ? "Pseudo Minecraft *" : "Minecraft name *"}>
                  <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={60}
                    className="w-full px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none" />
                </Field>
                <Field label={locale === "fr" ? "Contact (Discord / email)" : "Contact (Discord / email)"}>
                  <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120}
                    placeholder="user#1234 / mail@..." className="w-full px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none" />
                </Field>
              </div>
              <Field label={locale === "fr" ? "Sujet *" : "Subject *"}>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120}
                  placeholder={locale === "fr" ? "Courte description" : "Short description"}
                  className="w-full px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none" />
              </Field>
              <Field label={locale === "fr" ? "Raison / détails *" : "Reason / details *"}>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={6} maxLength={4000}
                  placeholder={locale === "fr" ? "Explique ton problème en détail..." : "Explain your problem in detail..."}
                  className="w-full px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none resize-y" />
              </Field>
              <Field label={locale === "fr" ? "Preuve (URL : capture, vidéo, Tebex...)" : "Proof (URL: screenshot, video, Tebex...)"}>
                <input value={proof} onChange={(e) => setProof(e.target.value)} maxLength={500}
                  placeholder="https://imgur.com/..." className="w-full px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none" />
              </Field>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Link href={`/${locale}`} className="text-[13px] text-text-sub hover:text-pink">{locale === "fr" ? "Annuler" : "Cancel"}</Link>
              <button onClick={submit} disabled={submitting} className="btn-primary !py-2.5 !px-5 !text-[13px] disabled:opacity-50">
                <Send size={14} />{locale === "fr" ? "Créer le ticket" : "Create ticket"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
      <Footer />
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-text-sub mb-1 block uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}
