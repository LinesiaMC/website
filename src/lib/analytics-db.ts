// analytics-db.ts — délégation vers le client Postgres unifié (lib/db.ts).
//
// Avant : libSQL/SQLite local avec migrations inline.
// Maintenant : Postgres partagé. Le schéma vit dans /database/schema/*.
// Les call-sites continuent d'utiliser `await getDb()` → adapter compat.

import { getDb as getDbInternal, query as pgQuery, type CompatClient, type CompatRow } from "./db";

export type Client = CompatClient;
export type Row = CompatRow;

let initialized = false;

export async function getDb(): Promise<Client> {
    const db = getDbInternal();
    if (!initialized) {
        initialized = true;
        // search_path : permet d'écrire `SELECT * FROM players` sans `game.`.
        // Web tables masquent les game tables homonymes — il n'y en a pas
        // (les schémas sont disjoints), donc tout résout proprement.
        await pgQuery(`SET search_path TO web, game, public`);
    }
    return db;
}

export async function run(db: Client, sql: string, params: unknown[] = []) {
    return db.execute({ sql, args: params });
}

export async function getOne(db: Client, sql: string, params: unknown[] = []): Promise<Record<string, unknown> | null> {
    const r = await db.execute({ sql, args: params });
    return (r.rows[0] as Record<string, unknown>) ?? null;
}

export async function getAll(db: Client, sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    const r = await db.execute({ sql, args: params });
    return r.rows as Record<string, unknown>[];
}

export async function upsertServer(db: Client, serverId: string, serverName?: string) {
    await db.execute({
        sql: `INSERT INTO game.servers (server_id, server_name)
              VALUES (?, ?)
              ON CONFLICT (server_id) DO UPDATE SET
                  server_name = COALESCE(EXCLUDED.server_name, game.servers.server_name),
                  last_seen   = now()`,
        args: [serverId, serverName ?? serverId],
    });
}

export function serverFilter(queryParam: string | null, prefix = "") {
    if (!queryParam || queryParam === "all") return { sql: "", args: [] as unknown[] };
    const col = prefix ? `${prefix}.server_id` : "server_id";
    return { sql: ` AND ${col} = ?`, args: [queryParam] as unknown[] };
}
