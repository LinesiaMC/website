import { NextRequest, NextResponse } from "next/server";
import { listBans, banAccount, unbanAccount } from "@/lib/community";
import { requirePermission, isStaffUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "community.ban");
  if (!isStaffUser(auth)) return auth;
  const bans = await listBans();
  return NextResponse.json({ bans });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "community.ban");
  if (!isStaffUser(auth)) return auth;
  const body = await req.json().catch(() => ({})) as {
    accountId?: string; reason?: string; durationDays?: number;
  };
  if (!body.accountId || typeof body.accountId !== "string") {
    return NextResponse.json({ error: "missing_account" }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : null;
  const duration = Number(body.durationDays);
  const expiresAt = duration > 0 && Number.isFinite(duration)
    ? Date.now() + duration * 24 * 3600 * 1000
    : null;
  await banAccount(body.accountId, auth.id, reason, expiresAt);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePermission(req, "community.ban");
  if (!isStaffUser(auth)) return auth;
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("accountId");
  if (!id) return NextResponse.json({ error: "missing_account" }, { status: 400 });
  await unbanAccount(id);
  return NextResponse.json({ ok: true });
}
