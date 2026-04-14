import { randomBytes } from "crypto";
import { getDb, getAll, getOne, run } from "./analytics-db";

export type TicketCategory = "purchase" | "refund" | "admin" | "report" | "other";
export type TicketStatus = "open" | "closed";

export const TICKET_CATEGORIES: TicketCategory[] = ["purchase", "refund", "admin", "report", "other"];

export const CATEGORY_LABELS: Record<TicketCategory, { fr: string; en: string }> = {
  purchase:  { fr: "Achat",       en: "Purchase" },
  refund:    { fr: "Remboursement", en: "Refund" },
  admin:     { fr: "Admin",       en: "Admin" },
  report:    { fr: "Signalement", en: "Report" },
  other:     { fr: "Autres",      en: "Other" },
};

export interface Ticket {
  id: string;
  code: string;
  playerName: string;
  contact: string | null;
  category: TicketCategory;
  subject: string;
  reason: string;
  proof: string | null;
  status: TicketStatus;
  assignedTo: string | null;
  createdAt: number;
  updatedAt: number;
  closedAt: number | null;
  closedBy: string | null;
  closeReason: string | null;
  closeSummary: string | null;
  accountId: string | null;
}

export interface TicketMessage {
  id: number;
  ticketId: string;
  authorType: "player" | "staff" | "system";
  authorName: string;
  authorRole: string | null;
  content: string;
  isInternal: boolean;
  createdAt: number;
}

function rowToTicket(row: Record<string, unknown>): Ticket {
  return {
    id: row.id as string,
    code: row.code as string,
    playerName: row.player_name as string,
    contact: (row.contact as string) || null,
    category: row.category as TicketCategory,
    subject: row.subject as string,
    reason: row.reason as string,
    proof: (row.proof as string) || null,
    status: row.status as TicketStatus,
    assignedTo: (row.assigned_to as string) || null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    closedAt: (row.closed_at as number) || null,
    closedBy: (row.closed_by as string) || null,
    closeReason: (row.close_reason as string) || null,
    closeSummary: (row.close_summary as string) || null,
    accountId: (row.account_id as string) || null,
  };
}

function rowToMessage(row: Record<string, unknown>): TicketMessage {
  return {
    id: row.id as number,
    ticketId: row.ticket_id as string,
    authorType: row.author_type as TicketMessage["authorType"],
    authorName: row.author_name as string,
    authorRole: (row.author_role as string) || null,
    content: row.content as string,
    isInternal: Number(row.is_internal) === 1,
    createdAt: row.created_at as number,
  };
}

function generateCode(): string {
  // Human-readable: LIN-XXXXXX (uppercase alphanumeric)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const buf = randomBytes(6);
  for (let i = 0; i < 6; i++) s += alphabet[buf[i] % alphabet.length];
  return `LIN-${s}`;
}

export async function createTicket(data: {
  playerName: string;
  contact?: string | null;
  category: TicketCategory;
  subject: string;
  reason: string;
  proof?: string | null;
  accountId?: string | null;
}): Promise<Ticket> {
  const db = await getDb();
  const id = Date.now().toString(36) + randomBytes(3).toString("hex");
  const now = Date.now();
  let code = generateCode();
  for (let tries = 0; tries < 3; tries++) {
    const exists = await getOne(db, "SELECT id FROM tickets WHERE code = ?", [code]);
    if (!exists) break;
    code = generateCode();
  }
  await run(db,
    `INSERT INTO tickets (id, code, player_name, contact, category, subject, reason, proof, status, created_at, updated_at, account_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
    [id, code, data.playerName, data.contact ?? null, data.category, data.subject, data.reason, data.proof ?? null, now, now, data.accountId ?? null],
  );
  return {
    id, code, playerName: data.playerName, contact: data.contact ?? null, category: data.category,
    subject: data.subject, reason: data.reason, proof: data.proof ?? null, status: "open",
    assignedTo: null, createdAt: now, updatedAt: now, closedAt: null, closedBy: null, closeReason: null, closeSummary: null,
    accountId: data.accountId ?? null,
  };
}

export async function listTicketsByAccount(accountId: string): Promise<Ticket[]> {
  const db = await getDb();
  const rows = await getAll(db,
    `SELECT * FROM tickets WHERE account_id = ? ORDER BY
      CASE status WHEN 'open' THEN 0 ELSE 1 END,
      updated_at DESC LIMIT 100`,
    [accountId]);
  return rows.map(rowToTicket);
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const db = await getDb();
  const row = await getOne(db, "SELECT * FROM tickets WHERE id = ?", [id]);
  return row ? rowToTicket(row) : null;
}

export async function getTicketByCode(code: string): Promise<Ticket | null> {
  const db = await getDb();
  const row = await getOne(db, "SELECT * FROM tickets WHERE code = ?", [code.toUpperCase()]);
  return row ? rowToTicket(row) : null;
}

export async function listTickets(filters: {
  status?: TicketStatus;
  category?: TicketCategory;
  includeAdmin?: boolean;
  limit?: number;
} = {}): Promise<Ticket[]> {
  const db = await getDb();
  const conds: string[] = [];
  const params: unknown[] = [];
  if (filters.status) { conds.push("status = ?"); params.push(filters.status); }
  if (filters.category) { conds.push("category = ?"); params.push(filters.category); }
  if (filters.includeAdmin === false) { conds.push("category != 'admin'"); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const limit = filters.limit ?? 200;
  const rows = await getAll(db, `SELECT * FROM tickets ${where} ORDER BY
    CASE status WHEN 'open' THEN 0 ELSE 1 END,
    updated_at DESC LIMIT ?`, [...params, limit]);
  return rows.map(rowToTicket);
}

export async function updateTicketStatus(id: string, status: TicketStatus, assignedTo?: string | null): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  if (assignedTo !== undefined) {
    await run(db, "UPDATE tickets SET status = ?, assigned_to = ?, updated_at = ? WHERE id = ?",
      [status, assignedTo, now, id]);
  } else {
    await run(db, "UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?", [status, now, id]);
  }
}

export async function closeTicket(id: string, data: { closedBy: string; closeReason: string; closeSummary?: string | null }): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await run(db,
    "UPDATE tickets SET status = 'closed', closed_at = ?, closed_by = ?, close_reason = ?, close_summary = ?, updated_at = ? WHERE id = ?",
    [now, data.closedBy, data.closeReason, data.closeSummary ?? null, now, id],
  );
}

export async function reopenTicket(id: string): Promise<void> {
  const db = await getDb();
  await run(db,
    "UPDATE tickets SET status = 'open', closed_at = NULL, closed_by = NULL, close_reason = NULL, close_summary = NULL, updated_at = ? WHERE id = ?",
    [Date.now(), id],
  );
}

export async function addMessage(data: {
  ticketId: string;
  authorType: TicketMessage["authorType"];
  authorName: string;
  authorRole?: string | null;
  content: string;
  isInternal?: boolean;
}): Promise<TicketMessage> {
  const db = await getDb();
  const now = Date.now();
  const result = await db.execute({
    sql: `INSERT INTO ticket_messages (ticket_id, author_type, author_name, author_role, content, is_internal, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [data.ticketId, data.authorType, data.authorName, data.authorRole ?? null, data.content, data.isInternal ? 1 : 0, now],
  });
  await run(db, "UPDATE tickets SET updated_at = ?, status = CASE WHEN status = 'closed' THEN 'closed' ELSE 'open' END WHERE id = ?",
    [now, data.ticketId]);
  return {
    id: Number(result.lastInsertRowid),
    ticketId: data.ticketId,
    authorType: data.authorType,
    authorName: data.authorName,
    authorRole: data.authorRole ?? null,
    content: data.content,
    isInternal: !!data.isInternal,
    createdAt: now,
  };
}

export async function getMessages(ticketId: string, includeInternal: boolean): Promise<TicketMessage[]> {
  const db = await getDb();
  const where = includeInternal ? "WHERE ticket_id = ?" : "WHERE ticket_id = ? AND is_internal = 0";
  const rows = await getAll(db, `SELECT * FROM ticket_messages ${where} ORDER BY created_at ASC`, [ticketId]);
  return rows.map(rowToMessage);
}

export async function ticketStats(): Promise<{ open: number; closed: number; total: number }> {
  const db = await getDb();
  const rows = await getAll(db, "SELECT status, COUNT(*) as c FROM tickets GROUP BY status");
  const out = { open: 0, closed: 0, total: 0 };
  for (const r of rows) {
    const s = r.status as TicketStatus;
    const c = r.c as number;
    if (s in out) (out as Record<string, number>)[s] = c;
    out.total += c;
  }
  return out;
}
