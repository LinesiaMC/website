import { NextRequest, NextResponse } from "next/server";
import { addMessage, getTicketById, getTicketByCode, getMessages } from "@/lib/tickets";
import { getCurrentStaff } from "@/lib/auth";
import { hasPermission, ROLE_LABELS } from "@/lib/roles";

// Staff reply (authenticated)
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json() as { content?: string; isInternal?: boolean; playerCode?: string; playerName?: string };
  const content = body.content?.trim();
  if (!content) return NextResponse.json({ error: "Message vide" }, { status: 400 });
  if (content.length > 4000) return NextResponse.json({ error: "Message trop long" }, { status: 400 });

  // Staff path
  const staff = await getCurrentStaff(req);
  if (staff) {
    if (!hasPermission(staff.role, "tickets.respond")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const ticket = await getTicketById(id);
    if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (ticket.category === "admin" && !hasPermission(staff.role, "tickets.admin_category")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const msg = await addMessage({
      ticketId: id,
      authorType: "staff",
      authorName: (staff.displayName || staff.discordUsername || staff.microsoftGamertag || "staff"),
      authorRole: ROLE_LABELS[staff.role].fr,
      content,
      isInternal: !!body.isInternal,
    });
    return NextResponse.json(msg, { status: 201 });
  }

  // Player path: identify via code in body (id param is treated as ticket code here)
  const code = body.playerCode || id;
  const ticket = await getTicketByCode(code);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ticket.status === "closed") {
    return NextResponse.json({ error: "Ticket fermé" }, { status: 400 });
  }
  const msg = await addMessage({
    ticketId: ticket.id,
    authorType: "player",
    authorName: ticket.playerName,
    content,
  });
  return NextResponse.json(msg, { status: 201 });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const staff = await getCurrentStaff(req);
  if (staff && hasPermission(staff.role, "tickets.view")) {
    const messages = await getMessages(id, true);
    return NextResponse.json(messages);
  }
  // Public: treat id as code
  const ticket = await getTicketByCode(id);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const messages = await getMessages(ticket.id, false);
  return NextResponse.json(messages);
}
