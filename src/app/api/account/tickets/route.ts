import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/player-auth";
import { listTicketsByAccount } from "@/lib/tickets";

export async function GET(req: NextRequest) {
  const account = await getCurrentAccount(req);
  if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tickets = await listTicketsByAccount(account.id);
  return NextResponse.json(tickets);
}
