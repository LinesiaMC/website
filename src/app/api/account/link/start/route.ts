import { NextRequest, NextResponse } from "next/server";
import { getDb, getOne } from "@/lib/analytics-db";
import { requirePlayer, setLinkCode, confirmLink, isPlayerAccount } from "@/lib/player-auth";

export async function POST(req: NextRequest) {
  const acc = await requirePlayer(req);
  if (!isPlayerAccount(acc)) return acc;

  const body = await req.json().catch(() => ({})) as { pseudo?: string };
  const pseudo = (body.pseudo || "").trim();
  if (!pseudo || pseudo.length > 60) {
    return NextResponse.json({ error: "invalid_pseudo" }, { status: 400 });
  }

  // If MS gamertag matches exactly, auto-link without code.
  if (acc.microsoftGamertag && pseudo.toLowerCase() === acc.microsoftGamertag.toLowerCase()) {
    const db = await getDb();
    const p = await getOne(db, "SELECT uuid, username FROM players WHERE username = ? COLLATE NOCASE LIMIT 1", [pseudo]);
    if (p) {
      await confirmLink(acc.id, p.uuid as string, p.username as string);
      return NextResponse.json({ ok: true, autoLinked: true, uuid: p.uuid, name: p.username });
    }
  }

  const code = await setLinkCode(acc.id, pseudo);
  return NextResponse.json({ ok: true, code, command: `/link ${code}` });
}
