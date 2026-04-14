import { NextRequest, NextResponse } from "next/server";
import { createPost, validatePostInput } from "@/lib/community";
import { requireLinkedAccount, isAccount, buildAuthor } from "../../../_helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireLinkedAccount(req);
  if (!isAccount(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const validated = validatePostInput(body);
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });

  const author = await buildAuthor(auth);
  const res = await createPost(id, author, validated.content);
  if (!res.ok) {
    const status =
      res.error === "rate_limited" ? 429 :
      res.error === "not_found" ? 404 :
      res.error === "thread_locked" ? 423 :
      res.error === "banned" ? 403 : 400;
    return NextResponse.json({ error: res.error }, { status });
  }
  return NextResponse.json({ post: res.post }, { status: 201 });
}
