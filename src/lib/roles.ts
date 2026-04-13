export type StaffRole = "guide" | "moderator" | "super_moderator" | "admin" | "founder";

export const ROLES: StaffRole[] = ["guide", "moderator", "super_moderator", "admin", "founder"];

export const ROLE_LABELS: Record<StaffRole, { fr: string; en: string }> = {
  guide: { fr: "Guide", en: "Guide" },
  moderator: { fr: "Modérateur", en: "Moderator" },
  super_moderator: { fr: "Super-Modérateur", en: "Super-Moderator" },
  admin: { fr: "Administrateur", en: "Administrator" },
  founder: { fr: "Fondateur", en: "Founder" },
};

export const ROLE_COLORS: Record<StaffRole, { bg: string; text: string; border: string; hex: string }> = {
  guide:           { bg: "bg-teal-50",    text: "text-teal-600",    border: "border-teal-200",    hex: "#14B8A6" },
  moderator:       { bg: "bg-green-50",   text: "text-green-800",   border: "border-green-300",   hex: "#166534" },
  super_moderator: { bg: "bg-orange-50",  text: "text-orange-600",  border: "border-orange-200",  hex: "#F97316" },
  admin:           { bg: "bg-red-50",     text: "text-red-500",     border: "border-red-200",     hex: "#EF4444" },
  founder:         { bg: "bg-red-100",    text: "text-red-800",     border: "border-red-300",     hex: "#991B1B" },
};

const ROLE_RANK: Record<StaffRole, number> = {
  guide: 1, moderator: 2, super_moderator: 3, admin: 4, founder: 5,
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
  | "staff.manage"
  | "analytics.view";

export function hasPermission(role: StaffRole, perm: Permission): boolean {
  switch (perm) {
    case "articles.manage":      return roleAtLeast(role, "super_moderator");
    case "wiki.manage":          return roleAtLeast(role, "moderator");
    case "roadmap.manage":       return roleAtLeast(role, "super_moderator");
    case "logs.view":            return roleAtLeast(role, "moderator");
    case "analytics.view":       return roleAtLeast(role, "guide");
    case "tickets.view":         return roleAtLeast(role, "guide");
    case "tickets.respond":      return roleAtLeast(role, "guide");
    case "tickets.close":        return roleAtLeast(role, "moderator");
    case "tickets.admin_category": return roleAtLeast(role, "admin");
    case "staff.manage":         return roleAtLeast(role, "admin");
  }
}
