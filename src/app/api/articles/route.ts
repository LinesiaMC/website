import { NextRequest, NextResponse } from "next/server";
import { getArticles, createArticle, updateArticle, deleteArticle } from "@/lib/articles";
import { ADMIN_PASSWORD } from "@/lib/admin-config";

function checkAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${ADMIN_PASSWORD}`;
}

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get("locale");
  let articles = getArticles();
  if (locale) {
    articles = articles
      .filter((a) => a.locale === locale)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  return NextResponse.json(articles);
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { title, excerpt, content, date, locale } = body;
  if (!title || !excerpt || !content || !date || !locale) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const article = createArticle({ title, excerpt, content, date, locale });
  return NextResponse.json(article, { status: 201 });
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
  const article = updateArticle(id, data);
  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(article);
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const ok = deleteArticle(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
