"use client";

import { useEffect, useState } from "react";
import { Activity, Server, Globe, Bot, AlertTriangle, AlertOctagon, Info, TriangleAlert } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminContext";

type ServiceKind = "plugin" | "website" | "bot";

type Heartbeat = {
    service_id: string;
    service_kind: ServiceKind;
    host: string | null;
    version: string | null;
    pid: number | null;
    status: "up" | "degraded" | "down";
    started_at: string;
    last_seen: string;
    metadata: Record<string, unknown>;
    seconds_since: number;
};

type SystemEvent = {
    id: number;
    severity: "info" | "warn" | "error" | "critical";
    source: string;
    kind: string;
    message: string;
    payload: Record<string, unknown>;
    occurred_at: string;
};

const KIND_LABEL: Record<ServiceKind, string> = {
    plugin:  "Serveur",
    website: "Site web",
    bot:     "Bot Discord",
};

const KIND_ICON: Record<ServiceKind, typeof Server> = {
    plugin:  Server,
    website: Globe,
    bot:     Bot,
};

const STATUS_BADGE: Record<Heartbeat["status"], string> = {
    up:       "bg-green-100 text-green-800 border-green-200",
    degraded: "bg-amber-100 text-amber-800 border-amber-200",
    down:     "bg-red-100 text-red-800 border-red-200",
};

const STATUS_DOT: Record<Heartbeat["status"], string> = {
    up:       "bg-green-500",
    degraded: "bg-amber-500",
    down:     "bg-red-500",
};

const STATUS_LABEL: Record<Heartbeat["status"], string> = {
    up: "En ligne", degraded: "Dégradé", down: "Hors ligne",
};

const SEV_BADGE: Record<SystemEvent["severity"], string> = {
    info:     "bg-sky-100 text-sky-800 border-sky-200",
    warn:     "bg-amber-100 text-amber-800 border-amber-200",
    error:    "bg-red-100 text-red-800 border-red-200",
    critical: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
};

const SEV_ICON: Record<SystemEvent["severity"], typeof Info> = {
    info:     Info,
    warn:     TriangleAlert,
    error:    AlertTriangle,
    critical: AlertOctagon,
};

function formatAgo(seconds: number): string {
    if (seconds < 60)    return `il y a ${seconds}s`;
    if (seconds < 3600)  return `il y a ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)} h`;
    return `il y a ${Math.floor(seconds / 86400)} j`;
}

function displayServiceId(id: string, kind: ServiceKind): string {
    if (id.toLowerCase() === "plugin" && kind === "plugin") return "serveur";
    return id;
}

export default function HealthPage() {
    const { headers, can } = useAdmin();
    const [data, setData] = useState<{ services: Heartbeat[]; events: SystemEvent[] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let stop = false;
        async function tick() {
            try {
                const r = await fetch("/api/health", { headers });
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const j = await r.json();
                if (!stop) { setData(j); setError(null); }
            } catch (e: unknown) {
                if (!stop) setError(e instanceof Error ? e.message : String(e));
            }
        }
        tick();
        const id = setInterval(tick, 5000);
        return () => { stop = true; clearInterval(id); };
    }, [headers]);

    if (!can("system.view")) {
        return <div className="p-6 text-text-muted">Permission requise : <code className="px-1.5 py-0.5 rounded bg-bg-soft text-text">system.view</code>.</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <header className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink to-violet flex items-center justify-center">
                    <Activity size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-text">Santé des services</h1>
                    <p className="text-[12px] text-text-muted">
                        Heartbeat toutes les 30 s · &gt; 90 s sans signal = hors ligne · &gt; 5 min = redémarrage automatique.
                    </p>
                </div>
            </header>

            {error && (
                <div className="mc-card p-3 flex items-center gap-2 bg-red-50 border-red-200 text-red-700 text-[13px]">
                    <AlertTriangle size={16} /> Erreur de chargement : {error}
                </div>
            )}

            {!data && !error ? (
                <div className="mc-card p-8 text-center text-text-muted text-[13px]">Chargement…</div>
            ) : data && (
                <>
                    <section>
                        <h2 className="text-[13px] font-bold text-text-sub uppercase tracking-wider mb-3">Services</h2>
                        {data.services.length === 0 ? (
                            <div className="mc-card p-6 text-center text-text-muted text-[13px]">Aucun service enregistré.</div>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {data.services.map((s) => {
                                    const Icon = KIND_ICON[s.service_kind] ?? Server;
                                    return (
                                        <article key={s.service_id} className="mc-card p-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_DOT[s.status]}`} />
                                                    <Icon size={14} className="text-text-muted shrink-0" />
                                                    <span className="font-mono text-[13px] font-semibold text-text truncate">
                                                        {displayServiceId(s.service_id, s.service_kind)}
                                                    </span>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_BADGE[s.status]}`}>
                                                    {STATUS_LABEL[s.status]}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-[11px] text-text-muted">{KIND_LABEL[s.service_kind] ?? s.service_kind}</p>
                                            <dl className="mt-3 grid grid-cols-[80px_1fr] gap-y-1 text-[12px]">
                                                <dt className="text-text-muted">Vu</dt>
                                                <dd className="text-text">{formatAgo(s.seconds_since)}</dd>
                                                <dt className="text-text-muted">Hôte</dt>
                                                <dd className="text-text font-mono truncate">{s.host ?? "—"}</dd>
                                                <dt className="text-text-muted">Version</dt>
                                                <dd className="text-text font-mono truncate">{s.version ?? "—"}</dd>
                                                <dt className="text-text-muted">PID</dt>
                                                <dd className="text-text font-mono">{s.pid ?? "—"}</dd>
                                            </dl>
                                            {s.metadata && Object.keys(s.metadata).length > 0 && (
                                                <details className="mt-3 text-[11px] text-text-muted">
                                                    <summary className="cursor-pointer hover:text-text-sub">metadata</summary>
                                                    <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-bg-soft p-2 text-text border border-border">
                                                        {JSON.stringify(s.metadata, null, 2)}
                                                    </pre>
                                                </details>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="text-[13px] font-bold text-text-sub uppercase tracking-wider mb-3">Derniers événements</h2>
                        <div className="mc-card divide-y divide-border overflow-hidden">
                            {data.events.length === 0 ? (
                                <div className="p-4 text-text-muted text-[13px]">Rien à signaler.</div>
                            ) : (
                                data.events.map((e) => {
                                    const Icon = SEV_ICON[e.severity];
                                    return (
                                        <div key={e.id} className="px-4 py-2.5 flex items-start gap-3 text-[13px] hover:bg-bg-soft/50">
                                            <span className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${SEV_BADGE[e.severity]}`}>
                                                <Icon size={10} />
                                                {e.severity}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-text leading-snug">{e.message}</p>
                                                <p className="mt-0.5 text-[11px] text-text-muted font-mono">
                                                    {e.source}/{e.kind} · {new Date(e.occurred_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
