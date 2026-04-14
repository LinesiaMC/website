import { NextRequest, NextResponse } from "next/server";
import { setThreadPinned } from "@/lib/community";
import { requirePermission, isStaffUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(req, "community.moderate");
  if (!isStaffUser(auth)) return auth;
  const body = await req.json().catch(() => ({})) as { pinned?: boolean };
  await setThreadPinned(id, !!body.pinned);
  return NextResponse.json({ ok: true });
}
