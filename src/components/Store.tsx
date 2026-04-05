"use client";

import { useState, useEffect } from "react";
import { useReveal, RevealDiv } from "@/lib/useReveal";
import {
  Star,
  Gem,
  ShieldCheck,
  MessageCircle,
  Trophy,
  Gift,
  ChevronRight,
  User,
  Heart,
  Target,
  Info,
} from "lucide-react";
import {
  GEM_PACKS,
  COMMUNITY_GOAL,
  getTebexCheckoutUrl,
  TEBEX_STORE_URL,
} from "@/lib/store-config";

function formatGems(n: number) {
  return n.toLocaleString("fr-FR");
}

function formatPrice(n: number) {
  return n.toFixed(2).replace(".", ",");
}

function savings(original: number, price: number) {
  return Math.round(((original - price) / original) * 100);
}

interface Supporter {
  username: string;
  total: number;
}

export default function Store() {
  const titleRef = useReveal();
  const goalRef = useReveal();
  const parentRef = useReveal();
  const supportersRef = useReveal();
  const helpRef = useReveal();

  const [username, setUsername] = useState("");
  const [usernameConfirmed, setUsernameConfirmed] = useState(false);
  const [supporters, setSupporters] = useState<Supporter[]>([]);

  const goalPercent = Math.min(
    100,
    (COMMUNITY_GOAL.current / COMMUNITY_GOAL.target) * 100
  );

  // Fetch top supporters
  useEffect(() => {
    fetch("/api/tebex?type=top-supporters")
      .then((r) => r.json())
      .then((d) => {
        if (d.supporters) setSupporters(d.supporters);
      })
      .catch(() => {});
  }, []);

  function handleBuy(packId: string) {
    const pack = GEM_PACKS.find((p) => p.id === packId);
    if (!pack) return;
    const url = getTebexCheckoutUrl(pack, usernameConfirmed ? username : undefined);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="py-16 bg-bg-soft" id="store">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div ref={titleRef} className="reveal text-center mb-10">
          <div className="section-badge">Boutique</div>
          <h1 className="text-[32px] sm:text-[40px] font-bold mb-3">
            Boutique <span className="gradient-text">Linesia</span>
          </h1>
          <p className="text-text-sub text-[15px] max-w-xl mx-auto">
            Soutenez le serveur et obtenez des Gems pour débloquer du contenu
            exclusif. Chaque achat aide Linesia à grandir !
          </p>
        </div>

        {/* ============ USERNAME INPUT ============ */}
        <RevealDiv>
          <div className="mc-card p-5 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <User size={18} className="text-pink" />
                <span className="text-[14px] font-semibold text-text">
                  Ton pseudo Minecraft
                </span>
              </div>
              <div className="flex flex-1 w-full gap-2">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameConfirmed(false);
                  }}
                  placeholder="Entre ton pseudo..."
                  className="flex-1 bg-bg-soft border border-border rounded-xl px-4 py-2.5 text-[14px] text-text placeholder:text-text-muted outline-none focus:border-pink focus:ring-2 focus:ring-pink/20 transition-all"
                />
                <button
                  onClick={() => {
                    if (username.trim().length >= 3) setUsernameConfirmed(true);
                  }}
                  disabled={username.trim().length < 3}
                  className="btn-primary !py-2.5 !px-5 !text-[13px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirmer
                </button>
              </div>
            </div>
            {usernameConfirmed && (
              <div className="mt-2 flex items-center gap-1.5 text-green text-[13px] font-medium">
                <ShieldCheck size={14} />
                Les Gems seront envoyées à <strong>{username}</strong>
              </div>
            )}
            {!usernameConfirmed && (
              <p className="mt-2 text-[12px] text-text-muted">
                Entre ton pseudo pour que les Gems soient directement ajoutées à
                ton compte en jeu.
              </p>
            )}
          </div>
        </RevealDiv>

        {/* ============ GEM PACKS ============ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {GEM_PACKS.map((pack, i) => {
            const isPopular = pack.highlight;
            const hasSaving = pack.originalPrice && pack.originalPrice > pack.price;
            const savingPct = hasSaving
              ? savings(pack.originalPrice!, pack.price)
              : 0;

            return (
              <RevealDiv key={pack.id} style={{ transitionDelay: `${i * 80}ms` }}>
                <div
                  className={`mc-card overflow-hidden h-full flex flex-col transition-all ${
                    isPopular
                      ? "!border-pink !shadow-[0_4px_32px_rgba(142,45,226,0.15)] scale-[1.02]"
                      : ""
                  } ${pack.bestValue ? "!border-violet" : ""}`}
                >
                  {/* Badge */}
                  {pack.badge && (
                    <div
                      className={`text-center py-2 text-[12px] font-bold tracking-wide ${
                        isPopular
                          ? "bg-gradient-to-r from-pink to-violet text-white"
                          : pack.bestValue
                          ? "bg-gradient-to-r from-violet-deep to-pink text-white"
                          : "bg-pink-soft text-pink"
                      }`}
                    >
                      {pack.badge}
                    </div>
                  )}

                  <div className="p-6 flex flex-col flex-1 text-center">
                    {/* Gem image */}
                    <div
                      className={`mx-auto flex items-center justify-center py-2 mb-4`}
                    >
                      <img
                        src={pack.image}
                        alt={`${formatGems(pack.gems)} Gems`}
                        className="w-24 h-24 object-contain drop-shadow-lg gem-shine"
                      />
                    </div>

                    {/* Gems amount */}
                    <div className="mb-1">
                      <span className="text-[28px] font-extrabold text-text">
                        {formatGems(pack.gems)}
                      </span>
                    </div>
                    <span className="text-[13px] text-text-muted font-medium mb-5">
                      Gems
                    </span>

                    {/* Pricing */}
                    <div className="mb-5">
                      {hasSaving && (
                        <div className="mb-1">
                          <span className="text-[15px] text-text-muted line-through">
                            {formatPrice(pack.originalPrice!)} €
                          </span>
                          <span className="ml-2 inline-block bg-green/10 text-green text-[11px] font-bold px-2 py-0.5 rounded-full">
                            -{savingPct}%
                          </span>
                        </div>
                      )}
                      <div>
                        <span
                          className={`text-[32px] font-extrabold ${
                            isPopular ? "text-pink" : "text-text"
                          }`}
                        >
                          {formatPrice(pack.price)}
                        </span>
                        <span className="text-[15px] text-text-muted ml-1">€</span>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="mt-auto">
                      <button
                        onClick={() => handleBuy(pack.id)}
                        className={`w-full py-3 rounded-xl text-[14px] font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          isPopular
                            ? "bg-gradient-to-r from-pink to-violet text-white shadow-[0_4px_20px_rgba(142,45,226,0.3)] hover:shadow-[0_6px_28px_rgba(142,45,226,0.4)] hover:scale-[1.02]"
                            : pack.bestValue
                            ? "bg-gradient-to-r from-violet-deep to-pink text-white shadow-[0_4px_16px_rgba(142,45,226,0.2)] hover:shadow-[0_6px_24px_rgba(142,45,226,0.35)] hover:scale-[1.02]"
                            : "bg-pink text-white hover:bg-pink-hover shadow-[0_2px_12px_rgba(142,45,226,0.15)] hover:shadow-[0_4px_16px_rgba(142,45,226,0.25)]"
                        }`}
                      >
                        <Gem size={16} />
                        Acheter
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </RevealDiv>
            );
          })}
        </div>

        {/* ============ COMMUNITY GOAL ============ */}
        <div ref={goalRef} className="reveal mc-card p-6 mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target size={18} className="text-pink" />
                <span className="text-[16px] font-bold text-text">
                  {COMMUNITY_GOAL.title}
                </span>
              </div>
              <p className="text-[13px] text-text-sub">
                {COMMUNITY_GOAL.description}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[20px] font-extrabold text-pink">
                {COMMUNITY_GOAL.current} €
              </span>
              <span className="text-[14px] text-text-muted">
                {" "}
                / {COMMUNITY_GOAL.target} €
              </span>
            </div>
          </div>

          <div className="progress-bar !h-4 mb-3">
            <div className="progress-fill" style={{ width: `${goalPercent}%` }}>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white drop-shadow-sm">
                {Math.round(goalPercent)}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[13px] text-text-sub bg-pink-soft/50 rounded-lg px-3 py-2">
            <Gift size={14} className="text-pink shrink-0" />
            <span>
              <strong className="text-text">Récompense :</strong>{" "}
              {COMMUNITY_GOAL.reward}
            </span>
          </div>
        </div>

        {/* ============ TOP SUPPORTERS ============ */}
        <div ref={supportersRef} className="reveal mc-card p-6 mb-10">
          <div className="flex items-center gap-2 mb-5">
            <Trophy size={18} className="text-pink" />
            <span className="text-[16px] font-bold text-text">
              Meilleurs soutiens
            </span>
          </div>

          {supporters.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {supporters.slice(0, 10).map((s, i) => (
                <div
                  key={s.username}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    i < 3
                      ? "bg-gradient-to-r from-pink-soft/60 to-transparent"
                      : "bg-bg-soft/60"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${
                      i === 0
                        ? "bg-yellow-400 text-white"
                        : i === 1
                        ? "bg-gray-300 text-white"
                        : i === 2
                        ? "bg-amber-600 text-white"
                        : "bg-bg-soft text-text-muted"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <img
                    src={`https://mc-heads.net/avatar/${s.username}/32`}
                    alt={s.username}
                    className="w-8 h-8 rounded-lg"
                  />
                  <span className="text-[14px] font-semibold text-text flex-1">
                    {s.username}
                  </span>
                  <span className="text-[13px] font-bold text-pink">
                    {formatPrice(s.total)} €
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-text-muted text-[14px]">
              <Heart size={24} className="mx-auto mb-2 text-pink/40" />
              <p>Les meilleurs soutiens apparaîtront ici.</p>
              <p className="text-[12px] mt-1">
                Configurez la clé API Tebex pour activer cette fonctionnalité.
              </p>
            </div>
          )}
        </div>

        {/* ============ PARENT NOTE ============ */}
        <div ref={parentRef} className="reveal mc-card p-6 mb-10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-soft flex items-center justify-center shrink-0">
              <ShieldCheck size={20} className="text-pink" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-text mb-2">
                Note aux parents
              </h3>
              <div className="text-[13px] text-text-sub leading-relaxed space-y-2">
                <p>
                  Linesia est un serveur Minecraft <strong>100% gratuit</strong>.
                  La boutique propose uniquement des avantages cosmétiques et de
                  confort qui n&apos;impactent pas l&apos;équilibre du jeu.
                </p>
                <p>
                  Les achats sont <strong>sécurisés via Tebex</strong>, la
                  plateforme de paiement n°1 pour les serveurs Minecraft. Aucune
                  donnée bancaire n&apos;est stockée sur nos serveurs.
                </p>
                <p>
                  Nous encourageons les parents à superviser les achats de leurs
                  enfants. Si vous avez la moindre question, n&apos;hésitez pas à
                  nous contacter.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ============ HELP & CONTACT ============ */}
        <div ref={helpRef} className="reveal">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="mc-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Info size={16} className="text-pink" />
                <span className="text-[14px] font-bold text-text">
                  Besoin d&apos;aide ?
                </span>
              </div>
              <p className="text-[13px] text-text-sub mb-3">
                Un problème avec votre achat ? Vos Gems n&apos;apparaissent pas ?
                On vous aide rapidement.
              </p>
              <a
                href="https://discord.gg/linesia"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-discord !py-2 !px-4 !text-[13px]"
              >
                <MessageCircle size={14} />
                Discord Support
              </a>
            </div>

            <div className="mc-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Star size={16} className="text-pink" />
                <span className="text-[14px] font-bold text-text">
                  Comment ça marche ?
                </span>
              </div>
              <ol className="text-[13px] text-text-sub space-y-1.5 list-decimal list-inside">
                <li>Entre ton pseudo Minecraft ci-dessus</li>
                <li>Choisis ton pack de Gems</li>
                <li>Paye en toute sécurité via Tebex</li>
                <li>Tes Gems arrivent instantanément en jeu !</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
