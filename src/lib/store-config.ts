/**
 * Store configuration. Source unique pour les packs Gems.
 *
 * Pour brancher un pack en prod, renseigner `tebexPackageId` (depuis
 * https://creator.tebex.io > Packages). Tant que c'est null, le checkout
 * de ce pack renverra une erreur claire.
 *
 * Variables d'env requises pour le checkout multi-pack (panier) :
 *   - TEBEX_WEBSTORE_IDENT : identifiant public du webstore (Tebex Headless)
 *   - TEBEX_WEBHOOK_SECRET : secret HMAC pour valider les webhooks
 *   - TEBEX_SECRET         : déjà utilisé pour /api/tebex (top supporters)
 */

export const TEBEX_STORE_URL = "https://linesia.tebex.io";

export interface GemPack {
  id: string;
  gems: number;
  price: number;
  originalPrice?: number;
  tebexPackageId: string | null;
  badge?: string;
  highlight?: boolean;
  bestValue?: boolean;
  image: string;
}

export const GEM_PACKS: GemPack[] = [
  {
    id: "starter",
    gems: 15000,
    price: 14.99,
    tebexPackageId: "7179723",
    image: "/images/gems1.png",
  },
  {
    id: "ideal",
    gems: 35000,
    price: 29.99,
    originalPrice: 31.55,
    tebexPackageId: null,
    badge: "Idéal",
    image: "/images/gems2.png",
  },
  {
    id: "popular",
    gems: 80000,
    price: 59.99,
    originalPrice: 67.52,
    tebexPackageId: null,
    badge: "Populaire",
    highlight: true,
    image: "/images/gems3.png",
  },
  {
    id: "best-value",
    gems: 150000,
    price: 99.97,
    originalPrice: 138.83,
    tebexPackageId: null,
    badge: "Meilleur ratio",
    bestValue: true,
    image: "/images/gems4.png",
  },
];

export function packById(id: string): GemPack | undefined {
  return GEM_PACKS.find((p) => p.id === id);
}

export function packByTebexId(tebexId: string): GemPack | undefined {
  return GEM_PACKS.find((p) => p.tebexPackageId === tebexId);
}

/** URL legacy single-pack (utilisée en fallback si pas de panier). */
export function getTebexCheckoutUrl(pack: GemPack, username?: string): string {
  if (pack.tebexPackageId) {
    const base = `${TEBEX_STORE_URL}/checkout/packages/add/${pack.tebexPackageId}/single`;
    if (username) return `${base}?ign=${encodeURIComponent(username)}`;
    return base;
  }
  return TEBEX_STORE_URL;
}

export const COMMUNITY_GOAL = {
  title: "Objectif communautaire",
  description:
    "Si on atteint l'objectif, toute la communauté débloque une récompense !",
  reward: "Event exclusif + 500 Gems offerts à tous les joueurs",
  target: 500,
  current: 340,
  currency: "EUR",
};
