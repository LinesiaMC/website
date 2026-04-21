import { NextRequest, NextResponse } from "next/server";
import { requirePermission, isStaffUser } from "@/lib/auth";
import { lookupReferral } from "@/lib/referral";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "community.view");
  if (!isStaffUser(auth)) return auth;

  const code = (req.nextUrl.searchParams.get("code") ?? "").trim();
  if (!code) return NextResponse.json({ error: "missing_code" }, { status: 400 });
  if (!/^[A-Z0-9]{4,12}$/i.test(code)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  const result = await lookupReferral(code);
  if (!result) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(result);
}
