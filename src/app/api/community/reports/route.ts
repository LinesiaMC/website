import { NextRequest, NextResponse } from "next/server";
import { listOpenReports, resolveReport } from "@/lib/community";
import { requirePermission, isStaffUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "community.moderate");
  if (!isStaffUser(auth)) return auth;
  const reports = await listOpenReports(100);
  return NextResponse.json({ reports });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission(req, "community.moderate");
  if (!isStaffUser(auth)) return auth;
  const body = await req.json().catch(() => ({})) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  await resolveReport(body.id, auth.id);
  return NextResponse.json({ ok: true });
}
