import { NextRequest, NextResponse } from "next/server";
import {
  requirePermission, isStaffUser, listStaff, createStaff, updateStaff, deleteStaff,
  getStaffByDiscordId, getStaffByMicrosoftId,
} from "@/lib/auth";
import { ROLES, StaffRole } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "staff.manage");
  if (!isStaffUser(auth)) return auth;
  return NextResponse.json(await listStaff());
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "staff.manage");
  if (!isStaffUser(auth)) return auth;
  const body = await req.json() as {
    discordId?: string; discordUsername?: string;
    microsoftId?: string; microsoftGamertag?: string;
    displayName?: string; role?: StaffRole;
  };
  const { discordId, discordUsername, microsoftId, microsoftGamertag, displayName, role } = body;
  if (!role) return NextResponse.json({ error: "Missing role" }, { status: 400 });
  if (!ROLES.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  if (!discordId && !microsoftId) {
    return NextResponse.json({ error: "Discord ID ou Microsoft XUID requis" }, { status: 400 });
  }
  if (role === "founder" && auth.role !== "founder") {
    return NextResponse.json({ error: "Only founder can create founder" }, { status: 403 });
  }
  if (discordId) {
    const ex = await getStaffByDiscordId(discordId);
    if (ex) return NextResponse.json({ error: "Discord déjà enregistré" }, { status: 409 });
  }
  if (microsoftId) {
    const ex = await getStaffByMicrosoftId(microsoftId);
    if (ex) return NextResponse.json({ error: "Compte Microsoft déjà enregistré" }, { status: 409 });
  }
  const created = await createStaff({
    discordId: discordId || null,
    discordUsername: discordUsername || null,
    microsoftId: microsoftId || null,
    microsoftGamertag: microsoftGamertag || null,
    microsoftDisplayName: microsoftGamertag || null,
    displayName: displayName || discordUsername || microsoftGamertag || null,
    role,
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission(req, "staff.manage");
  if (!isStaffUser(auth)) return auth;
  const body = await req.json() as { id?: string; role?: StaffRole; displayName?: string };
  const { id, role, displayName } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (role && !ROLES.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  if (role === "founder" && auth.role !== "founder") {
    return NextResponse.json({ error: "Only founder can assign founder" }, { status: 403 });
  }
  const updated = await updateStaff(id, { role, displayName });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePermission(req, "staff.manage");
  if (!isStaffUser(auth)) return auth;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (id === auth.id) return NextResponse.json({ error: "Cannot delete self" }, { status: 400 });
  await deleteStaff(id);
  return NextResponse.json({ ok: true });
}
