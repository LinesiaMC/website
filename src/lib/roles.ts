export type StaffRole = "member" | "guide" | "moderator" | "super_moderator" | "admin" | "founder";

export const ROLES: StaffRole[] = ["member", "guide", "moderator", "super_moderator", "admin", "founder"];

export const ROLE_LABELS: Record<StaffRole, { fr: string; en: string }> = {
  member: { fr: "Membre", en: "Member" },
  guide: { fr: "Guide", en: "Guide" },
  moderator: { fr: "Modérateur", en: "Moderator" },
  super_moderator: { fr: "Super-Modérateur", en: "Super-Moderator" },
  admin: { fr: "Administrateur", en: "Administrator" },
  founder: { fr: "Fondateur", en: "Founder" },
};

export const ROLE_COLORS: Record<StaffRole, { bg: string; text: string; border: string; hex: string }> = {
  member:          { bg: "bg-slate-50",   text: "text-slate-600",   border: "border-slate-200",   hex: "#64748B" },
  guide:           { bg: "bg-teal-50",    text: "text-teal-600",    border: "border-teal-200",    hex: "#14B8A6" },
  moderator:       { bg: "bg-green-50",   text: "text-green-800",   border: "border-green-300",   hex: "#166534" },
  super_moderator: { bg: "bg-orange-50",  text: "text-orange-600",  border: "border-orange-200",  hex: "#F97316" },
  admin:           { bg: "bg-red-50",     text: "text-red-500",     border: "border-red-200",     hex: "#EF4444" },
  founder:         { bg: "bg-red-100",    text: "text-red-800",     border: "border-red-300",     hex: "#991B1B" },
};

const ROLE_RANK: Record<StaffRole, number> = {
  member: 0, guide: 1, moderator: 2, super_moderator: 3, admin: 4, founder: 5,
};

export function roleAtLeast(role: StaffRole, min: StaffRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export type Permission =
  | "articles.manage"
  | "wiki.manage"
  | "roadmap.manage"
  | "logs.view"
  | "tickets.view"
  | "tickets.respond"
  | "tickets.close"
  | "tickets.admin_category"
  | "permissions.manage"
  | "community.view"
  | "community.moderate"
  | "community.ban"
  | "analytics.view"
  | "alerts.view"
  | "system.view";

export const PERMISSIONS: Permission[] = [
  "articles.manage", "wiki.manage", "roadmap.manage",
  "logs.view", "analytics.view", "alerts.view", "community.view",
  "community.moderate", "community.ban",
  "tickets.view", "tickets.respond", "tickets.close", "tickets.admin_category",
  "permissions.manage",
  "system.view",
];

export const PERMISSION_LABELS: Record<Permission, { fr: string; en: string; group: string }> = {
  "articles.manage":         { fr: "Gérer les articles",       en: "Manage articles",        group: "content" },
  "wiki.manage":             { fr: "Gérer le wiki",            en: "Manage wiki",            group: "content" },
  "roadmap.manage":          { fr: "Gérer la roadmap",         en: "Manage roadmap",         group: "content" },
  "logs.view":               { fr: "Voir les logs",            en: "View logs",              group: "data" },
  "analytics.view":          { fr: "Voir les analytics",       en: "View analytics",         group: "data" },
  "alerts.view":             { fr: "Voir les alertes anti-cheat", en: "View anti-cheat alerts", group: "data" },
  "community.view":          { fr: "Voir la communauté",       en: "View community",         group: "data" },
  "community.moderate":      { fr: "Modérer les fils",         en: "Moderate threads",       group: "community" },
  "community.ban":           { fr: "Bannir de la communauté",  en: "Ban from community",     group: "community" },
  "tickets.view":            { fr: "Voir les tickets",         en: "View tickets",           group: "tickets" },
  "tickets.respond":         { fr: "Répondre aux tickets",     en: "Respond to tickets",     group: "tickets" },
  "tickets.close":           { fr: "Clore les tickets",        en: "Close tickets",          group: "tickets" },
  "tickets.admin_category":  { fr: "Tickets catégorie staff",  en: "Staff-category tickets", group: "tickets" },
  "permissions.manage":      { fr: "Gérer les permissions",    en: "Manage permissions",     group: "admin" },
  "system.view":             { fr: "Voir l'état système",      en: "View system health",     group: "admin" },
};

/**
 * Default role-permission matrix. Used as fallback when role_permissions
 * table has no override for a given (role, permission) pair, and as the
 * seed values shown in the admin matrix UI.
 *
 * Founder is a special-case super-admin that ALWAYS has every permission
 * — this is enforced in code, not via the matrix.
 */
export const DEFAULT_PERMISSIONS: Record<StaffRole, Record<Permission, boolean>> = {
  member: {
    "articles.manage": false, "wiki.manage": false, "roadmap.manage": false,
    "logs.view": false, "analytics.view": false, "alerts.view": false, "community.view": false,
    "community.moderate": false, "community.ban": false,
    "tickets.view": false, "tickets.respond": false, "tickets.close": false, "tickets.admin_category": false,
    "permissions.manage": false, "system.view": false,
  },
  guide: {
    "articles.manage": false, "wiki.manage": false, "roadmap.manage": false,
    "logs.view": false, "analytics.view": true, "alerts.view": false, "community.view": true,
    "community.moderate": false, "community.ban": false,
    "tickets.view": true, "tickets.respond": true, "tickets.close": false, "tickets.admin_category": false,
    "permissions.manage": false, "system.view": false,
  },
  moderator: {
    "articles.manage": false, "wiki.manage": true, "roadmap.manage": false,
    "logs.view": true, "analytics.view": true, "alerts.view": true, "community.view": true,
    "community.moderate": true, "community.ban": false,
    "tickets.view": true, "tickets.respond": true, "tickets.close": true, "tickets.admin_category": false,
    "permissions.manage": false, "system.view": false,
  },
  super_moderator: {
    "articles.manage": true, "wiki.manage": true, "roadmap.manage": true,
    "logs.view": true, "analytics.view": true, "alerts.view": true, "community.view": true,
    "community.moderate": true, "community.ban": true,
    "tickets.view": true, "tickets.respond": true, "tickets.close": true, "tickets.admin_category": false,
    "permissions.manage": false, "system.view": false,
  },
  admin: {
    "articles.manage": true, "wiki.manage": true, "roadmap.manage": true,
    "logs.view": true, "analytics.view": true, "alerts.view": true, "community.view": true,
    "community.moderate": true, "community.ban": true,
    "tickets.view": true, "tickets.respond": true, "tickets.close": true, "tickets.admin_category": true,
    "permissions.manage": false, "system.view": true,
  },
  founder: {
    "articles.manage": true, "wiki.manage": true, "roadmap.manage": true,
    "logs.view": true, "analytics.view": true, "alerts.view": true, "community.view": true,
    "community.moderate": true, "community.ban": true,
    "tickets.view": true, "tickets.respond": true, "tickets.close": true, "tickets.admin_category": true,
    "permissions.manage": true, "system.view": true,
  },
};

/**
 * Synchronous fallback used by SSR and client before the live permission
 * map loads. Server endpoints MUST use hasPermissionDb (see lib/permissions.ts).
 */
export function hasPermission(role: StaffRole, perm: Permission): boolean {
  if (role === "founder") return true;
  return DEFAULT_PERMISSIONS[role]?.[perm] ?? false;
}

// =================================================================
// In-game rank → site role mapping. The Minecraft server is the
// source of truth for staff rank: when a linked player's in-game
// rank changes, their staff_users row is upserted/deleted accordingly.
// =================================================================

export type IngameRank =
  | "joueur" | "influenceur" | "premium" | "elite" | "vérificateur"
  | "guide" | "modérateur" | "super-modérateur" | "administrateur" | "owner";

export const INGAME_RANK_LABELS: Record<IngameRank, { fr: string; en: string; color: string; isStaff: boolean }> = {
  joueur:            { fr: "Joueur",            en: "Player",            color: "#94A3B8", isStaff: false },
  influenceur:       { fr: "Influenceur",       en: "Influencer",        color: "#EC4899", isStaff: false },
  premium:           { fr: "Premium",           en: "Premium",           color: "#F59E0B", isStaff: false },
  elite:             { fr: "Élite",             en: "Elite",             color: "#A855F7", isStaff: false },
  "vérificateur":    { fr: "Vérificateur",      en: "Verifier",          color: "#0EA5E9", isStaff: true  },
  guide:             { fr: "Guide",             en: "Guide",             color: "#14B8A6", isStaff: true  },
  "modérateur":      { fr: "Modérateur",        en: "Moderator",         color: "#16A34A", isStaff: true  },
  "super-modérateur":{ fr: "Super-Modérateur",  en: "Super-Moderator",   color: "#F97316", isStaff: true  },
  administrateur:    { fr: "Administrateur",    en: "Administrator",     color: "#EF4444", isStaff: true  },
  owner:             { fr: "Owner",             en: "Owner",             color: "#991B1B", isStaff: true  },
};

/** Returns the site StaffRole for an in-game rank, or null if not staff. */
export function ingameRankToStaffRole(ingameRank: string | null | undefined): StaffRole | null {
  if (!ingameRank) return null;
  const r = ingameRank.toLowerCase().trim();
  switch (r) {
    case "vérificateur":
    case "verificateur":
    case "guide":
      return "guide";
    case "modérateur":
    case "moderateur":
      return "moderator";
    case "super-modérateur":
    case "super-moderateur":
    case "super_moderateur":
      return "super_moderator";
    case "administrateur":
    case "admin":
      return "admin";
    case "owner":
    case "founder":
      return "founder";
    default:
      return null;
  }
}
