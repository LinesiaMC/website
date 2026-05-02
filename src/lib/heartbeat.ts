// Publie un heartbeat dans public.service_heartbeats toutes les 30 s.
// Si le process meurt, le timer s'arrête → le monitor détecte 'down'
// au-delà de 90 s.

import { query, pgPool } from "./db";

const INTERVAL_MS = 30_000;
let timer: NodeJS.Timeout | null = null;
const PID = process.pid;
const HOST = process.env.HOSTNAME || "?";
const VERSION = process.env.npm_package_version || "next";
const SERVICE_ID = "website";

async function emit(status: "up" | "degraded" | "down" = "up"): Promise<void> {
    const meta = {
        node_version: process.version,
        uptime_s: Math.round(process.uptime()),
        memory_rss_mb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        pool_size: pgPool().totalCount ?? null,
    };
    await query(
        `INSERT INTO public.service_heartbeats
            (service_id, service_kind, host, version, pid, status, metadata)
         VALUES ($1, 'website', $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT (service_id) DO UPDATE SET
            last_seen = now(), status = EXCLUDED.status,
            host = EXCLUDED.host, version = EXCLUDED.version,
            pid = EXCLUDED.pid, metadata = EXCLUDED.metadata`,
        [SERVICE_ID, HOST, VERSION, PID, status, JSON.stringify(meta)],
    );
}

export async function emitSystemEvent(
    severity: "info" | "warn" | "error" | "critical",
    kind: string,
    message: string,
    payload: Record<string, unknown> = {},
): Promise<void> {
    await query(
        `INSERT INTO public.system_events (severity, source, kind, message, payload)
         VALUES ($1, 'website', $2, $3, $4::jsonb)`,
        [severity, kind, message, JSON.stringify(payload)],
    );
}

export async function startHeartbeat(): Promise<void> {
    if (timer) return;
    try { await emit("up"); } catch (e) { console.error("[heartbeat] initial:", e); }
    timer = setInterval(() => {
        emit("up").catch((e) => console.error("[heartbeat] tick:", e?.message ?? e));
    }, INTERVAL_MS);
    timer.unref();

    const stop = async (signal: NodeJS.Signals): Promise<void> => {
        if (!timer) return;
        clearInterval(timer); timer = null;
        try {
            await emit("down");
            await emitSystemEvent("info", "stopped", `Website received ${signal}`);
        } catch { /* noop */ }
        process.exit(0);
    };
    process.once("SIGTERM", () => void stop("SIGTERM"));
    process.once("SIGINT",  () => void stop("SIGINT"));

    try {
        await emitSystemEvent("info", "started", "Website up", { host: HOST, version: VERSION });
    } catch { /* noop */ }
}
