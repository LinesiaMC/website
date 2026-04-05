import { NextRequest, NextResponse } from "next/server";
import {
  getWikiPages,
  createWikiPage,
  updateWikiPage,
  deleteWikiPage,
  setWikiPages,
} from "@/lib/wiki";
import { ADMIN_PASSWORD } from "@/lib/admin-config";

function checkAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${ADMIN_PASSWORD}`;
}

export async function GET() {
  const pages = await getWikiPages();
  return NextResponse.json(pages);
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();

  // Bulk import
  if (Array.isArray(body)) {
    await setWikiPages(body);
    return NextResponse.json({ ok: true, count: body.length }, { status: 201 });
  }

  const { slug, title, content, icon, parentId, order } = body;
  if (!slug || !title) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const page = await createWikiPage({
    slug,
    title,
    content: content || "",
    icon: icon || "",
    parentId: parentId ?? null,
    order: order ?? 0,
  });
  return NextResponse.json(page, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const page = await updateWikiPage(id, data);
  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(page);
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const ok = await deleteWikiPage(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
