import { NextRequest, NextResponse } from "next/server";
import { getTicketById, closeTicket, reopenTicket, addMessage, getMessages, updateTicketStatus } from "@/lib/tickets";
import { getCurrentStaff } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const staff = await getCurrentStaff(req);
  if (!staff || !hasPermission(staff.role, "tickets.view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ticket = await getTicketById(id);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ticket.category === "admin" && !hasPermission(staff.role, "tickets.admin_category")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const messages = await getMessages(ticket.id, true);
  return NextResponse.json({ ticket, messages });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const staff = await getCurrentStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as {
    action?: "close" | "reopen" | "assign";
    reason?: string; summary?: string; assignedTo?: string | null;
  };
  const ticket = await getTicketById(id);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ticket.category === "admin" && !hasPermission(staff.role, "tickets.admin_category")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (body.action === "close") {
    if (!hasPermission(staff.role, "tickets.close")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!body.reason?.trim()) {
      return NextResponse.json({ error: "Raison de fermeture requise" }, { status: 400 });
    }
    await closeTicket(id, {
      closedBy: (staff.displayName || staff.discordUsername || staff.microsoftGamertag || "staff"),
      closeReason: body.reason.trim(),
      closeSummary: body.summary?.trim() || null,
    });
    await addMessage({
      ticketId: id,
      authorType: "system",
      authorName: "Système",
      content: `Ticket fermé par ${(staff.displayName || staff.discordUsername || staff.microsoftGamertag || "staff")}. Raison : ${body.reason.trim()}`,
    });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "reopen") {
    if (!hasPermission(staff.role, "tickets.close")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await reopenTicket(id);
    await addMessage({
      ticketId: id,
      authorType: "system",
      authorName: "Système",
      content: `Ticket rouvert par ${(staff.displayName || staff.discordUsername || staff.microsoftGamertag || "staff")}.`,
    });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "assign") {
    await updateTicketStatus(id, ticket.status, body.assignedTo ?? null);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
