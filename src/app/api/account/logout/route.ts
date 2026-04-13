import { NextRequest, NextResponse } from "next/server";
import { PLAYER_SESSION_COOKIE, deletePlayerSession } from "@/lib/player-auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(PLAYER_SESSION_COOKIE)?.value;
  if (token) await deletePlayerSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(PLAYER_SESSION_COOKIE);
  return res;
}
