// Client Postgres unifié. Remplace @libsql/client.
//
// Le code existant fait du `db.execute({ sql, args })` et `db.batch(...)`
// (style libSQL). Pour ne pas réécrire tous les call-sites, ce module
// expose un adapter `getDb()` qui parle la même API mais cible Postgres
// via `pg.Pool` → PgBouncer (transaction pooling).
//
// Le code NEUF doit utiliser :
//   - `pgPool` pour les requêtes brutes (placeholders Postgres `$1`, `$2`)
//   - `query<T>` / `queryOne<T>` pour les helpers typés
//   - `subscribe(channel, handler)` pour LISTEN/NOTIFY (canaux `linesia.*`)
//
// `LISTEN` ne fonctionne PAS via PgBouncer en mode transaction. Le
// subscriber ouvre une connexion DIRECTE au port 5432 (LINESIA_DB_PORT_DIRECT),
// indépendante du pool applicatif.

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

// ──────────────────────────── pool principal ────────────────────────────

const POOL_URL =
    process.env.DATABASE_URL
    || `postgres://${process.env.LINESIA_WEB_USER || "linesia_web"}:${
        process.env.LINESIA_WEB_PASSWORD || ""
    }@${process.env.LINESIA_DB_HOST || "127.0.0.1"}:${
        process.env.LINESIA_PGBOUNCER_PORT || "6432"
    }/${process.env.LINESIA_DB_NAME || "linesia"}`;

let pool: Pool | null = null;

export function pgPool(): Pool {
    if (pool) return pool;
    pool = new Pool({
        connectionString: POOL_URL,
        max: Number(process.env.PG_POOL_MAX || 20),
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
        // PgBouncer en transaction-mode ne supporte pas les statements préparés
        // serveur-side. `pg` n'en utilise pas par défaut, c'est ok.
        allowExitOnIdle: false,
    });
    pool.on("error", (e) => console.error("[pg] pool error:", e));
    return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    args: unknown[] = [],
): Promise<QueryResult<T>> {
    return pgPool().query<T>(sql, args as never[]);
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    args: unknown[] = [],
): Promise<T | null> {
    const r = await query<T>(sql, args);
    return r.rows[0] ?? null;
}

export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await pgPool().connect();
    try {
        await c.query("BEGIN");
        const out = await fn(c);
        await c.query("COMMIT");
        return out;
    } catch (e) {
        await c.query("ROLLBACK");
        throw e;
    } finally {
        c.release();
    }
}

// ─────────────── adapter compat libSQL (db.execute / db.batch) ───────────────

// Traduit `?` (libSQL) → `$1`, `$2`, … (Postgres). Ignore les `?` à
// l'intérieur de littéraux string. Heuristique simple mais suffisante
// pour le code SQL utilisé dans le site (pas de cast Postgres `?` exotique).
function translatePlaceholders(sql: string): string {
    let out = "";
    let i = 0, n = 0;
    let inSingle = false, inDouble = false, inLineComment = false, inBlockComment = false;
    while (i < sql.length) {
        const c = sql[i], next = sql[i + 1];
        if (inLineComment) {
            out += c;
            if (c === "\n") inLineComment = false;
            i++; continue;
        }
        if (inBlockComment) {
            out += c;
            if (c === "*" && next === "/") { out += next; i += 2; inBlockComment = false; continue; }
            i++; continue;
        }
        if (inSingle) {
            out += c;
            if (c === "'" && next === "'") { out += next; i += 2; continue; }
            if (c === "'") inSingle = false;
            i++; continue;
        }
        if (inDouble) {
            out += c;
            if (c === '"') inDouble = false;
            i++; continue;
        }
        if (c === "'") { inSingle = true; out += c; i++; continue; }
        if (c === '"') { inDouble = true; out += c; i++; continue; }
        if (c === "-" && next === "-") { inLineComment = true; out += c; i++; continue; }
        if (c === "/" && next === "*") { inBlockComment = true; out += c; i++; continue; }
        if (c === "?") { n++; out += `$${n}`; i++; continue; }
        out += c; i++;
    }
    return out;
}

// Convertit une valeur "libSQL-ish" en valeur acceptable par pg.
// Notamment : les `Date.now()` (number) destinés à un timestamptz doivent
// être passés en ISO string. Heuristique : si la valeur est un number ≥ 10^12
// (ms epoch après 2001), on la convertit en Date.
function coerceArg(v: unknown): unknown {
    if (typeof v === "number" && Number.isFinite(v) && v >= 1_000_000_000_000) {
        return new Date(v).toISOString();
    }
    return v;
}

export interface ExecuteRequest {
    sql: string;
    args?: unknown[];
}

export interface CompatRow {
    [k: string]: unknown;
}

export interface CompatResultSet {
    rows: CompatRow[];
    rowsAffected: number;
    lastInsertRowid: number | null;
    columns: string[];
}

export interface CompatClient {
    execute(input: string | ExecuteRequest): Promise<CompatResultSet>;
    batch(stmts: Array<string | ExecuteRequest>): Promise<CompatResultSet[]>;
}

function buildResultSet(r: QueryResult): CompatResultSet {
    return {
        rows: r.rows as CompatRow[],
        rowsAffected: r.rowCount ?? 0,
        lastInsertRowid: null,
        columns: r.fields?.map((f) => f.name) ?? [],
    };
}

const compat: CompatClient = {
    async execute(input) {
        const sqlRaw = typeof input === "string" ? input : input.sql;
        const args = (typeof input === "string" ? [] : input.args ?? []).map(coerceArg);
        // Court-circuit pour PRAGMA table_info — utilisé par certains
        // chemins legacy pour vérifier qu'une colonne existe avant un alter.
        // Sur Postgres on traduit en information_schema.
        const pragma = sqlRaw.match(/^\s*PRAGMA\s+table_info\(\s*['"]?([a-zA-Z_]+)['"]?\s*\)\s*;?\s*$/i);
        if (pragma) {
            const r = await query(
                `SELECT column_name AS name, data_type AS type
                 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = $1`,
                [pragma[1]],
            );
            return buildResultSet(r);
        }
        const sql = translatePlaceholders(sqlRaw);
        const r = await query(sql, args);
        return buildResultSet(r);
    },

    async batch(stmts) {
        // libSQL `batch` est transactionnel par défaut.
        const results: CompatResultSet[] = [];
        await tx(async (c) => {
            for (const s of stmts) {
                const sqlRaw = typeof s === "string" ? s : s.sql;
                const args = (typeof s === "string" ? [] : s.args ?? []).map(coerceArg);
                const pragma = sqlRaw.match(/^\s*PRAGMA\s+/i);
                if (pragma) { results.push({ rows: [], rowsAffected: 0, lastInsertRowid: null, columns: [] }); continue; }
                const sql = translatePlaceholders(sqlRaw);
                const r = await c.query(sql, args as never[]);
                results.push(buildResultSet(r));
            }
        });
        return results;
    },
};

export function getDb(): CompatClient {
    // Force l'init du pool à la première utilisation.
    pgPool();
    return compat;
}

// ─────────────── LISTEN / NOTIFY (canaux linesia.*) ───────────────

type NotifyHandler = (payload: unknown) => void | Promise<void>;
const subscribers = new Map<string, Set<NotifyHandler>>();
let listenClient: import("pg").Client | null = null;
let listenStarted = false;

async function ensureListenClient(): Promise<void> {
    if (listenStarted) return;
    listenStarted = true;
    const { Client } = await import("pg");
    const directUrl =
        process.env.DATABASE_URL_DIRECT
        || `postgres://${process.env.LINESIA_WEB_USER || "linesia_web"}:${
            process.env.LINESIA_WEB_PASSWORD || ""
        }@${process.env.LINESIA_DB_HOST || "127.0.0.1"}:${
            process.env.LINESIA_DB_PORT_DIRECT || "5432"
        }/${process.env.LINESIA_DB_NAME || "linesia"}`;
    listenClient = new Client({ connectionString: directUrl });
    await listenClient.connect();
    listenClient.on("notification", (msg) => {
        const handlers = subscribers.get(msg.channel);
        if (!handlers || handlers.size === 0) return;
        let payload: unknown = msg.payload;
        try { if (msg.payload) payload = JSON.parse(msg.payload); } catch { /* keep raw */ }
        for (const h of handlers) {
            Promise.resolve(h(payload)).catch((e) =>
                console.error(`[pg-listen] handler ${msg.channel} threw:`, e));
        }
    });
    listenClient.on("error", (e) => {
        console.error("[pg-listen] error, reconnect in 5s:", e);
        listenStarted = false;
        listenClient = null;
        setTimeout(() => { void ensureListenClient(); }, 5000);
    });
    // Ré-abonnement après reconnexion
    for (const ch of subscribers.keys()) {
        await listenClient.query(`LISTEN "${ch}"`);
    }
}

export async function subscribe(channel: string, handler: NotifyHandler): Promise<() => void> {
    let set = subscribers.get(channel);
    if (!set) { set = new Set(); subscribers.set(channel, set); }
    set.add(handler);
    await ensureListenClient();
    if (listenClient) await listenClient.query(`LISTEN "${channel}"`);
    return () => {
        set!.delete(handler);
        if (set!.size === 0) {
            subscribers.delete(channel);
            void listenClient?.query(`UNLISTEN "${channel}"`).catch(() => {});
        }
    };
}

// ─────────────── helpers haut-niveau (game schema) ───────────────

export async function getPlayerByXuid(xuid: string) {
    return queryOne<{ xuid: string; username: string; uuid: string | null; total_playtime_s: number }>(
        `SELECT xuid, username, uuid, total_playtime_s FROM game.players WHERE xuid = $1`,
        [xuid],
    );
}

export async function getPlayerProfile(xuid: string) {
    return queryOne(
        `SELECT * FROM game.player_profile WHERE xuid = $1`,
        [xuid],
    );
}

export async function getPlayerCosmetics(xuid: string) {
    const r = await query(
        `SELECT full_id, type, identifier, name, active
         FROM game.player_cosmetics WHERE xuid = $1`,
        [xuid],
    );
    return r.rows;
}

export async function getDiscordLinkedXuid(discordId: string): Promise<string | null> {
    const r = await queryOne<{ linked_xuid: string | null }>(
        `SELECT linked_xuid FROM web.player_accounts
         WHERE discord_id = $1 AND linked_xuid IS NOT NULL LIMIT 1`,
        [discordId],
    );
    return r?.linked_xuid ?? null;
}
