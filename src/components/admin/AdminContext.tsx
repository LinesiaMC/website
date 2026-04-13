"use client";

import { createContext, useContext } from "react";
import type { StaffRole, Permission } from "@/lib/roles";

export interface CurrentStaff {
  id: string;
  discordId: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
  microsoftId: string | null;
  microsoftGamertag: string | null;
  microsoftDisplayName: string | null;
  displayName: string | null;
  role: StaffRole;
  createdAt?: number;
  lastLogin?: number | null;
}

interface AdminContextType {
  staff: CurrentStaff;
  can: (perm: Permission) => boolean;
  logout: () => Promise<void>;
  headers: () => Record<string, string>;
}

export const AdminContext = createContext<AdminContextType | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within admin layout");
  return ctx;
}
