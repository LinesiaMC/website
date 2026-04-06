/**
 * Store configuration - Connect your Tebex packages here.
 *
 * For each gem pack, set the `tebexPackageId` to the ID from your Tebex dashboard.
 * The checkout URL is built automatically: https://linesia.tebex.io/checkout/packages/add/{id}/single
 *
 * To find your package IDs:
 *   1. Go to https://server.tebex.io/packages
 *   2. Click on a package
 *   3. The ID is in the URL or shown in the package details
 *
 * Tebex API:
 *   Set TEBEX_SECRET env var for top supporters API.
 *   Get it from https://server.tebex.io/ > API Keys
 */

export const TEBEX_STORE_URL = "https://linesia.tebex.io";

export interface GemPack {
  id: string;
  gems: number;
  price: number; // EUR - actual selling price
  originalPrice?: number; // EUR - crossed-out reference price (if discounted)
  tebexPackageId: string | null; // Set to your Tebex package ID
  badge?: string; // e.g. "Le plus populaire ⭐"
  highlight?: boolean; // visually emphasized card
  bestValue?: boolean; // "Le plus rentable" badge
  image: string; // gem image path
}

export const GEM_PACKS: GemPack[] = [
  {
    id: "starter",
    gems: 15000,
    price: 14.99,
    tebexPackageId: "7179723", // TODO: Set your Tebex package ID
    image: "/images/gems1.png",
  },
  {
    id: "ideal",
    gems: 35000,
    price: 29.99,
    originalPrice: 31.55,
    tebexPackageId: null,
    badge: "🎯 Idéal pour commencer",
    image: "/images/gems2.png",
  },
  {
    id: "popular",
    gems: 80000,
    price: 59.99,
    originalPrice: 67.52,
    tebexPackageId: null,
    badge: "Le plus populaire ⭐",
    highlight: true,
    image: "/images/gems3.png",
  },
  {
    id: "best-value",
    gems: 150000,
    price: 99.97,
    originalPrice: 138.83,
    tebexPackageId: null,
    badge: "Le plus rentable 💸",
    bestValue: true,
    image: "/images/gems4.png",
  },
];

export function getTebexCheckoutUrl(pack: GemPack, username?: string): string {
  if (pack.tebexPackageId) {
    const base = `${TEBEX_STORE_URL}/checkout/packages/add/${pack.tebexPackageId}/single`;
    if (username) {
      return `${base}?ign=${encodeURIComponent(username)}`;
    }
    return base;
  }
  return TEBEX_STORE_URL;
}

/** Monthly store goal config */
export const STORE_GOAL = {
  target: 500, // EUR
  current: 340, // EUR - update this or fetch from API
  currency: "EUR",
};

/** Community goal config */
export const COMMUNITY_GOAL = {
  title: "Objectif communautaire",
  description: "Si on atteint l'objectif, toute la communauté débloque une récompense !",
  reward: "Event exclusif + 500 Gems offerts à tous les joueurs",
  target: 500,
  current: 340,
  currency: "EUR",
};
