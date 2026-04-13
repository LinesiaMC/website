import { NextRequest, NextResponse } from "next/server";
import { getArticles, getArticlesByLocale, createArticle, updateArticle, deleteArticle } from "@/lib/articles";
import { requirePermission, isStaffUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get("locale");
  const articles = locale ? await getArticlesByLocale(locale) : await getArticles();
  return NextResponse.json(articles);
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "articles.manage");
  if (!isStaffUser(auth)) return auth;
  const body = await req.json();
  const { title, excerpt, content, date, locale } = body;
  if (!title || !excerpt || !content || !date || !locale) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const article = await createArticle({ title, excerpt, content, date, locale });
  return NextResponse.json(article, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission(req, "articles.manage");
  if (!isStaffUser(auth)) return auth;
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const article = await updateArticle(id, data);
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(article);
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePermission(req, "articles.manage");
  if (!isStaffUser(auth)) return auth;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const ok = await deleteArticle(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
