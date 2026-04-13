import { NextRequest, NextResponse } from "next/server";
import { requirePermission, isStaffUser } from "@/lib/auth";
import { getPermissionMap, bulkSetPermissions } from "@/lib/permissions";
import { ROLES, PERMISSIONS, StaffRole, Permission } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "permissions.manage");
  if (!isStaffUser(auth)) return auth;
  const map = await getPermissionMap({ fresh: true });
  return NextResponse.json({ map });
}

interface ChangeIn { role: StaffRole; permission: Permission; allowed: boolean }

export async function PUT(req: NextRequest) {
  const auth = await requirePermission(req, "permissions.manage");
  if (!isStaffUser(auth)) return auth;

  const body = await req.json().catch(() => ({})) as { changes?: ChangeIn[] };
  const changes = Array.isArray(body.changes) ? body.changes : [];
  if (changes.length === 0) {
    return NextResponse.json({ error: "no_changes" }, { status: 400 });
  }

  // Validate every change up-front so we don't half-apply on error.
  for (const c of changes) {
    if (!ROLES.includes(c.role)) return NextResponse.json({ error: `invalid_role:${c.role}` }, { status: 400 });
    if (!PERMISSIONS.includes(c.permission)) return NextResponse.json({ error: `invalid_permission:${c.permission}` }, { status: 400 });
    if (typeof c.allowed !== "boolean") return NextResponse.json({ error: "invalid_allowed" }, { status: 400 });
    if (c.role === "founder") return NextResponse.json({ error: "founder_immutable" }, { status: 400 });
  }

  await bulkSetPermissions(changes, auth.id);
  const map = await getPermissionMap({ fresh: true });
  return NextResponse.json({ map, applied: changes.length });
}
