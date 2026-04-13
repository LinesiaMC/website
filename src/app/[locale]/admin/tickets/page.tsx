"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LifeBuoy, MessageCircle, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { CATEGORY_LABELS, TicketCategory, TicketStatus } from "@/lib/tickets";

interface TicketRow {
  id: string;
  code: string;
  playerName: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  createdAt: number;
  updatedAt: number;
  closedAt: number | null;
}

export default function TicketsListPage() {
  const { locale } = useParams<{ locale: string }>();
  const { can } = useAdmin();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("open");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    const res = await fetch(`/api/tickets?${params}`, { cache: "no-store" });
    if (res.ok) setTickets(await res.json());
    setLoading(false);
  }, [statusFilter, categoryFilter]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const s = { open: 0, pending: 0, closed: 0 };
    for (const t of tickets) s[t.status]++;
    return s;
  }, [tickets]);

  const categories: (TicketCategory | "all")[] = useMemo(() => {
    const base: (TicketCategory | "all")[] = ["all", "purchase", "refund", "report", "other"];
    if (can("tickets.admin_category")) base.splice(3, 0, "admin");
    return base;
  }, [can]);

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-pink flex items-center justify-center">
          <LifeBuoy size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text">{locale === "fr" ? "Tickets de support" : "Support tickets"}</h1>
          <p className="text-[12px] text-text-muted">{tickets.length} {locale === "fr" ? "résultat" : "result"}{tickets.length > 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon={<MessageCircle size={16} />} label={locale === "fr" ? "Ouverts" : "Open"} value={stats.open} color="text-blue-500 bg-blue-50" />
        <StatCard icon={<Clock size={16} />} label={locale === "fr" ? "En attente" : "Pending"} value={stats.pending} color="text-orange-500 bg-orange-50" />
        <StatCard icon={<CheckCircle2 size={16} />} label={locale === "fr" ? "Fermés" : "Closed"} value={stats.closed} color="text-green-600 bg-green-50" />
      </div>

      <div className="mc-card p-4 mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold text-text-sub uppercase tracking-wider mr-2">Status</span>
        {(["open", "pending", "closed", "all"] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-[12px] px-3 py-1.5 rounded-lg font-medium ${statusFilter === s ? "bg-pink text-white" : "bg-bg-soft text-text-sub hover:bg-border"}`}>
            {s === "all" ? (locale === "fr" ? "Tous" : "All") : s}
          </button>
        ))}
        <span className="text-[12px] font-semibold text-text-sub uppercase tracking-wider ml-4 mr-2">{locale === "fr" ? "Catégorie" : "Category"}</span>
        {categories.map((c) => (
          <button key={c} onClick={() => setCategoryFilter(c)}
            className={`text-[12px] px-3 py-1.5 rounded-lg font-medium ${categoryFilter === c ? "bg-pink text-white" : "bg-bg-soft text-text-sub hover:bg-border"}`}>
            {c === "all" ? (locale === "fr" ? "Toutes" : "All") : CATEGORY_LABELS[c as TicketCategory].fr}
          </button>
        ))}
      </div>

      <div className="mc-card">
        {loading ? (
          <div className="p-10 text-center text-text-muted">{locale === "fr" ? "Chargement..." : "Loading..."}</div>
        ) : tickets.length === 0 ? (
          <div className="p-10 text-center text-text-muted">
            <LifeBuoy size={28} className="mx-auto mb-2 opacity-40" />
            {locale === "fr" ? "Aucun ticket" : "No tickets"}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tickets.map((t) => (
              <Link key={t.id} href={`/${locale}/admin/tickets/${t.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-bg-soft/50 transition-colors">
                <StatusBadge status={t.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-mono text-text-muted">{t.code}</span>
                    <CategoryTag cat={t.category} />
                    {t.category === "admin" && <ShieldAlert size={12} className="text-red-500" />}
                  </div>
                  <p className="text-[14px] font-semibold text-text truncate">{t.subject}</p>
                  <p className="text-[12px] text-text-sub truncate">
                    {t.playerName} · {new Date(t.updatedAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="mc-card p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <p className="text-[11px] text-text-muted uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-text">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const map = {
    open: { label: "open", cls: "bg-blue-50 text-blue-600" },
    pending: { label: "pending", cls: "bg-orange-50 text-orange-600" },
    closed: { label: "closed", cls: "bg-gray-100 text-gray-600" },
  };
  const m = map[status];
  return <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${m.cls}`}>{m.label}</span>;
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
