import { NextRequest, NextResponse } from "next/server";
import {
  listThreads, createThread, validateThreadInput, validateCategory,
} from "@/lib/community";
import { getCurrentAccount } from "@/lib/player-auth";
import { requireLinkedAccount, isAccount, buildAuthor } from "../_helpers";

export async function GET(req: NextRequest) {
  const account = await getCurrentAccount(req);
  const { searchParams } = req.nextUrl;
  const category = validateCategory(searchParams.get("category"));
  const search = searchParams.get("q");
  const sort = (searchParams.get("sort") as "recent" | "top" | "new") || "recent";
  const limit = parseInt(searchParams.get("limit") || "25", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const result = await listThreads({
    category,
    search,
    sort,
    limit,
    offset,
    viewerAccountId: account?.id ?? null,
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const auth = await requireLinkedAccount(req);
  if (!isAccount(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const validated = validateThreadInput(body);
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });

  const author = await buildAuthor(auth);
  const res = await createThread({
    category: validated.category,
    title: validated.title,
    body: validated.content,
    author,
  });
  if (!res.ok) {
    const status = res.error === "rate_limited" ? 429 : res.error === "banned" ? 403 : 400;
    return NextResponse.json({ error: res.error }, { status });
  }
  return NextResponse.json({ thread: res.thread }, { status: 201 });
}
