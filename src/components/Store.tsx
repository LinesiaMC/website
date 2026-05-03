"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Gem,
  ShieldCheck,
  MessageCircle,
  Trophy,
  Gift,
  ChevronRight,
  User,
  Target,
  Zap,
  Lock,
  BadgeCheck,
  Crown,
  Heart,
  HelpCircle,
  Check,
  Plus,
  Minus,
  ShoppingBag,
  X,
  Loader2,
} from "lucide-react";
import { useReveal, RevealDiv } from "@/lib/useReveal";
import {
  GEM_PACKS,
  COMMUNITY_GOAL,
  packById,
  type GemPack,
} from "@/lib/store-config";

function pctSaving(o: number, p: number) {
  return Math.round(((o - p) / o) * 100);
}

interface Supporter {
  username: string;
  total: number;
}
type Cart = Record<string, number>; // packId → quantity

const CART_KEY = "linesia.store.cart.v1";

export default function Store() {
  const t = useTranslations("store.page");
  const locale = useLocale();
  const intlLocale = locale === "en" ? "en-US" : "fr-FR";
  const formatGems = (n: number) => n.toLocaleString(intlLocale);
  const formatPrice = (n: number) =>
    new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const headerRef = useReveal();
  const goalRef = useReveal();
  const supportersRef = useReveal();
  const trustRef = useReveal();
  const faqRef = useReveal();
  const parentRef = useReveal();

  const [username, setUsername] = useState("");
  const [usernameConfirmed, setUsernameConfirmed] = useState(false);
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [cart, setCart] = useState<Cart>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Restore cart
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Top supporters
  useEffect(() => {
    fetch("/api/tebex?type=top-supporters")
      .then((r) => r.json())
      .then((d) => {
        if (d.supporters) setSupporters(d.supporters);
      })
      .catch(() => {});
  }, []);

  const goalPercent = Math.min(
    100,
    (COMMUNITY_GOAL.current / COMMUNITY_GOAL.target) * 100
  );

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const pack = packById(id);
          if (!pack || qty <= 0) return null;
          return { pack, qty };
        })
        .filter(
          (x): x is { pack: GemPack; qty: number } => x !== null
        ),
    [cart]
  );
  const itemCount = cartLines.reduce((n, l) => n + l.qty, 0);
  const totalGems = cartLines.reduce((n, l) => n + l.pack.gems * l.qty, 0);
  const totalEur = cartLines.reduce((n, l) => n + l.pack.price * l.qty, 0);

  function add(packId: string, by = 1) {
    setCart((c) => ({ ...c, [packId]: Math.max(0, (c[packId] || 0) + by) }));
  }
  function setQty(packId: string, qty: number) {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[packId];
      else next[packId] = Math.min(99, qty);
      return next;
    });
  }
  function clearCart() {
    setCart({});
  }

  async function checkout() {
    setCheckoutError(null);
    if (!usernameConfirmed) {
      setCheckoutError(t("errorConfirmName"));
      return;
    }
    if (cartLines.length === 0) {
      setCheckoutError(t("errorEmptyCart"));
      return;
    }
    setCheckingOut(true);
    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          items: cartLines.map((l) => ({ packId: l.pack.id, quantity: l.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setCheckoutError(data.error || t("errorCheckoutFailed"));
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutError(t("errorConnection"));
    } finally {
      setCheckingOut(false);
    }
  }

  // Render <b>name</b> chunk for confirmed delivery line
  const deliveryNote = (name: string) =>
    t.rich("deliveryNote", {
      name,
      b: (chunks) => <strong>{chunks}</strong>,
    });

  return (
    <div className="min-h-screen bg-bg-soft pt-[110px] pb-32 px-4">
      <div className="max-w-[1100px] mx-auto space-y-5">
        {/* ============ HEADER ============ */}
        <div ref={headerRef} className="reveal text-center">
          <div className="section-badge">{t("badge")}</div>
          <h1 className="text-[32px] sm:text-[40px] font-bold text-text mb-2">
            {t("title")} <span className="gradient-text">{t("titleHighlight")}</span>
          </h1>
          <p className="text-[14px] text-text-sub max-w-xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        {/* ============ PSEUDO ============ */}
        <RevealDiv>
          <div className="mc-card p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <User size={16} className="text-pink" />
                <span className="text-[13px] font-semibold text-text">
                  {t("minecraftName")}
                </span>
              </div>
              <div className="flex flex-1 gap-2">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameConfirmed(false);
                  }}
                  placeholder={t("namePlaceholder")}
                  className="flex-1 bg-bg-soft border border-border rounded-lg px-3 py-2 text-[13px] text-text placeholder:text-text-muted outline-none focus:border-pink focus:ring-2 focus:ring-pink/20 transition-all"
                />
                <button
                  onClick={() => {
                    if (username.trim().length >= 3) setUsernameConfirmed(true);
                  }}
                  disabled={username.trim().length < 3}
                  className="btn-primary !py-2 !px-4 !text-[13px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {usernameConfirmed ? <Check size={14} /> : t("confirm")}
                </button>
              </div>
            </div>
            {usernameConfirmed && (
              <p className="mt-2 flex items-center gap-1.5 text-green text-[12px] font-medium">
                <ShieldCheck size={12} />
                {deliveryNote(username)}
              </p>
            )}
          </div>
        </RevealDiv>

        {/* ============ PACKS ============ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {GEM_PACKS.map((pack, i) => (
            <RevealDiv key={pack.id} style={{ transitionDelay: `${i * 60}ms` }}>
              <PackCard
                pack={pack}
                qty={cart[pack.id] || 0}
                onAdd={() => add(pack.id, 1)}
                onSub={() => add(pack.id, -1)}
                formatGems={formatGems}
                formatPrice={formatPrice}
                addLabel={t("addToCart")}
              />
            </RevealDiv>
          ))}
        </div>

        {/* ============ OBJECTIF + SOUTIENS — 2 colonnes ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div ref={goalRef} className="reveal mc-card p-5 lg:col-span-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Target size={16} className="text-pink" />
                  <span className="text-[14px] font-bold text-text">
                    {COMMUNITY_GOAL.title}
                  </span>
                </div>
                <p className="text-[12px] text-text-sub">
                  {COMMUNITY_GOAL.description}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[18px] font-extrabold text-pink tabular-nums">
                  {COMMUNITY_GOAL.current}€
                </span>
                <span className="text-[12px] text-text-muted">
                  {" "}/ {COMMUNITY_GOAL.target}€
                </span>
              </div>
            </div>
            <div className="progress-bar !h-3 mb-3">
              <div
                className="progress-fill"
                style={{ width: `${goalPercent}%` }}
              >
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-white drop-shadow-sm">
                  {Math.round(goalPercent)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-text-sub bg-pink-soft/50 rounded-lg px-3 py-2">
              <Gift size={13} className="text-pink shrink-0" />
              <span>
                <strong className="text-text">{t("rewardLabel")}</strong>{" "}
                {COMMUNITY_GOAL.reward}
              </span>
            </div>
          </div>

          <div ref={supportersRef} className="reveal mc-card p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-pink" />
              <span className="text-[14px] font-bold text-text">
                {t("topSupporters")}
              </span>
            </div>
            {supporters.length > 0 ? (
              <div className="space-y-1.5">
                {supporters.slice(0, 5).map((s, i) => (
                  <div
                    key={s.username}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-soft/60 transition-colors"
                  >
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                        i === 0
                          ? "bg-amber text-white"
                          : i === 1
                          ? "bg-zinc-300 text-white"
                          : i === 2
                          ? "bg-amber/80 text-white"
                          : "bg-bg-soft text-text-muted"
                      }`}
                    >
                      {i === 0 ? <Crown size={10} /> : i + 1}
                    </span>
                    <img
                      src={`https://mc-heads.net/avatar/${s.username}/24`}
                      alt={s.username}
                      className="w-6 h-6 rounded"
                    />
                    <span className="text-[12px] font-semibold text-text flex-1 truncate">
                      {s.username}
                    </span>
                    <span className="text-[12px] font-bold text-pink tabular-nums">
                      {formatPrice(s.total)}€
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-text-muted text-[12px]">
                <Heart size={18} className="mx-auto mb-1 text-pink/40" />
                {t("supportersEmpty")}
              </div>
            )}
          </div>
        </div>

        {/* ============ TRUST ============ */}
        <div ref={trustRef} className="reveal grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TrustCard
            icon={<Zap size={16} className="text-pink" />}
            title={t("trustInstantTitle")}
            text={t("trustInstantText")}
          />
          <TrustCard
            icon={<Lock size={16} className="text-pink" />}
            title={t("trustSecureTitle")}
            text={t("trustSecureText")}
          />
          <TrustCard
            icon={<BadgeCheck size={16} className="text-pink" />}
            title={t("trustFairTitle")}
            text={t("trustFairText")}
          />
        </div>

        {/* ============ FAQ ============ */}
        <div ref={faqRef} className="reveal mc-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle size={16} className="text-pink" />
            <span className="text-[14px] font-bold text-text">
              {t("faqTitle")}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {([1, 2, 3, 4] as const).map((n) => (
              <div key={n}>
                <h4 className="text-[13px] font-semibold text-text mb-0.5">
                  {t(`faq.q${n}`)}
                </h4>
                <p className="text-[12px] text-text-sub leading-relaxed">
                  {t(`faq.a${n}`)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[12px] text-text-sub">{t("moreQuestions")}</span>
            <a
              href="https://discord.gg/linesia"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-discord !py-2 !px-3 !text-[12px]"
            >
              <MessageCircle size={12} />
              {t("discordSupport")}
            </a>
          </div>
        </div>

        {/* ============ NOTE PARENTS ============ */}
        <div ref={parentRef} className="reveal mc-card p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-pink-soft flex items-center justify-center shrink-0">
              <ShieldCheck size={18} className="text-pink" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-text mb-1">
                {t("parentsTitle")}
              </h3>
              <p className="text-[12px] text-text-sub leading-relaxed">
                {t("parentsText")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============ STICKY CART BAR ============ */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(680px,calc(100%-2rem))]">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-full bg-text text-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_40px_rgba(142,45,226,0.25)] hover:bg-pink transition-all px-4 py-3 flex items-center gap-3 group"
          >
            <div className="relative">
              <ShoppingBag size={18} />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-pink text-white text-[10px] font-bold flex items-center justify-center group-hover:bg-white group-hover:text-pink transition-colors">
                {itemCount}
              </span>
            </div>
            <div className="flex-1 text-left">
              <div className="text-[13px] font-semibold">
                {t("viewCart", { gems: formatGems(totalGems) })}
              </div>
              <div className="text-[11px] text-white/70">
                {t("cartSubtitle", {
                  count: cartLines.length,
                  price: `${formatPrice(totalEur)} €`,
                })}
              </div>
            </div>
            <ChevronRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </div>
      )}

      {/* ============ CART DRAWER ============ */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="w-full sm:max-w-[480px] bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-pink" />
                <h3 className="text-[15px] font-bold text-text">{t("myCart")}</h3>
                <span className="text-[12px] text-text-muted">
                  ({itemCount})
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-text-muted hover:text-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cartLines.length === 0 ? (
                <div className="text-center py-10 text-text-muted text-[13px]">
                  <ShoppingBag size={28} className="mx-auto mb-2 text-pink/40" />
                  {t("cartEmpty")}
                </div>
              ) : (
                cartLines.map(({ pack, qty }) => (
                  <div
                    key={pack.id}
                    className="flex items-center gap-3 p-2 rounded-xl border border-border bg-bg-soft/40"
                  >
                    <img
                      src={pack.image}
                      alt=""
                      className="w-12 h-12 object-contain shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-text truncate">
                        {formatGems(pack.gems)} Gems
                      </div>
                      <div className="text-[11px] text-text-muted">
                        {formatPrice(pack.price)}€ × {qty}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-white rounded-lg border border-border">
                      <button
                        onClick={() => setQty(pack.id, qty - 1)}
                        className="w-7 h-7 flex items-center justify-center text-text-sub hover:text-pink transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-[12px] font-bold tabular-nums">
                        {qty}
                      </span>
                      <button
                        onClick={() => setQty(pack.id, qty + 1)}
                        className="w-7 h-7 flex items-center justify-center text-text-sub hover:text-pink transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="text-[13px] font-extrabold text-pink tabular-nums shrink-0">
                      {formatPrice(pack.price * qty)}€
                    </div>
                  </div>
                ))
              )}
            </div>

            {cartLines.length > 0 && (
              <div className="border-t border-border p-4 space-y-3">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-text-sub">{t("totalGems")}</span>
                  <span className="font-bold text-text tabular-nums">
                    {formatGems(totalGems)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[15px]">
                  <span className="font-semibold text-text">{t("total")}</span>
                  <span className="font-extrabold text-pink tabular-nums">
                    {formatPrice(totalEur)}€
                  </span>
                </div>

                {!usernameConfirmed && (
                  <div className="text-[11px] text-amber bg-amber/10 rounded-lg px-3 py-2">
                    {t("confirmNameWarning")}
                  </div>
                )}

                {checkoutError && (
                  <div className="text-[11px] text-red-500 bg-red-50 rounded-lg px-3 py-2">
                    {checkoutError}
                  </div>
                )}

                <button
                  onClick={checkout}
                  disabled={checkingOut || !usernameConfirmed}
                  className="w-full btn-primary !py-3 !text-[13px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {checkingOut ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {t("redirecting")}
                    </>
                  ) : (
                    <>
                      <Lock size={14} />
                      {t("payNow", { price: `${formatPrice(totalEur)}€` })}
                    </>
                  )}
                </button>

                <button
                  onClick={clearCart}
                  className="w-full text-[11px] text-text-muted hover:text-pink transition-colors"
                >
                  {t("clearCart")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── pack card — compact ─────────────────────────────────────────────

function PackCard({
  pack,
  qty,
  onAdd,
  onSub,
  formatGems,
  formatPrice,
  addLabel,
}: {
  pack: GemPack;
  qty: number;
  onAdd: () => void;
  onSub: () => void;
  formatGems: (n: number) => string;
  formatPrice: (n: number) => string;
  addLabel: string;
}) {
  const isPopular = pack.highlight;
  const isBest = pack.bestValue;
  const hasSaving = pack.originalPrice && pack.originalPrice > pack.price;
  const savingPct = hasSaving ? pctSaving(pack.originalPrice!, pack.price) : 0;
  const inCart = qty > 0;

  return (
    <div
      className={`mc-card relative overflow-hidden h-full flex flex-col transition-all ${
        isPopular
          ? "!border-pink !shadow-[0_4px_24px_rgba(142,45,226,0.18)]"
          : isBest
          ? "!border-violet"
          : ""
      } ${inCart ? "ring-2 ring-pink/40" : ""}`}
    >
      {pack.badge && (
        <div
          className={`absolute top-2 right-2 z-10 text-[9px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full ${
            isPopular
              ? "bg-gradient-to-r from-pink to-violet text-white"
              : isBest
              ? "bg-gradient-to-r from-violet-deep to-pink text-white"
              : "bg-pink-soft text-pink"
          }`}
        >
          {pack.badge}
        </div>
      )}

      <div className="px-3 pt-4 pb-3 flex flex-col flex-1 text-center">
        <div className="mx-auto mb-2">
          <img
            src={pack.image}
            alt={`${formatGems(pack.gems)} Gems`}
            className="w-16 h-16 object-contain drop-shadow-md gem-shine"
          />
        </div>

        <div className="mb-2">
          <div className="text-[20px] font-extrabold text-text tabular-nums leading-none">
            {formatGems(pack.gems)}
          </div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-semibold mt-0.5">
            Gems
          </div>
        </div>

        <div className="mb-3">
          {hasSaving && (
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <span className="text-[11px] text-text-muted line-through tabular-nums">
                {formatPrice(pack.originalPrice!)}€
              </span>
              <span className="text-[9px] font-extrabold text-green bg-green/10 px-1.5 py-0.5 rounded">
                −{savingPct}%
              </span>
            </div>
          )}
          <div>
            <span
              className={`text-[24px] font-extrabold tabular-nums ${
                isPopular ? "text-pink" : isBest ? "text-violet-deep" : "text-text"
              }`}
            >
              {formatPrice(pack.price)}
            </span>
            <span className="text-[12px] text-text-muted ml-0.5">€</span>
          </div>
        </div>

        <div className="mt-auto">
          {inCart ? (
            <div className="flex items-center justify-between gap-2 bg-pink-soft rounded-lg p-1">
              <button
                onClick={onSub}
                className="w-8 h-8 flex items-center justify-center text-pink hover:bg-white rounded-md transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="text-[14px] font-extrabold text-pink tabular-nums">
                {qty}
              </span>
              <button
                onClick={onAdd}
                className="w-8 h-8 flex items-center justify-center text-pink hover:bg-white rounded-md transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={onAdd}
              className={`w-full py-2 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                isPopular
                  ? "bg-gradient-to-r from-pink to-violet text-white shadow-[0_2px_12px_rgba(142,45,226,0.3)] hover:shadow-[0_4px_18px_rgba(142,45,226,0.45)]"
                  : isBest
                  ? "bg-gradient-to-r from-violet-deep to-pink text-white"
                  : "bg-text text-white hover:bg-pink"
              }`}
            >
              <Gem size={12} />
              {addLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TrustCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="mc-card p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-pink-soft flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-[13px] font-bold text-text mb-0.5">{title}</h3>
        <p className="text-[12px] text-text-sub leading-snug">{text}</p>
      </div>
    </div>
  );
}
