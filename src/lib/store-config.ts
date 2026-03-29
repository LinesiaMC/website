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
}

export const GEM_PACKS: GemPack[] = [
  {
    id: "starter",
    gems: 100,
    bonus: 0,
    price: 1.99,
    tebexPackageId: null, // TODO: Set your Tebex package ID
  },
  {
    id: "basic",
    gems: 250,
    bonus: 25,
    price: 4.49,
    tebexPackageId: null,
  },
  {
    id: "popular",
    gems: 500,
    bonus: 75,
    price: 7.99,
    tebexPackageId: null,
    popular: true,
  },
  {
    id: "pro",
    gems: 1000,
    bonus: 200,
    price: 14.99,
    tebexPackageId: null,
  },
  {
    id: "mega",
    gems: 2500,
    bonus: 750,
    price: 34.99,
    tebexPackageId: null,
  },
  {
    id: "ultimate",
    gems: 5000,
    bonus: 2000,
    price: 59.99,
    tebexPackageId: null,
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
