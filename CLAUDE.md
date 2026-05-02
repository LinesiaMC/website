# Linesia — Website

Public website + staff admin panel pour le serveur Minecraft Bedrock Linesia.

## Stack
- **Next.js 15** (App Router), TypeScript, Tailwind v4, next-intl, framer-motion, Chart.js
- **Postgres 16 partagé** (rôle `linesia_web`) via PgBouncer local
  (`postgres://linesia_web:***@127.0.0.1:6432/linesia`).
- Auth: Discord OAuth + Microsoft/Xbox OAuth, session cookies
  (`linesia_staff_session` / `linesia_player_session`).
- L'endpoint `/api/ingest/*` consommé par le plugin reste en place
  comme **fallback HTTP** — le chemin nominal est désormais l'écriture
  directe en DB par le plugin.

## Source-of-truth principle
**La DB partagée est la source de vérité.** Le plugin (LinesiaCore-PNX)
en est l'**écrivain primaire** pour `game.*` ; le site lit. Le site
possède en propre les domaines `web.*` (auth, articles, wiki, roadmap,
tickets, matrice de permissions, comptes web).

## Layout
```
src/
  app/
    [locale]/          fr (default), en
      page.tsx
      account/         Player account (link to in-game)
      leaderboard/     Public ranking + profile (xuid)
      news/  store/  wiki/
      admin/           Staff panel (gated by session+permissions)
        community/     perm: community.view
        roles/         perm: permissions.manage
        staff/         perm: staff.manage
        analytics/     dashboards, retention, logs
        tickets/  wiki/  roadmap/
    api/
      account/         link/verify, microsoft OAuth (player)
      auth/            staff: discord, microsoft, me, logout
      ingest/[...path] FALLBACK plugin → site (x-api-key gated)
      leaderboard/     Public read API (lit game.player_profile)
      community/       Admin: paged list (linked + unlinked)
      permissions/     Admin: read/write web.role_permissions
      staff/  tickets/  ...
  components/
    admin/AdminContext.tsx
    admin/AnalyticsAPI.tsx
    Navbar Footer Hero ...
  lib/
    db.ts              pgPool, query, queryOne, tx, subscribe, getDb()
    db-listen.ts       LISTEN sur linesia.* → invalide les caches
    analytics-db.ts    DÉLÈGUE à db.ts (compat shim @libsql/client)
    auth.ts            Staff session + requirePermission (server)
    player-auth.ts     Player session + getPlayerStats (xuid)
    permissions.ts     DB-backed permission map (cache, invalidé via NOTIFY)
    roles.ts           Permission union, DEFAULT_PERMISSIONS, ingame→site map
    staff-sync.ts      syncStaffFromIngame (sur ingest player-profile)
    articles.ts ...
  instrumentation.ts   Hook Next: démarre les LISTEN au boot du serveur
```

## DB layer
- `lib/db.ts` expose **2 APIs** :
  - **Native** (préférée pour le code neuf) : `query<T>(sql, args)`,
    `queryOne<T>`, `tx(fn)`, `pgPool()`. Placeholders Postgres `$1, $2`.
  - **Compat** (pour le code legacy libSQL) : `getDb()` retourne un
    `CompatClient` avec `.execute({ sql, args })` et `.batch([...])`.
    Les `?` sont traduits en `$N` ; les `Date.now()` (ms epoch) sont
    auto-convertis en ISO strings.
- `search_path = web, game, public` est défini sur chaque connexion :
  - `SELECT * FROM staff_users`     → `web.staff_users`
  - `SELECT * FROM players`         → `game.players`
  - `SELECT * FROM player_cosmetics` → `game.player_cosmetics`
- Compat views (`database/migrations/0001_compat_views.sql`) :
  - `public.player_profile_extra` (jointure game.player_profile + game.players)
  - `public.sanctions_legacy` / `alert_stats_legacy` / `player_aliases_legacy`
    pour les colonnes renommées (player_uuid → player_xuid, timestamp → started_at).

## LISTEN / NOTIFY + Heartbeat
`instrumentation.ts` démarre **2 hooks** au boot :
- `startDbListeners()` (cf. `lib/db-listen.ts`) — invalide les caches
  in-mem sur :
  - `linesia.permissions_changed`, `linesia.staff_changed`
  - `linesia.player_profile_updated`, `linesia.player_cosmetics_updated`
  - `linesia.player_link_changed`, `linesia.sanction_added`
- `startHeartbeat()` (cf. `lib/heartbeat.ts`) — UPSERT chaque 30 s dans
  `public.service_heartbeats` (`service_id='website'`). Émet aussi un
  `system_events('info','website','started'|'stopped',…)` au cycle de vie.

LISTEN ne marche **pas** via PgBouncer transaction-mode : le subscriber
ouvre une connexion DIRECTE (`DATABASE_URL_DIRECT` → port 5432).

## /admin/health
Page React qui poll `/api/health` toutes les 5 s :
- Cartes des services (plugin, website, bot) avec status + last_seen
- Liste des 50 derniers `system_events`
- Permission requise : `system.view` (admin + founder par défaut).

## Auth & Permissions
- **Staff** : Discord ou Microsoft → `web.staff_users`. Session cookie.
- **Player** : Microsoft → `web.player_accounts`. `/link CODE` validé
  par le plugin **directement en DB** via `LinkDao.confirm()` (le plugin
  a `GRANT UPDATE` ciblé sur `web.player_accounts`).
- **Permissions** : `lib/roles.ts` exporte `Permission` et
  `DEFAULT_PERMISSIONS` (fallback). Live overrides dans
  `web.role_permissions`, cache 30 s, invalidé via NOTIFY.
- Founder = super-admin hard-codé.

## Rank sync (in-game → site)
Le plugin écrit directement dans `game.player_profile`. Le trigger
Postgres émet `linesia.player_profile_updated`. `staff-sync.ts` (côté
site, déclenché par le legacy ingest OU par un job déclenché sur
NOTIFY) compare `rank` à la matrice ingame→site et met à jour
`web.staff_users` (avec `source='ingame'`).

## Plugin ↔ site contract
- Chemin nominal : **plugin écrit directement** dans `game.*` via
  HikariCP. Le site lit. Aucun aller-retour HTTP.
- Fallback (si DB indispo plugin-side) : POST `/api/ingest/*` avec
  `X-Api-Key` matching `ANALYTICS_API_KEY`. Routes consommées :
  - `join | leave | command | death | chat | world | block | casino |
     sanction | player-aliases | economy-snapshot | logs | batch`
  - `player-profile`, `cosmetics`
  - `account/link/verify` (kept en fallback, mais le plugin fait
    désormais `LinkDao.confirm()` direct DB).

## Env vars critiques
| Var | Rôle | Défaut |
|-----|------|--------|
| `DATABASE_URL` | URL pg via PgBouncer (port 6432) | `postgres://linesia_web:***@127.0.0.1:6432/linesia` |
| `DATABASE_URL_DIRECT` | Connexion directe (port 5432) pour LISTEN | idem mais 5432 |
| `PG_POOL_MAX` | Taille du pool pg | 20 |
| `ANALYTICS_API_KEY` | Fallback HTTP avec plugin | (rotate) |
| `MICROSOFT_CLIENT_ID/SECRET/REDIRECT` | Player + staff MS OAuth | — |
| `DISCORD_CLIENT_ID/SECRET/REDIRECT` | Staff Discord OAuth | — |

## Conventions
- Pour les nouveaux fichiers : `import { query, queryOne, tx } from "@/lib/db"`.
- Pour le legacy : `import { getDb } from "@/lib/analytics-db"` (toujours OK,
  délègue à db.ts).
- Toujours utiliser des placeholders (jamais `${}` dans une requête SQL).
- Les caches in-memory **doivent** être enregistrés dans `db-listen.ts`
  pour être invalidés via NOTIFY.
- Pas d'écriture côté site dans `game.*` — le site est lecteur seul
  pour ce schéma.

## Commandes
- `npm run dev` · `npm run build` · `npm run lint`
