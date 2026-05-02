import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const gate = await requirePermission(req, "system.view");
    if (gate instanceof NextResponse) return gate;

    const [heartbeats, events] = await Promise.all([
        query(
            `SELECT service_id, service_kind, host, version, pid, status,
                    started_at, last_seen, metadata,
                    EXTRACT(EPOCH FROM (now() - last_seen))::int AS seconds_since
             FROM public.service_heartbeats
             ORDER BY service_kind, service_id`,
        ),
        query(
            `SELECT id, severity, source, kind, message, payload, occurred_at
             FROM public.system_events
             ORDER BY id DESC
             LIMIT 50`,
        ),
    ]);

    return NextResponse.json({
        services: heartbeats.rows,
        events: events.rows,
        now: new Date().toISOString(),
    });
}
