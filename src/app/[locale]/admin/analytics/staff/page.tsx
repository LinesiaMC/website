"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Shield, ShieldBan, ShieldAlert, ShieldCheck, UserX, Lock,
  Ticket, MessageSquare, ClipboardList, Activity, TrendingUp,
} from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { createAnalyticsFetcher, formatNumber } from "@/components/admin/AnalyticsAPI";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

interface StaffOverview {
  totalActions: number;
  actionsToday: number;
  actionsWeek: number;
  uniqueStaff: number;
  totalMutes: number;
  totalBans: number;
  totalKicks: number;
  totalUnmutes: number;
  totalJails: number;
  totalTicketClose: number;
  totalTicketMessage: number;
  totalTicketSummary: number;
}

interface StaffMember {
  staff_id: string;
  staff_name: string;
  total_actions: number;
  mutes: number;
  bans: number;
  kicks: number;
  unmutes: number;
  jails: number;
  ticket_closes: number;
  ticket_messages: number;
  ticket_summaries: number;
}

interface DailyActivity {
  date: string;
  actions: number;
}

interface ActionBreakdown {
  action: string;
  count: number;
}

interface RecentAction {
  id: number;
  staff_id: string;
  staff_name: string;
  action: string;
  source: string;
  target: string | null;
  detail: string | null;
  timestamp: number;
}

const ACTION_LABELS: Record<string, { fr: string; en: string }> = {
  mute: { fr: "Mute", en: "Mute" },
  ban: { fr: "Ban", en: "Ban" },
  kick: { fr: "Kick", en: "Kick" },
  unmute: { fr: "Unmute", en: "Unmute" },
  jail: { fr: "Jail", en: "Jail" },
  ticket_close: { fr: "Ticket ferme", en: "Ticket Closed" },
  ticket_message: { fr: "Msg ticket", en: "Ticket Msg" },
  ticket_summary: { fr: "Recap ticket", en: "Ticket Summary" },
};

const ACTION_COLORS: Record<string, string> = {
  mute: "#F59E0B",
  ban: "#EF4444",
  kick: "#F97316",
  unmute: "#22C55E",
  jail: "#8B5CF6",
  ticket_close: "#3B82F6",
  ticket_message: "#06B6D4",
  ticket_summary: "#EC4899",
};

export default function StaffPage() {
  const { locale } = useParams<{ locale: string }>();
  const { headers } = useAdmin();
  const [overview, setOverview] = useState<StaffOverview | null>(null);
  const [leaderboard, setLeaderboard] = useState<StaffMember[]>([]);
  const [daily, setDaily] = useState<DailyActivity[]>([]);
  const [breakdown, setBreakdown] = useState<ActionBreakdown[]>([]);
  const [recent, setRecent] = useState<RecentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const api = useRef(createAnalyticsFetcher(headers)).current;

  const loadData = useCallback(() => {
    Promise.all([
      api("staff/overview"),
      api("staff/leaderboard"),
      api("staff/daily-activity", { days: "30" }),
      api("staff/actions-breakdown"),
      api("staff/recent", { limit: "30" }),
    ]).then(([o, l, d, b, r]) => {
      setOverview(o);
      setLeaderboard(l);
      setDaily(d);
      setBreakdown(b);
      setRecent(r);
      setLoading(false);
    }).catch(() => {
      setError(locale === "fr" ? "Impossible de charger les statistiques staff." : "Failed to load staff statistics.");
      setLoading(false);
    });
  }, [api, locale]);

  useEffect(() => { loadData(); }, [loadData]);
  useAutoRefresh(loadData);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Activity size={32} className="text-pink mx-auto mb-3 animate-pulse" />
          <p className="text-[14px] text-text-sub">{locale === "fr" ? "Chargement..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="mc-card p-8 text-center max-w-md">
          <Activity size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-[14px] text-text-sub">{error}</p>
        </div>
      </div>
    );
  }

  if (!overview) return null;

  const kpis = [
    { label: locale === "fr" ? "Actions totales" : "Total Actions", value: formatNumber(overview.totalActions), icon: Shield, color: "bg-pink/10 text-pink" },
    { label: locale === "fr" ? "Aujourd'hui" : "Today", value: formatNumber(overview.actionsToday), icon: TrendingUp, color: "bg-green/10 text-green" },
    { label: locale === "fr" ? "Cette semaine" : "This Week", value: formatNumber(overview.actionsWeek), icon: TrendingUp, color: "bg-violet/10 text-violet" },
    { label: "Staff", value: formatNumber(overview.uniqueStaff), icon: ShieldCheck, color: "bg-blue-50 text-blue-500" },
    { label: "Mutes", value: formatNumber(overview.totalMutes), icon: ShieldAlert, color: "bg-yellow-50 text-yellow-500" },
    { label: "Bans", value: formatNumber(overview.totalBans), icon: ShieldBan, color: "bg-red-50 text-red-500" },
    { label: "Kicks", value: formatNumber(overview.totalKicks), icon: UserX, color: "bg-orange-50 text-orange-500" },
    { label: "Jails", value: formatNumber(overview.totalJails), icon: Lock, color: "bg-purple-50 text-purple-500" },
    { label: locale === "fr" ? "Tickets fermes" : "Tickets Closed", value: formatNumber(overview.totalTicketClose), icon: Ticket, color: "bg-blue-50 text-blue-500" },
    { label: locale === "fr" ? "Msgs tickets" : "Ticket Msgs", value: formatNumber(overview.totalTicketMessage), icon: MessageSquare, color: "bg-cyan-50 text-cyan-500" },
    { label: locale === "fr" ? "Recaps" : "Summaries", value: formatNumber(overview.totalTicketSummary), icon: ClipboardList, color: "bg-pink/10 text-pink" },
  ];

  const chartColors = {
    pink: "#8E2DE2",
    violet: "#B84DFF",
    pinkSoft: "rgba(233, 30, 140, 0.1)",
  };

  const selectedMember = selectedStaff ? leaderboard.find(s => s.staff_id === selectedStaff) : null;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-text mb-6">
        {locale === "fr" ? "Statistiques Staff" : "Staff Statistics"}
      </h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="mc-card px-4 py-4">
              <div className={`w-8 h-8 rounded-lg ${kpi.color} flex items-center justify-center mb-2`}>
                <Icon size={15} />
              </div>
              <p className="text-[20px] font-bold text-text">{kpi.value}</p>
              <p className="text-[11px] text-text-muted">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Daily Activity */}
        <div className="mc-card p-5 lg:col-span-2">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Activite staff (30 jours)" : "Staff Activity (30 days)"}
          </h3>
          <div className="h-[250px]">
            <Line
              data={{
                labels: daily.map(d => d.date.slice(5)),
                datasets: [{
                  label: "Actions",
                  data: daily.map(d => d.actions),
                  borderColor: chartColors.pink,
                  backgroundColor: chartColors.pinkSoft,
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  pointHitRadius: 10,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
                scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { beginAtZero: true, grid: { color: "#f0f0f0" }, ticks: { font: { size: 10 } } } },
              }}
            />
          </div>
        </div>

        {/* Action Breakdown */}
        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Repartition actions" : "Actions Breakdown"}
          </h3>
          <div className="h-[250px] flex items-center justify-center">
            {breakdown.length > 0 ? (
              <Doughnut
                data={{
                  labels: breakdown.map(b => ACTION_LABELS[b.action]?.[locale as "fr" | "en"] || b.action),
                  datasets: [{
                    data: breakdown.map(b => b.count),
                    backgroundColor: breakdown.map(b => ACTION_COLORS[b.action] || "#9CA3AF"),
                    borderWidth: 0,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 }, padding: 8 } } },
                }}
              />
            ) : (
              <p className="text-[13px] text-text-muted">{locale === "fr" ? "Aucune donnee" : "No data"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Leaderboard + Staff Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Leaderboard */}
        <div className="mc-card p-5 lg:col-span-2">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {locale === "fr" ? "Classement staff" : "Staff Leaderboard"}
          </h3>
          {leaderboard.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-text-muted font-medium">#</th>
                    <th className="text-left py-2 px-2 text-text-muted font-medium">Staff</th>
                    <th className="text-center py-2 px-1 text-text-muted font-medium">Total</th>
                    <th className="text-center py-2 px-1 text-text-muted font-medium">Mute</th>
                    <th className="text-center py-2 px-1 text-text-muted font-medium">Ban</th>
                    <th className="text-center py-2 px-1 text-text-muted font-medium">Kick</th>
                    <th className="text-center py-2 px-1 text-text-muted font-medium">Jail</th>
                    <th className="text-center py-2 px-1 text-text-muted font-medium">
                      <Ticket size={13} className="inline" />
                    </th>
                    <th className="text-center py-2 px-1 text-text-muted font-medium">
                      <MessageSquare size={13} className="inline" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((s, i) => (
                    <tr
                      key={s.staff_id}
                      className={`border-b border-border/50 cursor-pointer transition-colors ${selectedStaff === s.staff_id ? "bg-pink/5" : "hover:bg-bg-soft"}`}
                      onClick={() => setSelectedStaff(selectedStaff === s.staff_id ? null : s.staff_id)}
                    >
                      <td className="py-2.5 px-2 text-text-muted">{i + 1}</td>
                      <td className="py-2.5 px-2 font-medium text-text">{s.staff_name}</td>
                      <td className="py-2.5 px-1 text-center font-semibold text-pink">{s.total_actions}</td>
                      <td className="py-2.5 px-1 text-center text-yellow-500">{s.mutes || "-"}</td>
                      <td className="py-2.5 px-1 text-center text-red-500">{s.bans || "-"}</td>
                      <td className="py-2.5 px-1 text-center text-orange-500">{s.kicks || "-"}</td>
                      <td className="py-2.5 px-1 text-center text-purple-500">{s.jails || "-"}</td>
                      <td className="py-2.5 px-1 text-center text-blue-500">{s.ticket_closes || "-"}</td>
                      <td className="py-2.5 px-1 text-center text-cyan-500">{s.ticket_messages || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[13px] text-text-muted text-center py-8">
              {locale === "fr" ? "Aucune donnee staff" : "No staff data"}
            </p>
          )}
        </div>

        {/* Staff Detail */}
        <div className="mc-card p-5">
          <h3 className="text-[14px] font-semibold text-text mb-4">
            {selectedMember
              ? selectedMember.staff_name
              : (locale === "fr" ? "Detail staff" : "Staff Detail")}
          </h3>
          {selectedMember ? (
            <div className="space-y-3">
              {[
                { label: "Mutes", value: selectedMember.mutes, color: "bg-yellow-500" },
                { label: "Bans", value: selectedMember.bans, color: "bg-red-500" },
                { label: "Kicks", value: selectedMember.kicks, color: "bg-orange-500" },
                { label: "Unmutes", value: selectedMember.unmutes, color: "bg-green-500" },
                { label: "Jails", value: selectedMember.jails, color: "bg-purple-500" },
                { label: locale === "fr" ? "Tickets fermes" : "Tickets Closed", value: selectedMember.ticket_closes, color: "bg-blue-500" },
                { label: locale === "fr" ? "Msgs tickets" : "Ticket Msgs", value: selectedMember.ticket_messages, color: "bg-cyan-500" },
                { label: locale === "fr" ? "Recaps" : "Summaries", value: selectedMember.ticket_summaries, color: "bg-pink" },
              ].map(({ label, value, color }) => {
                const total = selectedMember.total_actions || 1;
                const pct = Math.round((value / total) * 100);
                return (
                  <div key={label}>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-text-sub">{label}</span>
                      <span className="font-semibold text-text">{value} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-bg-soft rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-border">
                <p className="text-[12px] text-text-muted">
                  Total: <span className="font-semibold text-text">{selectedMember.total_actions}</span> actions
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-text-muted text-center py-8">
              {locale === "fr" ? "Cliquez sur un staff pour voir le detail" : "Click a staff member for details"}
            </p>
          )}
        </div>
      </div>

      {/* Recent Actions */}
      <div className="mc-card p-5">
        <h3 className="text-[14px] font-semibold text-text mb-4">
          {locale === "fr" ? "Actions recentes" : "Recent Actions"}
        </h3>
        {recent.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-text-muted font-medium">Staff</th>
                  <th className="text-left py-2 px-2 text-text-muted font-medium">Action</th>
                  <th className="text-left py-2 px-2 text-text-muted font-medium">Source</th>
                  <th className="text-left py-2 px-2 text-text-muted font-medium">
                    {locale === "fr" ? "Cible" : "Target"}
                  </th>
                  <th className="text-left py-2 px-2 text-text-muted font-medium">
                    {locale === "fr" ? "Detail" : "Detail"}
                  </th>
                  <th className="text-right py-2 px-2 text-text-muted font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-bg-soft transition-colors">
                    <td className="py-2.5 px-2 font-medium text-text">{a.staff_name}</td>
                    <td className="py-2.5 px-2">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
                        style={{ backgroundColor: ACTION_COLORS[a.action] || "#9CA3AF" }}
                      >
                        {ACTION_LABELS[a.action]?.[locale as "fr" | "en"] || a.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-text-sub">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${a.source === "minecraft" ? "bg-green/10 text-green" : "bg-violet/10 text-violet"}`}>
                        {a.source === "minecraft" ? "MC" : "Discord"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-text-sub">{a.target || "-"}</td>
                    <td className="py-2.5 px-2 text-text-sub max-w-[200px] truncate">{a.detail || "-"}</td>
                    <td className="py-2.5 px-2 text-right text-text-muted text-[12px]">
                      {new Date(a.timestamp).toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] text-text-muted text-center py-8">
            {locale === "fr" ? "Aucune action recente" : "No recent actions"}
          </p>
        )}
      </div>
    </div>
  );
}
