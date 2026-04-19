"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { TrendingUp, Activity, CalendarRange, Users, UserCheck, Hourglass, Timer } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";
import { createAnalyticsFetcher, formatDuration, formatNumber } from "@/components/admin/AnalyticsAPI";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler } from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

interface RetentionDay {
  date: string;
  newPlayers: number;
  returnedDay1: number;
  returnedWeek: number;
  returnedEver: number;
  retentionDay1: number;
  retentionWeek: number;
  retentionEver: number;
}

interface Bucket { label: string; count: number; }

interface CohortSummary {
  total: number;
  returned: number;
  oneAndDone: number;
  retentionEver: number;
  avgPlaytime: number;
  medianPlaytime: number;
  avgSessionCount: number;
  totalPlaytimeBuckets: Bucket[];
  firstSession: {
    total: number;
    avgDuration: number;
    buckets: Bucket[];
  };
}

interface RetentionResponse {
  range: { from: number; to: number; days: number };
  days: RetentionDay[];
  cohort: CohortSummary;
}

const DAY_MS = 86_400_000;

function daysAgo(dateStr: string): number {
  const now = new Date();
  const d = new Date(dateStr);
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().split("T")[0];
}

function fromIsoDate(iso: string): number {
  return new Date(iso + "T00:00:00Z").getTime();
}

export default function RetentionPage() {
  const { locale } = useParams<{ locale: string }>();
  const { headers } = useAdmin();
  const [data, setData] = useState<RetentionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Mode: "preset" uses a rolling N-day window ending now.
  // "custom" uses explicit from/to dates (inclusive, whole days).
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [days, setDays] = useState("30");
  const now = Date.now();
  const [fromDate, setFromDate] = useState(toIsoDate(now - 30 * DAY_MS));
  const [toDate, setToDate] = useState(toIsoDate(now));

  const api = useRef(createAnalyticsFetcher(headers)).current;

  const queryParams = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    if (mode === "custom") {
      out.from = String(fromIsoDate(fromDate));
      // `to` is exclusive in the API; add a day so the picked end date is included.
      out.to = String(fromIsoDate(toDate) + DAY_MS);
    } else {
      out.days = days;
    }
    return out;
  }, [mode, days, fromDate, toDate]);

  const loadData = useCallback(() => {
    api("stats/retention", queryParams)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError(locale === "fr" ? "Erreur de chargement" : "Loading error"); setLoading(false); });
  }, [api, queryParams, locale]);

  useEffect(() => { setLoading(true); loadData(); }, [loadData]);
  useAutoRefresh(loadData);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="mc-card p-8 text-center">
          <p className="text-[14px] text-text-sub">{error}</p>
        </div>
      </div>
    );
  }

  const retention = data?.days ?? [];
  const cohort = data?.cohort;

  // Averages over eligible days only (cohort needs enough time to materialise)
  const day1Eligible = retention.filter(r => r.newPlayers > 0 && daysAgo(r.date) >= 2);
  const weekEligible = retention.filter(r => r.newPlayers > 0 && daysAgo(r.date) >= 8);
  const avgDay1 = day1Eligible.length > 0
    ? Math.round(day1Eligible.reduce((s, r) => s + r.retentionDay1, 0) / day1Eligible.length)
    : 0;
  const avgWeek = weekEligible.length > 0
    ? Math.round(weekEligible.reduce((s, r) => s + r.retentionWeek, 0) / weekEligible.length)
    : 0;

  const totalNew = cohort?.total ?? retention.reduce((s, r) => s + r.newPlayers, 0);

  // Helper for bucket bar charts
  const bucketChartData = (buckets: Bucket[], color: string) => ({
    labels: buckets.map(b => b.label),
    datasets: [{
      data: buckets.map(b => b.count),
      backgroundColor: color,
      borderRadius: 4,
    }],
  });
  const bucketChartOptions = (total: number) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { y: number | null } }) => {
            const count = Number(ctx.parsed.y) || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return `${count} (${pct}%)`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: "#f0f0f0" }, ticks: { font: { size: 10 } } },
    },
  } as const);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink flex items-center justify-center">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text">Retention</h1>
            <p className="text-[12px] text-text-muted">
              {locale === "fr" ? "Combien de nouveaux joueurs reviennent, et combien de temps ils restent" : "How many new players come back, and how long they stay"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border-2 border-border bg-white overflow-hidden text-[12px]">
            <button
              type="button"
              onClick={() => setMode("preset")}
              className={`px-3 py-2 font-medium transition-colors ${mode === "preset" ? "bg-pink text-white" : "text-text-sub hover:bg-bg-soft"}`}
            >
              {locale === "fr" ? "Récent" : "Rolling"}
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={`px-3 py-2 font-medium transition-colors ${mode === "custom" ? "bg-pink text-white" : "text-text-sub hover:bg-bg-soft"}`}
            >
              <span className="inline-flex items-center gap-1">
                <CalendarRange size={12} />
                {locale === "fr" ? "Plage" : "Range"}
              </span>
            </button>
          </div>
          {mode === "preset" ? (
            <select
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="px-3 py-2 rounded-xl border-2 border-border bg-white text-[13px] text-text focus:border-pink focus:outline-none"
            >
              <option value="7">7 {locale === "fr" ? "jours" : "days"}</option>
              <option value="14">14 {locale === "fr" ? "jours" : "days"}</option>
              <option value="30">30 {locale === "fr" ? "jours" : "days"}</option>
              <option value="60">60 {locale === "fr" ? "jours" : "days"}</option>
              <option value="90">90 {locale === "fr" ? "jours" : "days"}</option>
              <option value="180">180 {locale === "fr" ? "jours" : "days"}</option>
            </select>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2 py-2 rounded-xl border-2 border-border bg-white text-[12px] text-text focus:border-pink focus:outline-none"
              />
              <span className="text-text-muted text-[12px]">→</span>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                max={toIsoDate(Date.now())}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2 py-2 rounded-xl border-2 border-border bg-white text-[12px] text-text focus:border-pink focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Activity size={32} className="text-pink animate-pulse" />
        </div>
      ) : (
        <>
          {/* Summary cards — top row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <SummaryCard
              icon={Users} color="bg-pink/10 text-pink"
              label={locale === "fr" ? "Nouveaux" : "New Players"}
              value={String(totalNew)}
              hint={mode === "custom"
                ? `${fromDate} → ${toDate}`
                : (locale === "fr" ? `${days} derniers jours` : `last ${days} days`)}
            />
            <SummaryCard
              icon={UserCheck} color="bg-green/10 text-green"
              label={locale === "fr" ? "Au moins 1 retour" : "≥ 1 return"}
              value={cohort ? `${cohort.returned}` : "0"}
              hint={cohort ? `${cohort.retentionEver}% ${locale === "fr" ? "de la cohorte" : "of cohort"}` : ""}
            />
            <SummaryCard
              icon={TrendingUp} color="bg-violet/10 text-violet"
              label={locale === "fr" ? "Retention J+1" : "Day 1"}
              value={`${avgDay1}%`}
              hint={locale === "fr" ? `sur ${day1Eligible.length} jours éligibles` : `${day1Eligible.length} eligible days`}
            />
            <SummaryCard
              icon={TrendingUp} color="bg-blue-50 text-blue-500"
              label={locale === "fr" ? "Retention S+1" : "Week 1"}
              value={`${avgWeek}%`}
              hint={locale === "fr" ? `sur ${weekEligible.length} jours éligibles` : `${weekEligible.length} eligible days`}
            />
            <SummaryCard
              icon={Hourglass} color="bg-orange-50 text-orange-500"
              label={locale === "fr" ? "Temps médian" : "Median playtime"}
              value={cohort ? formatDuration(cohort.medianPlaytime) : "0"}
              hint={cohort ? (locale === "fr" ? `moy. ${formatDuration(cohort.avgPlaytime)}` : `avg ${formatDuration(cohort.avgPlaytime)}`) : ""}
            />
          </div>

          {/* Secondary row — one-and-done + session stats */}
          {cohort && cohort.total > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MiniStat
                label={locale === "fr" ? "Jamais revenus" : "Never returned"}
                value={`${cohort.oneAndDone}`}
                sub={`${cohort.total > 0 ? Math.round((cohort.oneAndDone / cohort.total) * 100) : 0}%`}
                tone="red"
              />
              <MiniStat
                label={locale === "fr" ? "Sessions / joueur" : "Sessions / player"}
                value={String(cohort.avgSessionCount)}
                sub={locale === "fr" ? "en moyenne" : "on average"}
              />
              <MiniStat
                label={locale === "fr" ? "1ère session moy." : "Avg first session"}
                value={formatDuration(cohort.firstSession.avgDuration)}
                sub={`${formatNumber(cohort.firstSession.total)} ${locale === "fr" ? "mesurées" : "measured"}`}
              />
              <MiniStat
                label={locale === "fr" ? "Cumul moyen" : "Avg cumulative"}
                value={formatDuration(cohort.avgPlaytime)}
                sub={locale === "fr" ? "temps total par joueur" : "total per player"}
              />
            </div>
          )}

          {/* Retention curve */}
          <div className="mc-card p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold text-text">
                {locale === "fr" ? "Taux de retention par cohorte" : "Retention rate by cohort"}
              </h3>
              <p className="text-[11px] text-text-muted">
                {locale === "fr" ? "Chaque point = cohorte d'un jour" : "Each point = 1-day cohort"}
              </p>
            </div>
            <div className="h-[260px]">
              <Line
                data={{
                  labels: retention.map(r => r.date.slice(5)),
                  datasets: [
                    {
                      label: locale === "fr" ? "J+1" : "Day 1",
                      data: retention.map(r => daysAgo(r.date) >= 2 ? r.retentionDay1 : null),
                      borderColor: "#8E2DE2",
                      backgroundColor: "rgba(142,45,226,0.08)",
                      fill: true,
                      tension: 0.4,
                      pointRadius: 2,
                      spanGaps: false,
                    },
                    {
                      label: locale === "fr" ? "S+1" : "Week 1",
                      data: retention.map(r => daysAgo(r.date) >= 8 ? r.retentionWeek : null),
                      borderColor: "#B84DFF",
                      backgroundColor: "rgba(184,77,255,0.08)",
                      fill: true,
                      tension: 0.4,
                      pointRadius: 2,
                      spanGaps: false,
                    },
                    {
                      label: locale === "fr" ? "Tout retour" : "Any return",
                      data: retention.map(r => r.retentionEver),
                      borderColor: "#22C55E",
                      backgroundColor: "rgba(34,197,94,0.05)",
                      fill: false,
                      tension: 0.4,
                      pointRadius: 1,
                      borderDash: [4, 4],
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: { beginAtZero: true, max: 100, grid: { color: "#f0f0f0" }, ticks: { font: { size: 10 }, callback: (v) => v + "%" } },
                  },
                }}
              />
            </div>
          </div>

          {/* Distributions row */}
          {cohort && cohort.total > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="mc-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
                    <Hourglass size={13} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold text-text truncate">
                      {locale === "fr" ? "Temps total joué (par nouveau)" : "Total playtime (per new player)"}
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      {locale === "fr"
                        ? "Cumul de toutes leurs sessions avant d'avoir quitté"
                        : "Sum of all their sessions"}
                    </p>
                  </div>
                </div>
                <div className="h-[200px]">
                  <Bar data={bucketChartData(cohort.totalPlaytimeBuckets, "#F59E0B")} options={bucketChartOptions(cohort.total)} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {cohort.totalPlaytimeBuckets.slice(0, 3).map(b => {
                    const pct = cohort.total > 0 ? Math.round((b.count / cohort.total) * 100) : 0;
                    return (
                      <div key={b.label} className="rounded-lg bg-red-50 px-2 py-1.5">
                        <p className="text-[10px] text-red-600 uppercase">{b.label}</p>
                        <p className="text-[13px] font-bold text-red-700">{b.count} · {pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mc-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-pink/10 text-pink flex items-center justify-center">
                    <Timer size={13} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold text-text truncate">
                      {locale === "fr" ? "Durée de la 1ère session" : "First session duration"}
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      {locale === "fr"
                        ? "Temps passé la toute première fois avant de quitter"
                        : "Time spent the very first time before leaving"}
                    </p>
                  </div>
                </div>
                <div className="h-[200px]">
                  <Bar data={bucketChartData(cohort.firstSession.buckets, "#8E2DE2")} options={bucketChartOptions(cohort.firstSession.total)} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {cohort.firstSession.buckets.slice(0, 3).map(b => {
                    const pct = cohort.firstSession.total > 0 ? Math.round((b.count / cohort.firstSession.total) * 100) : 0;
                    return (
                      <div key={b.label} className="rounded-lg bg-pink/10 px-2 py-1.5">
                        <p className="text-[10px] text-pink uppercase">{b.label}</p>
                        <p className="text-[13px] font-bold text-pink">{b.count} · {pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="mc-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-bg-soft">
                    <th className="text-left px-4 py-3 font-semibold text-text-sub whitespace-nowrap">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Nouveaux" : "New"}</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Retour J+1" : "Day 1"}</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-sub">% J+1</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Retour S+1" : "Week 1"}</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-sub">% S+1</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-sub">{locale === "fr" ? "Tout retour" : "Any"}</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-sub">% {locale === "fr" ? "tout" : "any"}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...retention].reverse().map((r) => {
                    const age = daysAgo(r.date);
                    const day1Ready = age >= 2;
                    const weekReady = age >= 8;
                    return (
                      <tr key={r.date} className="border-b border-border/50 hover:bg-bg-soft/40">
                        <td className="px-4 py-2.5 font-medium text-text whitespace-nowrap">{r.date}</td>
                        <td className="px-4 py-2.5 text-text-sub">{r.newPlayers}</td>
                        <td className="px-4 py-2.5 text-text-sub">{day1Ready ? r.returnedDay1 : <span className="text-text-muted">-</span>}</td>
                        <td className="px-4 py-2.5">
                          {day1Ready ? (
                            <span className={`font-semibold ${r.retentionDay1 >= 30 ? "text-green" : r.retentionDay1 >= 15 ? "text-orange-500" : "text-red-500"}`}>
                              {r.retentionDay1}%
                            </span>
                          ) : (
                            <span className="text-[11px] text-text-muted italic">{locale === "fr" ? "en attente" : "pending"}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-text-sub">{weekReady ? r.returnedWeek : <span className="text-text-muted">-</span>}</td>
                        <td className="px-4 py-2.5">
                          {weekReady ? (
                            <span className={`font-semibold ${r.retentionWeek >= 30 ? "text-green" : r.retentionWeek >= 15 ? "text-orange-500" : "text-red-500"}`}>
                              {r.retentionWeek}%
                            </span>
                          ) : (
                            <span className="text-[11px] text-text-muted italic">{locale === "fr" ? "en attente" : "pending"}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-text-sub">{r.returnedEver}</td>
                        <td className="px-4 py-2.5">
                          <span className={`font-semibold ${r.retentionEver >= 40 ? "text-green" : r.retentionEver >= 20 ? "text-orange-500" : "text-red-500"}`}>
                            {r.retentionEver}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon, color, label, value, hint,
}: {
  icon: typeof Users;
  color: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="mc-card px-4 py-4">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-2`}>
        <Icon size={15} />
      </div>
      <p className="text-[20px] font-bold text-text">{value}</p>
      <p className="text-[11px] text-text-muted">{label}</p>
      {hint && <p className="text-[10px] text-text-muted/70 mt-0.5 truncate">{hint}</p>}
    </div>
  );
}

function MiniStat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "red" }) {
  const toneClass = tone === "red" ? "text-red-500" : "text-text";
  return (
    <div className="rounded-xl border-2 border-border bg-bg-soft/40 px-4 py-3">
      <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
      <p className={`text-[18px] font-bold ${toneClass}`}>{value}</p>
      <p className="text-[10px] text-text-muted">{sub}</p>
    </div>
  );
}
