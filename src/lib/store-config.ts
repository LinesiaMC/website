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
 */

export const TEBEX_STORE_URL = "https://linesia.tebex.io";

export interface GemPack {
  id: string;
  gems: number;
  bonus: number; // bonus gems (0 = no bonus)
  price: number; // EUR
  tebexPackageId: string | null; // Set to your Tebex package ID
  popular?: boolean;
  image?: string;
}

export const GEM_PACKS: GemPack[] = [
  {
    id: "starter",
    gems: 200,
    bonus: 0,
    price: 4.99,
    tebexPackageId: null, // TODO: Set your Tebex package ID
    image: "/images/gems1.png",
  },
  {
    id: "popular",
    gems: 500,
    bonus: 50,
    price: 9.99,
    tebexPackageId: null,
    popular: true,
    image: "/images/gems2.png",
  },
  {
    id: "pro",
    gems: 1200,
    bonus: 200,
    price: 19.99,
    tebexPackageId: null,
    image: "/images/gems3.png",
  },
  {
    id: "ultimate",
    gems: 3500,
    bonus: 1000,
    price: 49.99,
    tebexPackageId: null,
    image: "/images/gems4.png",
  },
];

export function getTebexCheckoutUrl(pack: GemPack): string {
  if (pack.tebexPackageId) {
    return `${TEBEX_STORE_URL}/checkout/packages/add/${pack.tebexPackageId}/single`;
  }
  return TEBEX_STORE_URL;
}

/** Monthly store goal config */
export const STORE_GOAL = {
  target: 500, // EUR
  current: 340, // EUR - update this or fetch from API
  currency: "EUR",
};
