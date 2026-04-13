"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LifeBuoy, Send, User, Lock, ArrowLeft, Paperclip, AlertCircle, Clock } from "lucide-react";
import { CATEGORY_LABELS, TicketCategory, TicketStatus } from "@/lib/tickets";

interface Ticket {
  id: string; code: string; playerName: string; category: TicketCategory;
  subject: string; reason: string; proof: string | null; status: TicketStatus;
  createdAt: number; updatedAt: number; closedAt: number | null;
  closedBy: string | null; closeReason: string | null; closeSummary: string | null;
}
interface Message {
  id: number; ticketId: string; authorType: "player" | "staff" | "system";
  authorName: string; authorRole: string | null; content: string; createdAt: number;
}

export default function PublicTicketPage() {
  const { locale, code } = useParams<{ locale: string; code: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tickets?code=${encodeURIComponent(code)}`, { cache: "no-store" });
    if (!res.ok) { setError(true); setLoading(false); return; }
    const data = await res.json();
    setTicket(data.ticket);
    setMessages(data.messages);
    setLoading(false);
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }), 50);
  }, [code]);

  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, [load]);

  const sendReply = async () => {
    if (!reply.trim() || sending || !ticket) return;
    setSending(true);
    const res = await fetch(`/api/tickets/${ticket.code}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: reply.trim() }),
    });
    if (res.ok) { setReply(""); await load(); }
    setSending(false);
  };

  if (loading) return <div className="min-h-screen bg-bg-soft flex items-center justify-center text-text-muted">{locale === "fr" ? "Chargement..." : "Loading..."}</div>;
  if (error || !ticket) return (
    <div className="min-h-screen bg-bg-soft flex items-center justify-center p-4">
      <div className="mc-card p-8 text-center max-w-sm">
        <AlertCircle size={28} className="mx-auto mb-3 text-text-muted" />
        <h2 className="text-[15px] font-bold text-text mb-1">{locale === "fr" ? "Ticket introuvable" : "Ticket not found"}</h2>
        <p className="text-[13px] text-text-sub mb-4">{locale === "fr" ? "Vérifie le code et réessaye." : "Check the code and try again."}</p>
        <Link href={`/${locale}/support`} className="btn-primary !py-2 !px-4 !text-[13px]">{locale === "fr" ? "Retour au support" : "Back to support"}</Link>
      </div>
    </div>
  );

  const isClosed = ticket.status === "closed";

  return (
    <div className="min-h-screen bg-bg-soft py-8 px-4">
      <div className="max-w-[800px] mx-auto">
        <Link href={`/${locale}/support`} className="inline-flex items-center gap-1.5 text-[12px] text-text-sub hover:text-pink mb-4">
          <ArrowLeft size={14} />{locale === "fr" ? "Support" : "Support"}
        </Link>

        <div className="mc-card overflow-hidden flex flex-col" style={{ minHeight: 600 }}>
          <div className="px-5 py-4 border-b border-border bg-white">
            <div className="flex items-center gap-2 mb-1.5">
              <LifeBuoy size={14} className="text-pink" />
              <span className="text-[11px] font-mono text-text-muted">{ticket.code}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-50 text-violet-600">{CATEGORY_LABELS[ticket.category].fr}</span>
              <StatusBadge status={ticket.status} />
            </div>
            <h1 className="text-[17px] font-bold text-text">{ticket.subject}</h1>
          </div>

          <div ref={chatRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-bg-soft/30" style={{ maxHeight: 500 }}>
            <div className="mc-card p-4 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <User size={14} className="text-text-muted" />
                <span className="text-[13px] font-semibold text-text">{ticket.playerName}</span>
                <span className="text-[11px] text-text-muted">{formatDate(ticket.createdAt)}</span>
              </div>
              <p className="text-[13px] text-text whitespace-pre-wrap">{ticket.reason}</p>
              {ticket.proof && (
                <a href={ticket.proof} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-pink hover:underline">
                  <Paperclip size={12} />{locale === "fr" ? "Preuve" : "Proof"}
                </a>
              )}
            </div>

            {messages.map((m) => <MessageBubble key={m.id} msg={m} playerName={ticket.playerName} />)}

            {isClosed && ticket.closeReason && (
              <div className="mc-card p-4 bg-gray-50 border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <Lock size={13} className="text-gray-500" />
                  <span className="text-[12px] font-semibold text-gray-700">{locale === "fr" ? "Ticket fermé" : "Ticket closed"}</span>
                </div>
                <p className="text-[13px] text-text-sub"><strong>{locale === "fr" ? "Raison :" : "Reason:"}</strong> {ticket.closeReason}</p>
                {ticket.closeSummary && <p className="text-[12px] text-text-sub mt-2">{ticket.closeSummary}</p>}
              </div>
            )}
          </div>

          {!isClosed ? (
            <div className="border-t border-border p-4 bg-white">
              <textarea value={reply} onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply(); }}
                placeholder={locale === "fr" ? "Ta réponse..." : "Your reply..."} rows={3} maxLength={4000}
                className="w-full px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] focus:border-pink focus:outline-none resize-y mb-2" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-muted flex items-center gap-1"><Clock size={11} />{locale === "fr" ? "Mis à jour auto toutes les 15s" : "Auto-refresh every 15s"}</span>
                <button onClick={sendReply} disabled={!reply.trim() || sending} className="btn-primary !py-2 !px-4 !text-[13px] disabled:opacity-50">
                  <Send size={13} />{locale === "fr" ? "Envoyer" : "Send"}
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-border p-4 bg-white text-center text-[12px] text-text-muted">
              {locale === "fr" ? "Ce ticket est fermé, aucune réponse possible." : "This ticket is closed."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, playerName }: { msg: Message; playerName: string }) {
  if (msg.authorType === "system") {
    return <div className="text-center text-[11px] text-text-muted italic">{msg.content}</div>;
  }
  const isMine = msg.authorType === "player" && msg.authorName === playerName;
  const isStaff = msg.authorType === "staff";
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
        isMine ? "bg-pink text-white" :
        isStaff ? "bg-violet-50 border border-violet-200" : "bg-white border border-border"
      }`}>
        <div className={`flex items-center gap-2 mb-0.5 text-[11px] ${isMine ? "text-white/80" : "text-text-muted"}`}>
          <span className="font-semibold">{msg.authorName}</span>
          {msg.authorRole && <span>· {msg.authorRole}</span>}
          <span>· {formatDate(msg.createdAt)}</span>
        </div>
        <p className={`text-[13px] whitespace-pre-wrap ${isMine ? "text-white" : "text-text"}`}>{msg.content}</p>
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

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
