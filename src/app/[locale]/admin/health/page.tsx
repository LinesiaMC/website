"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminContext";

type Heartbeat = {
    service_id: string;
    service_kind: "plugin" | "website" | "bot";
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

const SEV_COLORS: Record<SystemEvent["severity"], string> = {
    info:     "text-sky-300",
    warn:     "text-amber-300",
    error:    "text-rose-400",
    critical: "text-fuchsia-400",
};

const STATUS_COLORS: Record<Heartbeat["status"], string> = {
    up:        "bg-emerald-500",
    degraded:  "bg-amber-500",
    down:      "bg-rose-500",
};

function formatAgo(seconds: number): string {
    if (seconds < 60)    return `${seconds}s`;
    if (seconds < 3600)  return `${Math.floor(seconds / 60)}min`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}j`;
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
                if (!stop) setData(j);
            } catch (e: unknown) {
                if (!stop) setError(e instanceof Error ? e.message : String(e));
            }
        }
        tick();
        const id = setInterval(tick, 5000);
        return () => { stop = true; clearInterval(id); };
    }, [headers]);

    if (!can("system.view")) {
        return <div className="p-6 text-zinc-400">Permission requise : <code>system.view</code>.</div>;
    }

    if (error)  return <div className="p-6 text-rose-400">Erreur : {error}</div>;
    if (!data)  return <div className="p-6 text-zinc-400">Chargement…</div>;

    return (
        <div className="p-6 space-y-8">
            <header>
                <h1 className="text-2xl font-bold text-zinc-100">Santé des services</h1>
                <p className="text-zinc-400 mt-1 text-sm">
                    Heartbeats toutes les 30 s. Une absence de signal &gt; 90 s passe le service en
                    <span className="text-rose-300 mx-1">down</span>; après 5 min, le monitor systemd redémarre le service.
                </p>
            </header>

            <section>
                <h2 className="text-lg font-semibold text-zinc-200 mb-3">Services</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {data.services.map((s) => (
                        <article key={s.service_id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_COLORS[s.status]}`} />
                                    <span className="font-mono text-sm text-zinc-100">{s.service_id}</span>
                                </div>
                                <span className="text-xs text-zinc-500">{s.service_kind}</span>
                            </div>
                            <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs text-zinc-400">
                                <dt>Status</dt>
                                <dd className="text-zinc-200">{s.status}</dd>
                                <dt>Last seen</dt>
                                <dd className="text-zinc-200">{formatAgo(s.seconds_since)} ago</dd>
                                <dt>Host</dt>
                                <dd className="text-zinc-200 font-mono">{s.host ?? "?"}</dd>
                                <dt>Version</dt>
                                <dd className="text-zinc-200 font-mono">{s.version ?? "?"}</dd>
                                <dt>PID</dt>
                                <dd className="text-zinc-200 font-mono">{s.pid ?? "?"}</dd>
                            </dl>
                            {s.metadata && Object.keys(s.metadata).length > 0 ? (
                                <details className="mt-2 text-xs text-zinc-500">
                                    <summary className="cursor-pointer">metadata</summary>
                                    <pre className="mt-2 max-h-40 overflow-auto rounded bg-zinc-950 p-2 text-zinc-300">
                                        {JSON.stringify(s.metadata, null, 2)}
                                    </pre>
                                </details>
                            ) : null}
                        </article>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-zinc-200 mb-3">Derniers événements système</h2>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800">
                    {data.events.length === 0 ? (
                        <div className="p-4 text-zinc-500 text-sm">Rien à signaler.</div>
                    ) : (
                        data.events.map((e) => (
                            <div key={e.id} className="px-4 py-2 grid grid-cols-[120px_80px_100px_1fr] gap-3 items-start text-sm">
                                <time className="text-zinc-500 font-mono text-xs">
                                    {new Date(e.occurred_at).toLocaleString()}
                                </time>
                                <span className={`font-mono text-xs ${SEV_COLORS[e.severity]}`}>{e.severity}</span>
                                <span className="font-mono text-xs text-zinc-400">{e.source}/{e.kind}</span>
                                <span className="text-zinc-200">{e.message}</span>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
