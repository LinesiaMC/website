import { getDb, getAll, run } from "./analytics-db";
import { cacheInvalidate } from "./query-cache";
import {
  StaffRole, Permission, PERMISSIONS, ROLES,
  DEFAULT_PERMISSIONS,
} from "./roles";

export type PermissionMap = Record<StaffRole, Record<Permission, boolean>>;

let cache: PermissionMap | null = null;
let cacheBuiltAt = 0;
const CACHE_TTL_MS = 30_000;

// Per-staff extras cache (small, hot path: hasPermissionForStaff is called
// on every gated request). Keyed by staff_id.
const extrasCache = new Map<string, { value: Permission[]; expires: number }>();
const EXTRAS_TTL_MS = 30_000;

function buildDefault(): PermissionMap {
  return JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
}

/**
 * Returns the live permission map (DB overrides applied on top of defaults).
 * Founder is always all-true at evaluation time — never read from this map.
 */
export async function getPermissionMap(opts: { fresh?: boolean } = {}): Promise<PermissionMap> {
  const now = Date.now();
  if (!opts.fresh && cache && now - cacheBuiltAt < CACHE_TTL_MS) return cache;

  const map = buildDefault();
  try {
    const db = await getDb();
    const rows = await getAll(db, "SELECT role, permission, allowed FROM role_permissions");
    for (const r of rows) {
      const role = r.role as StaffRole;
      const perm = r.permission as Permission;
      if (!ROLES.includes(role) || !PERMISSIONS.includes(perm)) continue;
      map[role][perm] = Number(r.allowed) === 1;
    }
  } catch (e) {
    console.error("[permissions] getPermissionMap failed, using defaults", e);
  }

  cache = map;
  cacheBuiltAt = now;
  return map;
}

export function invalidatePermissionCache(): void {
  cache = null;
  cacheBuiltAt = 0;
  // Role-permission changes also flip what each staff member can see in
  // analytics dashboards; punch through the read cache for staff/auth views.
  cacheInvalidate(["staff/", "auth/"]);
}

export function invalidateStaffExtrasCache(staffId?: string): void {
  if (staffId) extrasCache.delete(staffId);
  else extrasCache.clear();
}

export async function hasPermissionDb(role: StaffRole, perm: Permission): Promise<boolean> {
  if (role === "founder") return true;
  const map = await getPermissionMap();
  return map[role]?.[perm] ?? false;
}

/**
 * Returns just the permissions allowed for a given role (used to ship a
 * compact map to the client). Founder gets every permission set to true.
 */
export async function getPermissionsForRole(role: StaffRole): Promise<Record<Permission, boolean>> {
  if (role === "founder") {
    const all: Record<Permission, boolean> = {} as Record<Permission, boolean>;
    for (const p of PERMISSIONS) all[p] = true;
    return all;
  }
  const map = await getPermissionMap();
  return { ...map[role] };
}

export interface SetPermissionInput {
  role: StaffRole;
  permission: Permission;
  allowed: boolean;
  actor: string;
}

export async function setPermission({ role, permission, allowed, actor }: SetPermissionInput): Promise<void> {
  if (role === "founder") {
    // Founder permissions are not editable — they always have everything.
    throw new Error("founder_immutable");
  }
  if (!ROLES.includes(role)) throw new Error("invalid_role");
  if (!PERMISSIONS.includes(permission)) throw new Error("invalid_permission");

  const db = await getDb();
  const now = Date.now();
  await run(db,
    `INSERT INTO role_permissions (role, permission, allowed, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(role, permission) DO UPDATE SET
       allowed=excluded.allowed, updated_at=excluded.updated_at, updated_by=excluded.updated_by`,
    [role, permission, allowed ? 1 : 0, now, actor]);
  invalidatePermissionCache();
}

export async function bulkSetPermissions(
  changes: Array<{ role: StaffRole; permission: Permission; allowed: boolean }>,
  actor: string,
): Promise<void> {
  for (const c of changes) {
    if (c.role === "founder") continue; // silently ignore — founder is locked
    await setPermission({ ...c, actor });
  }
}

// =================================================================
// Per-staff extra permissions (overlays role defaults for individuals
// who need one-off permissions without a full role — e.g. a player
// allowed to manage the wiki without becoming a moderator).
// =================================================================

export async function listStaffExtras(staffId: string): Promise<Permission[]> {
  const now = Date.now();
  const hit = extrasCache.get(staffId);
  if (hit && hit.expires > now) return hit.value;
  const db = await getDb();
  const rows = await getAll(db,
    "SELECT permission FROM staff_extra_permissions WHERE staff_id = ? AND allowed = 1",
    [staffId]);
  const value = rows
    .map((r) => r.permission as Permission)
    .filter((p): p is Permission => PERMISSIONS.includes(p));
  extrasCache.set(staffId, { value, expires: now + EXTRAS_TTL_MS });
  return value;
}

export async function listAllExtras(): Promise<Record<string, Permission[]>> {
  const db = await getDb();
  const rows = await getAll(db,
    "SELECT staff_id, permission FROM staff_extra_permissions WHERE allowed = 1");
  const out: Record<string, Permission[]> = {};
  for (const r of rows) {
    const sid = r.staff_id as string;
    const p = r.permission as Permission;
    if (!PERMISSIONS.includes(p)) continue;
    (out[sid] ||= []).push(p);
  }
  return out;
}

export async function grantStaffExtra(staffId: string, permission: Permission, actor: string): Promise<void> {
  if (!PERMISSIONS.includes(permission)) throw new Error("invalid_permission");
  const db = await getDb();
  await run(db,
    `INSERT INTO staff_extra_permissions (staff_id, permission, allowed, granted_at, granted_by)
     VALUES (?, ?, 1, ?, ?)
     ON CONFLICT(staff_id, permission) DO UPDATE SET
       allowed = 1, granted_at = excluded.granted_at, granted_by = excluded.granted_by`,
    [staffId, permission, Date.now(), actor]);
  invalidateStaffExtrasCache(staffId);
  cacheInvalidate(["staff/", "auth/"]);
}

export async function revokeStaffExtra(staffId: string, permission: Permission): Promise<void> {
  const db = await getDb();
  await run(db,
    "DELETE FROM staff_extra_permissions WHERE staff_id = ? AND permission = ?",
    [staffId, permission]);
  invalidateStaffExtrasCache(staffId);
  cacheInvalidate(["staff/", "auth/"]);
}

export async function revokeAllStaffExtras(staffId: string): Promise<void> {
  const db = await getDb();
  await run(db, "DELETE FROM staff_extra_permissions WHERE staff_id = ?", [staffId]);
  invalidateStaffExtrasCache(staffId);
  cacheInvalidate(["staff/", "auth/"]);
}

/** Merges role defaults (+ DB overrides) with per-staff extra grants. */
export async function getPermissionsForStaff(staff: { id: string; role: StaffRole }): Promise<Record<Permission, boolean>> {
  const base = await getPermissionsForRole(staff.role);
  if (staff.role === "founder") return base;
  const extras = await listStaffExtras(staff.id);
  for (const p of extras) base[p] = true;
  return base;
}

export async function hasPermissionForStaff(staff: { id: string; role: StaffRole }, perm: Permission): Promise<boolean> {
  if (staff.role === "founder") return true;
  if (await hasPermissionDb(staff.role, perm)) return true;
  const extras = await listStaffExtras(staff.id);
  return extras.includes(perm);
}
