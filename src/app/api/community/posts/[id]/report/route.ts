import { NextRequest, NextResponse } from "next/server";
import { reportTarget } from "@/lib/community";
import { requireLinkedAccount, isAccount } from "../../../_helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireLinkedAccount(req);
  if (!isAccount(auth)) return auth;
  const body = await req.json().catch(() => ({})) as { reason?: string };
  try {
    await reportTarget(auth.id, "post", id, body.reason ?? null);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
