import { NextResponse } from "next/server";

let cached: { players: number; max: number; online: boolean; ts: number } | null = null;
const CACHE_TTL = 60_000; // 1 minute

export async function GET() {
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached);
  }

  try {
    const res = await fetch("https://api.mcstatus.io/v2/status/bedrock/play.linesia.net", {
      next: { revalidate: 60 },
    });
    const data = await res.json();

    cached = {
      players: data.players?.online ?? 0,
      max: data.players?.max ?? 0,
      online: data.online ?? false,
      ts: Date.now(),
    };

    return NextResponse.json(cached);
  } catch {
    return NextResponse.json(
      cached ?? { players: 0, max: 0, online: false, ts: Date.now() }
    );
  }
}
