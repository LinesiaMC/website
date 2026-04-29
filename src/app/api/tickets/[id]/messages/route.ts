import { NextRequest, NextResponse } from "next/server";
import { addMessage, getTicketById, getTicketByCode, getMessages } from "@/lib/tickets";
import { getCurrentStaff } from "@/lib/auth";
import { getCurrentAccount } from "@/lib/player-auth";
import { hasPermissionForStaff } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/roles";

// Resolves a ticket by id OR code (URL segment can be either).
async function resolveTicket(idOrCode: string) {
  return (await getTicketById(idOrCode)) || (await getTicketByCode(idOrCode));
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json() as { content?: string; isInternal?: boolean; playerCode?: string; playerName?: string };
  const content = body.content?.trim();
  if (!content) return NextResponse.json({ error: "Message vide" }, { status: 400 });
  if (content.length > 4000) return NextResponse.json({ error: "Message trop long" }, { status: 400 });

  // Staff path
  const staff = await getCurrentStaff(req);
  if (staff) {
    if (!(await hasPermissionForStaff(staff, "tickets.respond"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const ticket = await resolveTicket(id);
    if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (ticket.category === "admin" && !(await hasPermissionForStaff(staff, "tickets.admin_category"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const msg = await addMessage({
      ticketId: ticket.id,
      authorType: "staff",
      authorName: (staff.displayName || staff.discordUsername || staff.microsoftGamertag || "staff"),
      authorRole: ROLE_LABELS[staff.role].fr,
      content,
      isInternal: !!body.isInternal,
    });
    return NextResponse.json(msg, { status: 201 });
  }

  // Player path: accept either URL code, body.playerCode, or authenticated account
  const account = await getCurrentAccount(req);
  const code = body.playerCode || id;
  const ticket = await resolveTicket(code);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ticket.status === "closed") {
    return NextResponse.json({ error: "Ticket fermé" }, { status: 400 });
  }
  // If the ticket is tied to an account, only its owner (or anonymous via code match) can reply.
  if (ticket.accountId && account && ticket.accountId !== account.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const authorName = account
    ? (account.linkedPlayerName || account.microsoftGamertag || account.discordUsername || ticket.playerName)
    : ticket.playerName;
  const msg = await addMessage({
    ticketId: ticket.id,
    authorType: "player",
    authorName,
    content,
  });
  return NextResponse.json(msg, { status: 201 });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const staff = await getCurrentStaff(req);
  if (staff && (await hasPermissionForStaff(staff, "tickets.view"))) {
    // Resolve via id OR code so /api/tickets/<code>/messages works for staff too.
    const ticket = await resolveTicket(id);
    if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (ticket.category === "admin" && !(await hasPermissionForStaff(staff, "tickets.admin_category"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const messages = await getMessages(ticket.id, true);
    return NextResponse.json(messages);
  }
  // Public: treat id as code (no internal messages exposed).
  const ticket = await getTicketByCode(id);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const account = await getCurrentAccount(req);
  if (ticket.accountId && (!account || ticket.accountId !== account.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const messages = await getMessages(ticket.id, false);
  return NextResponse.json(messages);
}
