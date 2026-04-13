import { getDb, getAll, run } from "./analytics-db";
import {
  StaffRole, Permission, PERMISSIONS, ROLES,
  DEFAULT_PERMISSIONS,
} from "./roles";

export type PermissionMap = Record<StaffRole, Record<Permission, boolean>>;

let cache: PermissionMap | null = null;
let cacheBuiltAt = 0;
const CACHE_TTL_MS = 30_000;

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
