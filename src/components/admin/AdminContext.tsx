"use client";

import { createContext, useContext } from "react";

interface AdminContextType {
  password: string;
  headers: () => Record<string, string>;
}

export const AdminContext = createContext<AdminContextType | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within admin layout");
  return ctx;
}
