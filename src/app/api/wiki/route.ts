import { NextRequest, NextResponse } from "next/server";
import {
  getWikiPages, createWikiPage, updateWikiPage, deleteWikiPage, setWikiPages,
} from "@/lib/wiki";
import { requirePermission, isStaffUser } from "@/lib/auth";

export async function GET() {
  const pages = await getWikiPages();
  return NextResponse.json(pages);
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "wiki.manage");
  if (!isStaffUser(auth)) return auth;
  const body = await req.json();

  if (Array.isArray(body)) {
    await setWikiPages(body);
    return NextResponse.json({ ok: true, count: body.length }, { status: 201 });
  }

  const { slug, title, content, icon, parentId, order } = body;
  if (!slug || !title) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const page = await createWikiPage({
    slug, title, content: content || "", icon: icon || "",
    parentId: parentId ?? null, order: order ?? 0,
  });
  return NextResponse.json(page, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission(req, "wiki.manage");
  if (!isStaffUser(auth)) return auth;
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const page = await updateWikiPage(id, data);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(page);
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePermission(req, "wiki.manage");
  if (!isStaffUser(auth)) return auth;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const ok = await deleteWikiPage(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
