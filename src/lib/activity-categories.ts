export type Activity = "mine" | "farm" | "wood" | "mob" | "fish";
export type ItemRole = "output" | "input" | "tool";

export interface ActivityItem {
  activity: Activity;
  role: ItemRole;
}

// Keys cover both display-name (ShopBuy/ShopSell from ShopUI) and vanilla name
// (MarketBuy/MarketSell/Craft). A single item can therefore have 2 entries.
export const ITEM_ACTIVITY: Record<string, ActivityItem> = {
  // ─────── MINE ───────
  "Charbon":                 { activity: "mine", role: "output" },
  "Coal":                    { activity: "mine", role: "output" },
  "Lingot de fer":           { activity: "mine", role: "output" },
  "Iron Ingot":              { activity: "mine", role: "output" },
  "Emeraude":                { activity: "mine", role: "output" },
  "Emerald":                 { activity: "mine", role: "output" },
  "Lingot D'amethyste":      { activity: "mine", role: "output" },
  "Amethyste Ingot":         { activity: "mine", role: "output" },
  "Fragement de rubis":      { activity: "mine", role: "output" },
  "Rubis Fragement":         { activity: "mine", role: "output" },
  "Lingot de rubis":         { activity: "mine", role: "output" },
  "Rubis Ingot":             { activity: "mine", role: "output" },
  "Onyx Ingot":              { activity: "mine", role: "output" },
  "Onyx Brisure":            { activity: "mine", role: "output" },
  "Onyx Fragement":          { activity: "mine", role: "output" },
  "Diamond":                 { activity: "mine", role: "output" },
  "Diamond Pickaxe":         { activity: "mine", role: "tool"   },
  "Netherite Pickaxe":       { activity: "mine", role: "tool"   },
  "Void Reaver Pickaxe":     { activity: "mine", role: "tool"   },

  // ─────── FARM ───────
  "Blé":                     { activity: "farm", role: "output" },
  "Wheat":                   { activity: "farm", role: "output" },
  "Betterave":               { activity: "farm", role: "output" },
  "Beetroot":                { activity: "farm", role: "output" },
  "Patate":                  { activity: "farm", role: "output" },
  "Potato":                  { activity: "farm", role: "output" },
  "Carotte":                 { activity: "farm", role: "output" },
  "Carrot":                  { activity: "farm", role: "output" },
  "Tranche de Pastèque":     { activity: "farm", role: "output" },
  "Melon":                   { activity: "farm", role: "output" },
  "Citrouille":              { activity: "farm", role: "output" },
  "Pumpkin":                 { activity: "farm", role: "output" },
  "Terre Enrichie":          { activity: "farm", role: "output" },
  "Soul Sand":               { activity: "farm", role: "output" },
  "Graine De Blé":           { activity: "farm", role: "input"  },
  "Wheat Seeds":             { activity: "farm", role: "input"  },
  "Graine de Betterave":     { activity: "farm", role: "input"  },
  "Beetroot Seeds":          { activity: "farm", role: "input"  },
  "Graine De Pastèque":      { activity: "farm", role: "input"  },
  "Melon Seeds":             { activity: "farm", role: "input"  },
  "Graine de citrouille":    { activity: "farm", role: "input"  },
  "Pumpkin Seeds":           { activity: "farm", role: "input"  },
  "Graine d'onix":           { activity: "farm", role: "input"  },
  "Nether Wart":             { activity: "farm", role: "input"  },
  "SeedPlanter":             { activity: "farm", role: "tool"   },
  "Void Reaver Hoe":         { activity: "farm", role: "tool"   },

  // ─────── WOOD ───────
  "Écorce de Frêne":         { activity: "wood", role: "output" },
  "Ash Bark":                { activity: "wood", role: "output" },
  "Écorce de Cèdre":         { activity: "wood", role: "output" },
  "Cedar Bark":              { activity: "wood", role: "output" },
  "Écorce d'Érable":         { activity: "wood", role: "output" },
  "Maple Bark":              { activity: "wood", role: "output" },
  "Écorce de Noyer":         { activity: "wood", role: "output" },
  "Walnut Bark":             { activity: "wood", role: "output" },
  "Écorce de Rain Tree":     { activity: "wood", role: "output" },
  "Rain Tree Bark":          { activity: "wood", role: "output" },
  "Écorce de Teck":          { activity: "wood", role: "output" },
  "Teak Bark":               { activity: "wood", role: "output" },
  "Écorce d'Acajou":         { activity: "wood", role: "output" },
  "Mahogany Bark":           { activity: "wood", role: "output" },
  "Écorce de Bois de rose":  { activity: "wood", role: "output" },
  "Rosewood Bark":           { activity: "wood", role: "output" },
  "Pousse de Frêne":         { activity: "wood", role: "input"  },
  "Ash Sapling":             { activity: "wood", role: "input"  },
  "Pousse de Cèdre":         { activity: "wood", role: "input"  },
  "Cedar Sapling":           { activity: "wood", role: "input"  },
  "Pousse d'Érable":         { activity: "wood", role: "input"  },
  "Maple Sapling":           { activity: "wood", role: "input"  },
  "Pousse de Noyer":         { activity: "wood", role: "input"  },
  "Walnut Sapling":          { activity: "wood", role: "input"  },
  "Pousse de Rain Tree":     { activity: "wood", role: "input"  },
  "Rain Tree Sapling":       { activity: "wood", role: "input"  },
  "Pousse de Teck":          { activity: "wood", role: "input"  },
  "Teak Sapling":            { activity: "wood", role: "input"  },
  "Pousse d'Acajou":         { activity: "wood", role: "input"  },
  "Mahogany Sapling":        { activity: "wood", role: "input"  },
  "Pousse de Bois de rose":  { activity: "wood", role: "input"  },
  "Rosewood Sapling":        { activity: "wood", role: "input"  },
  "Iron Axe":                { activity: "wood", role: "tool"   },
  "Void Reaver Axe":         { activity: "wood", role: "tool"   },

  // ─────── MOB ───────
  "Chair putrifiée":         { activity: "mob", role: "output" },
  "Rotten Flesh":            { activity: "mob", role: "output" },
  "Pepite d'or":             { activity: "mob", role: "output" },
  "Gold Nugget":             { activity: "mob", role: "output" },
  "Silex":                   { activity: "mob", role: "output" },
  "Flint":                   { activity: "mob", role: "output" },
  "Bone":                    { activity: "mob", role: "output" },
  "Gunpowder":               { activity: "mob", role: "output" },
  "Diamond Sword":           { activity: "mob", role: "tool"   },
  "Netherite Sword":         { activity: "mob", role: "tool"   },
  "Bow":                     { activity: "mob", role: "tool"   },
  "Arc":                     { activity: "mob", role: "tool"   },
  "Flèche":                  { activity: "mob", role: "tool"   },
  "Arrow":                   { activity: "mob", role: "tool"   },
  "Flèche Infini":           { activity: "mob", role: "tool"   },

  // ─────── FISH ───────
  "Morue Crue":              { activity: "fish", role: "output" },
  "Raw Fish":                { activity: "fish", role: "output" },
  "Saumon Cru":              { activity: "fish", role: "output" },
  "Raw Salmon":              { activity: "fish", role: "output" },
  "Poisson Tropical":        { activity: "fish", role: "output" },
  "Clownfish":               { activity: "fish", role: "output" },
  "Poisson-globe":           { activity: "fish", role: "output" },
  "Pufferfish":              { activity: "fish", role: "output" },
  "Canne à pêche":           { activity: "fish", role: "tool"   },
  "Fishing Rod":             { activity: "fish", role: "tool"   },
};

export const ACTIVITY_META: Record<Activity, {
  label_fr: string;
  label_en: string;
  color: string;
}> = {
  mine: { label_fr: "Minage",  label_en: "Mining",  color: "#6B7280" },
  farm: { label_fr: "Ferme",   label_en: "Farming", color: "#22C55E" },
  wood: { label_fr: "Bois",    label_en: "Wood",    color: "#A16207" },
  mob:  { label_fr: "Mobs",    label_en: "Mobs",    color: "#DC2626" },
  fish: { label_fr: "Pêche",   label_en: "Fishing", color: "#0EA5E9" },
};

export const ACTIVITIES: Activity[] = ["mine", "farm", "wood", "mob", "fish"];

// Plugin emits harvest actions as "Mine"|"Farm"|"Wood"|"Mob"|"Fish" — map to lowercase Activity.
export const HARVEST_ACTION_TO_ACTIVITY: Record<string, Activity> = {
  Mine: "mine", Farm: "farm", Wood: "wood", Mob: "mob", Fish: "fish",
};

export function resolveActivity(itemName: string | null | undefined): ActivityItem | null {
  if (!itemName) return null;
  return ITEM_ACTIVITY[itemName] ?? null;
}
