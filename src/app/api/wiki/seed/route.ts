import { NextRequest, NextResponse } from "next/server";
import { setWikiPages, getWikiPages } from "@/lib/wiki";
import { ADMIN_PASSWORD } from "@/lib/admin-config";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if wiki already has data
  const existing = await getWikiPages();
  if (existing.length > 0) {
    return NextResponse.json({ message: "Wiki already has data", count: existing.length });
  }

  // Try to read from data/wiki.json seed file
  const seedPath = path.join(process.cwd(), "data", "wiki.json");
  if (!fs.existsSync(seedPath)) {
    return NextResponse.json({ error: "No seed file found at data/wiki.json" }, { status: 404 });
  }

  const raw = fs.readFileSync(seedPath, "utf-8");
  const pages = JSON.parse(raw);
  await setWikiPages(pages);

  return NextResponse.json({ ok: true, count: pages.length }, { status: 201 });
}
