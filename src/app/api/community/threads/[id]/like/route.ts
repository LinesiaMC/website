import { NextRequest, NextResponse } from "next/server";
import { toggleLike } from "@/lib/community";
import { requireLinkedAccount, isAccount } from "../../../_helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireLinkedAccount(req);
  if (!isAccount(auth)) return auth;
  try {
    const r = await toggleLike(auth.id, "thread", id);
    return NextResponse.json(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return NextResponse.json({ error: msg }, { status: 404 });
  }
}
