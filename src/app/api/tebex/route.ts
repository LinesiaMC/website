import { NextResponse } from "next/server";

/**
 * GET /api/tebex?type=top-supporters
 * Fetches top supporters from Tebex API.
 * Requires TEBEX_SECRET env var.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const secret = process.env.TEBEX_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Tebex API not configured" },
      { status: 503 }
    );
  }

  if (type === "top-supporters") {
    try {
      const res = await fetch(
        "https://plugin.tebex.io/payments?pager.per_page=50",
        {
          headers: { "X-Tebex-Secret": secret },
          next: { revalidate: 300 }, // cache 5 min
        }
      );

      if (!res.ok) {
        return NextResponse.json(
          { error: "Tebex API error" },
          { status: res.status }
        );
      }

      const data = await res.json();

      // Aggregate totals per player
      const totals: Record<string, { username: string; total: number }> = {};
      for (const payment of data.data || []) {
        const name = payment.player?.name || "Unknown";
        if (!totals[name]) {
          totals[name] = { username: name, total: 0 };
        }
        totals[name].total += payment.amount;
      }

      const sorted = Object.values(totals)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      return NextResponse.json({ supporters: sorted });
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch supporters" },
        { status: 500 }
      );
    }
  }

  if (type === "community-goal") {
    try {
      const res = await fetch(
        "https://plugin.tebex.io/community_goals",
        {
          headers: { "X-Tebex-Secret": secret },
          next: { revalidate: 60 },
        }
      );

      if (!res.ok) {
        return NextResponse.json(
          { error: "Tebex API error" },
          { status: res.status }
        );
      }

      const data = await res.json();
      return NextResponse.json(data);
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch goal" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
