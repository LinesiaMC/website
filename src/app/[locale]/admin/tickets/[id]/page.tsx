"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, Lock, Unlock, ShieldAlert, Clock, User, Paperclip, AlertCircle, MessageSquare,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { CATEGORY_LABELS, TicketCategory, TicketStatus } from "@/lib/tickets";

interface Ticket {
  id: string; code: string; playerName: string; contact: string | null;
  category: TicketCategory; subject: string; reason: string; proof: string | null;
  status: TicketStatus; assignedTo: string | null;
  createdAt: number; updatedAt: number; closedAt: number | null;
  closedBy: string | null; closeReason: string | null; closeSummary: string | null;
}
interface Message {
  id: number; ticketId: string; authorType: "player" | "staff" | "system";
  authorName: string; authorRole: string | null; content: string; isInternal: boolean; createdAt: number;
}

export default function TicketDetailPage() {
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const router = useRouter();
  const { can } = useAdmin();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [closeSummary, setCloseSummary] = useState("");
  const [error, setError] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tickets/${id}`, { cache: "no-store" });
    if (!res.ok) { setError("not_found"); setLoading(false); return; }
    const data = await res.json();
    setTicket(data.ticket);
    setMessages(data.messages);
    setLoading(false);
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }), 50);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const sendReply = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    const res = await fetch(`/api/tickets/${id}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: reply.trim(), isInternal: internal }),
    });
    if (res.ok) {
      setReply("");
      setInternal(false);
      await load();
    }
    setSending(false);
  };

  const closeTicket = async () => {
    if (!closeReason.trim()) return;
    const res = await fetch(`/api/tickets/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close", reason: closeReason.trim(), summary: closeSummary.trim() || undefined }),
    });
    if (res.ok) {
      setClosing(false);
      setCloseReason("");
      setCloseSummary("");
      load();
    }
  };

  const reopen = async () => {
    await fetch(`/api/tickets/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reopen" }),
    });
    load();
  };

  if (loading) return <div className="p-10 text-center text-text-muted">{locale === "fr" ? "Chargement..." : "Loading..."}</div>;
  if (error || !ticket) return (
    <div className="p-10 text-center">
      <AlertCircle size={24} className="mx-auto mb-2 text-text-muted" />
      <p className="text-text-sub">{locale === "fr" ? "Ticket introuvable" : "Ticket not found"}</p>
      <button onClick={() => router.back()} className="btn-ghost mt-4 !text-[13px]">{locale === "fr" ? "Retour" : "Back"}</button>
    </div>
  );

  const isClosed = ticket.status === "closed";
  const canClose = can("tickets.close");
  const canRespond = can("tickets.respond");
  const duration = (ticket.closedAt || Date.now()) - ticket.createdAt;
  const msgCount = messages.filter((m) => m.authorType !== "system").length;

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-6">
      <Link href={`/${locale}/admin/tickets`} className="inline-flex items-center gap-1.5 text-[12px] text-text-sub hover:text-pink mb-4">
        <ArrowLeft size={14} />
        {locale === "fr" ? "Retour aux tickets" : "Back to tickets"}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="mc-card overflow-hidden flex flex-col" style={{ minHeight: 600 }}>
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono text-text-muted">{ticket.code}</span>
              <CategoryTag cat={ticket.category} />
              <StatusBadge status={ticket.status} />
              {ticket.category === "admin" && <span className="text-[10px] font-semibold text-red-500 inline-flex items-center gap-1"><ShieldAlert size={10} />admin</span>}
            </div>
            <h1 className="text-[17px] font-bold text-text">{ticket.subject}</h1>
          </div>

          <div ref={chatRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-bg-soft/30" style={{ maxHeight: 520 }}>
            <div className="mc-card p-4 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <User size={14} className="text-text-muted" />
                <span className="text-[13px] font-semibold text-text">{ticket.playerName}</span>
                <span className="text-[11px] text-text-muted">{formatDate(ticket.createdAt)}</span>
              </div>
              <p className="text-[13px] text-text whitespace-pre-wrap">{ticket.reason}</p>
              {ticket.proof && (
                <a href={ticket.proof} target="_blank" rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-pink hover:underline">
                  <Paperclip size={12} />{locale === "fr" ? "Preuve jointe" : "Proof"}
                </a>
              )}
            </div>

            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}

            {isClosed && ticket.closeReason && (
              <div className="mc-card p-4 bg-gray-50 border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <Lock size={13} className="text-gray-500" />
                  <span className="text-[12px] font-semibold text-gray-700">{locale === "fr" ? "Ticket fermé" : "Ticket closed"}</span>
                  <span className="text-[11px] text-text-muted">{locale === "fr" ? "par" : "by"} {ticket.closedBy}</span>
                </div>
                <p className="text-[13px] text-text-sub"><strong>{locale === "fr" ? "Raison :" : "Reason:"}</strong> {ticket.closeReason}</p>
                {ticket.closeSummary && <p className="text-[12px] text-text-sub mt-2"><strong>{locale === "fr" ? "Récap :" : "Summary:"}</strong> {ticket.closeSummary}</p>}
              </div>
            )}
          </div>

          {canRespond && !isClosed && (
            <div className="border-t border-border p-4 bg-white">
              <textarea
                value={reply} onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply(); }}
                placeholder={locale === "fr" ? "Votre réponse... (Ctrl+Enter pour envoyer)" : "Your reply... (Ctrl+Enter to send)"}
                rows={3}
                className="w-full px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] text-text focus:border-pink focus:outline-none resize-y mb-2"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[12px] text-text-sub cursor-pointer">
                  <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-pink" />
                  {locale === "fr" ? "Note interne (staff seulement)" : "Internal note (staff only)"}
                </label>
                <button onClick={sendReply} disabled={!reply.trim() || sending} className="btn-primary !py-2 !px-4 !text-[13px] disabled:opacity-50">
                  <Send size={13} />
                  {locale === "fr" ? "Envoyer" : "Send"}
                </button>
              </div>
            </div>
          )}

          {canRespond && isClosed && canClose && (
            <div className="border-t border-border p-4 bg-white flex items-center justify-end">
              <button onClick={reopen} className="btn-ghost !py-2 !px-4 !text-[13px]">
                <Unlock size={13} />{locale === "fr" ? "Rouvrir" : "Reopen"}
              </button>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="mc-card p-4">
            <h3 className="text-[11px] font-bold text-text-sub uppercase tracking-wider mb-3">{locale === "fr" ? "Détails" : "Details"}</h3>
            <dl className="space-y-2 text-[12px]">
              <Row label={locale === "fr" ? "Joueur" : "Player"} value={ticket.playerName} />
              {ticket.contact && <Row label="Contact" value={ticket.contact} />}
              <Row label={locale === "fr" ? "Catégorie" : "Category"} value={CATEGORY_LABELS[ticket.category].fr} />
              <Row label={locale === "fr" ? "Créé le" : "Created"} value={formatDate(ticket.createdAt)} />
              <Row label={locale === "fr" ? "Mis à jour" : "Updated"} value={formatDate(ticket.updatedAt)} />
              {ticket.closedAt && <Row label={locale === "fr" ? "Fermé le" : "Closed"} value={formatDate(ticket.closedAt)} />}
            </dl>
          </div>

          <div className="mc-card p-4">
            <h3 className="text-[11px] font-bold text-text-sub uppercase tracking-wider mb-3">{locale === "fr" ? "Récapitulatif" : "Summary"}</h3>
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center gap-2 text-text-sub">
                <MessageSquare size={13} />{msgCount} {locale === "fr" ? "message" : "message"}{msgCount > 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-2 text-text-sub">
                <Clock size={13} />{formatDuration(duration)}
              </div>
            </div>
          </div>

          {canClose && !isClosed && (
            <div className="mc-card p-4">
              {!closing ? (
                <button onClick={() => setClosing(true)} className="w-full btn-ghost !py-2 !text-[13px] hover:!bg-red-50 hover:!text-red-500">
                  <Lock size={13} />{locale === "fr" ? "Fermer le ticket" : "Close ticket"}
                </button>
              ) : (
                <div>
                  <h3 className="text-[12px] font-bold text-text mb-2">{locale === "fr" ? "Fermer le ticket" : "Close ticket"}</h3>
                  <label className="text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-1 block">{locale === "fr" ? "Raison (obligatoire)" : "Reason (required)"}</label>
                  <input value={closeReason} onChange={(e) => setCloseReason(e.target.value)}
                    placeholder={locale === "fr" ? "Résolu, spam, doublon..." : "Resolved, spam, duplicate..."}
                    className="w-full px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none mb-2" />
                  <label className="text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-1 block">{locale === "fr" ? "Récap (optionnel)" : "Summary (optional)"}</label>
                  <textarea value={closeSummary} onChange={(e) => setCloseSummary(e.target.value)}
                    rows={3} placeholder={locale === "fr" ? "Résumé de la résolution..." : "Resolution summary..."}
                    className="w-full px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none resize-y mb-2" />
                  <div className="flex items-center gap-2">
                    <button onClick={() => setClosing(false)} className="btn-ghost !py-1.5 !px-3 !text-[12px]">Annuler</button>
                    <button onClick={closeTicket} disabled={!closeReason.trim()}
                      className="btn-primary !py-1.5 !px-3 !text-[12px] !bg-red-500 disabled:opacity-50">
                      <Lock size={12} />{locale === "fr" ? "Fermer" : "Close"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-text-muted shrink-0">{label}</dt>
      <dd className="text-text text-right break-all">{value}</dd>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.authorType === "system") {
    return <div className="text-center text-[11px] text-text-muted italic">{msg.content}</div>;
  }
  const isStaff = msg.authorType === "staff";
  return (
    <div className={`flex ${isStaff ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
        msg.isInternal ? "bg-amber-50 border border-amber-200" :
        isStaff ? "bg-pink text-white" : "bg-white border border-border"
      }`}>
        <div className={`flex items-center gap-2 mb-0.5 text-[11px] ${isStaff && !msg.isInternal ? "text-white/80" : "text-text-muted"}`}>
          <span className="font-semibold">{msg.authorName}</span>
          {msg.authorRole && <span>· {msg.authorRole}</span>}
          {msg.isInternal && <span className="font-bold">· INTERNAL</span>}
          <span>· {formatDate(msg.createdAt)}</span>
        </div>
        <p className={`text-[13px] whitespace-pre-wrap ${isStaff && !msg.isInternal ? "text-white" : "text-text"}`}>{msg.content}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const map = {
    open: "bg-blue-50 text-blue-600",
    pending: "bg-orange-50 text-orange-600",
    closed: "bg-gray-100 text-gray-600",
  };
  return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${map[status]}`}>{status}</span>;
}

function CategoryTag({ cat }: { cat: TicketCategory }) {
  const colors: Record<TicketCategory, string> = {
    purchase: "bg-violet-50 text-violet-600",
    refund: "bg-amber-50 text-amber-600",
    admin: "bg-red-50 text-red-600",
    report: "bg-rose-50 text-rose-600",
    other: "bg-slate-50 text-slate-600",
  };
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${colors[cat]}`}>{CATEGORY_LABELS[cat].fr}</span>;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}j ${h % 24}h`;
}
