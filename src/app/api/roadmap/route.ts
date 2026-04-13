import { NextRequest, NextResponse } from "next/server";
import {
  getRoadmapEntries,
  getRoadmapEntriesByLocale,
  createRoadmapEntry,
  updateRoadmapEntry,
  deleteRoadmapEntry,
  RoadmapStatus,
  RoadmapItem,
} from "@/lib/roadmap";
import { requirePermission, isStaffUser } from "@/lib/auth";

const VALID_STATUS: RoadmapStatus[] = ["planned", "in_progress", "released"];

function sanitizeItems(raw: unknown): RoadmapItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((i) => {
      if (!i || typeof i !== "object") return null;
      const obj = i as Record<string, unknown>;
      const title = typeof obj.title === "string" ? obj.title.trim() : "";
      if (!title) return null;
      return { title, done: Boolean(obj.done) };
    })
    .filter((i): i is RoadmapItem => i !== null);
}

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get("locale");
  const entries = locale ? await getRoadmapEntriesByLocale(locale) : await getRoadmapEntries();
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "roadmap.manage");
  if (!isStaffUser(auth)) return auth;
  const body = await req.json();
  const { version, title, description, status, date, locale, items, sortOrder } = body;
  if (!title || !locale) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const safeStatus: RoadmapStatus = VALID_STATUS.includes(status) ? status : "planned";
  const entry = await createRoadmapEntry({
    version: String(version || ""),
    title: String(title),
    description: String(description || ""),
    status: safeStatus,
    date: String(date || ""),
    locale: locale === "en" ? "en" : "fr",
    items: sanitizeItems(items),
    sortOrder: Number(sortOrder) || 0,
  });
  return NextResponse.json(entry, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission(req, "roadmap.manage");
  if (!isStaffUser(auth)) return auth;
  const body = await req.json();
  const { id, items, status, ...rest } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const data: Record<string, unknown> = { ...rest };
  if (items !== undefined) data.items = sanitizeItems(items);
  if (status !== undefined) {
    data.status = VALID_STATUS.includes(status) ? status : "planned";
  }
  const entry = await updateRoadmapEntry(id, data);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePermission(req, "roadmap.manage");
  if (!isStaffUser(auth)) return auth;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const ok = await deleteRoadmapEntry(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
