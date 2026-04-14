import { NextResponse } from "next/server";

// Aggregated top-voters for the /vote page. Pulls the monthly voter list from
// each vote site, normalizes to { username, votes, sites[] }, and merges by
// lowercased username so the same player showing up on multiple sites is
// counted once with their votes summed.

const MCP_KEY = "hPAhupWrjd6WGFRIOHE6nKGkPyfVVmKVlt";
const TS_KEY  = "RSZNHSHA73V7KZ";
const SP_KEY  = "ZMOMT246";

type SiteId = "minecraftpocket" | "top-serveurs" | "serveur-prive";

interface Voter { username: string; votes: number; sites: SiteId[]; }

async function fetchJson(url: string): Promise<unknown> {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "LinesiaVoteAggregator", Accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function fetchMcp(): Promise<{ username: string; votes: number }[]> {
  if (!MCP_KEY) return [];
  const url = `https://minecraftpocket-servers.com/api/?object=servers&element=voters&key=${MCP_KEY}&month=current&format=json&limit=1000`;
  const j = await fetchJson(url) as { voters?: { nickname?: string; votes?: number | string }[] } | null;
  const rows = j?.voters ?? [];
  return rows
    .map(v => ({ username: String(v.nickname ?? "").trim(), votes: Number(v.votes ?? 0) }))
    .filter(v => v.username !== "");
}

async function fetchTopServeurs(): Promise<{ username: string; votes: number }[]> {
  if (!TS_KEY) return [];
  const url = `https://api.top-serveurs.net/v1/servers/${TS_KEY}/players-ranking`;
  const j = await fetchJson(url) as
    | { players?: { playername?: string; votes?: number }[] }
    | { data?: { playername?: string; votes?: number }[] }
    | { playername?: string; votes?: number }[]
    | null;
  const rows = Array.isArray(j)
    ? j
    : (j as { players?: unknown })?.players as { playername?: string; votes?: number }[] ?? (j as { data?: unknown })?.data as { playername?: string; votes?: number }[] ?? [];
  return (rows ?? [])
    .map(v => ({ username: String(v.playername ?? "").trim(), votes: Number(v.votes ?? 0) }))
    .filter(v => v.username !== "");
}

async function fetchServeurPrive(): Promise<{ username: string; votes: number }[]> {
  if (!SP_KEY) return [];
  const url = `https://serveur-prive.net/api/v1/servers/${SP_KEY}/voters`;
  const j = await fetchJson(url) as
    | { voters?: { username?: string; votes?: number }[] }
    | { data?: { username?: string; votes?: number }[] }
    | null;
  const rows = (j as { voters?: { username?: string; votes?: number }[] })?.voters
    ?? (j as { data?: { username?: string; votes?: number }[] })?.data
    ?? [];
  return rows
    .map(v => ({ username: String(v.username ?? "").trim(), votes: Number(v.votes ?? 0) }))
    .filter(v => v.username !== "");
}

export async function GET() {
  const [mcp, ts, sp] = await Promise.all([fetchMcp(), fetchTopServeurs(), fetchServeurPrive()]);

  const merged = new Map<string, Voter>();
  const push = (site: SiteId, rows: { username: string; votes: number }[]) => {
    for (const r of rows) {
      const k = r.username.toLowerCase();
      const cur = merged.get(k);
      if (cur) {
        cur.votes += r.votes;
        if (!cur.sites.includes(site)) cur.sites.push(site);
      } else {
        merged.set(k, { username: r.username, votes: r.votes, sites: [site] });
      }
    }
  };
  push("minecraftpocket", mcp);
  push("top-serveurs",    ts);
  push("serveur-prive",   sp);

  const voters = [...merged.values()].sort((a, b) => b.votes - a.votes).slice(0, 50);

  return NextResponse.json({
    voters,
    sites: {
      minecraftpocket: true,
      "top-serveurs":  true,
      "serveur-prive": true,
    },
  });
}
