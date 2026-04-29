import { NextRequest, NextResponse } from "next/server";
import { createTicket, listTickets, addMessage, getTicketByCode, getMessages, TICKET_CATEGORIES, TicketCategory, TicketStatus } from "@/lib/tickets";
import { getCurrentStaff } from "@/lib/auth";
import { getCurrentAccount } from "@/lib/player-auth";
import { hasPermissionForStaff } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (code) {
    // public: retrieve ticket by code
    const ticket = await getTicketByCode(code);
    if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const messages = await getMessages(ticket.id, false);
    return NextResponse.json({ ticket, messages });
  }

  const staff = await getCurrentStaff(req);
  if (!staff || !(await hasPermissionForStaff(staff, "tickets.view"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const status = req.nextUrl.searchParams.get("status") as TicketStatus | null;
  const category = req.nextUrl.searchParams.get("category") as TicketCategory | null;
  const includeAdmin = await hasPermissionForStaff(staff, "tickets.admin_category");
  const tickets = await listTickets({
    status: status || undefined,
    category: category || undefined,
    includeAdmin,
  });
  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    playerName?: string; contact?: string; category?: TicketCategory;
    subject?: string; reason?: string; proof?: string;
  };
  const { playerName, contact, category, subject, reason, proof } = body;
  if (!playerName || !category || !subject || !reason) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }
  if (!TICKET_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }
  if (playerName.length > 60 || subject.length > 120 || reason.length > 4000) {
    return NextResponse.json({ error: "Contenu trop long" }, { status: 400 });
  }
  const account = await getCurrentAccount(req);
  const ticket = await createTicket({
    playerName: playerName.trim(),
    contact: contact?.trim() || null,
    category,
    subject: subject.trim(),
    reason: reason.trim(),
    proof: proof?.trim() || null,
    accountId: account?.id ?? null,
  });
  await addMessage({
    ticketId: ticket.id,
    authorType: "system",
    authorName: "Système",
    content: `Ticket ouvert par ${ticket.playerName}. Catégorie : ${ticket.category}.`,
  });
  return NextResponse.json(ticket, { status: 201 });
}
