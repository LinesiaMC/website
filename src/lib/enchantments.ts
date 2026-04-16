export interface ItemEnchantment {
  id: number;
  level: number;
}

const NAMES: Record<number, string> = {
  0: "Protection",
  1: "Fire Protection",
  2: "Feather Falling",
  3: "Blast Protection",
  4: "Projectile Protection",
  5: "Thorns",
  6: "Respiration",
  7: "Depth Strider",
  8: "Aqua Affinity",
  9: "Sharpness",
  10: "Smite",
  11: "Bane of Arthropods",
  12: "Knockback",
  13: "Fire Aspect",
  14: "Looting",
  15: "Efficiency",
  16: "Silk Touch",
  17: "Unbreaking",
  18: "Fortune",
  19: "Power",
  20: "Punch",
  21: "Flame",
  22: "Infinity",
  23: "Luck of the Sea",
  24: "Lure",
  25: "Frost Walker",
  26: "Mending",
  27: "Curse of Binding",
  28: "Curse of Vanishing",
  29: "Impaling",
  30: "Riptide",
  31: "Loyalty",
  32: "Channeling",
  33: "Multishot",
  34: "Piercing",
  35: "Quick Charge",
  36: "Soul Speed",
  37: "Swift Sneak",
};

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function enchantmentName(id: number): string {
  return NAMES[id] ?? `#${id}`;
}

export function enchantmentLevel(level: number): string {
  return ROMAN[level] ?? String(level);
}

export function parseEnchantments(raw: string | null | undefined): ItemEnchantment[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((e) => typeof e?.id === "number" && typeof e?.level === "number");
    }
  } catch {
    // ignore
  }
  return [];
}
