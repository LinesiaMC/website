# Linesia — Website

Public website + staff admin panel for the Linesia Minecraft Bedrock server.

## Stack
- **Next.js 15** (App Router), TypeScript, Tailwind v4, next-intl, framer-motion, Chart.js
- **libSQL local SQLite** (`DATABASE_URL=file:./data/linesia.db`, défaut si non défini)
- Auth: Discord OAuth + Microsoft/Xbox OAuth, session cookies (`linesia_staff_session` / `linesia_player_session`)
- Ingest API consumed by **LinesiaCore** plugin (PocketMine-MP) over HTTP+x-api-key

## Source-of-truth principle
**The Minecraft server is authoritative for player state.** The website is a
read replica + UI for everything in-game (rank, stats, cosmetics). The
plugin pushes profile snapshots; the website never writes back to game state.

The only website-owned writes are: articles, wiki, roadmap, tickets,
manually-added staff rows (`staff_users.source = 'manual'`), and the
permission matrix (`role_permissions`).

## Layout
```
src/
  app/
    [locale]/                 # fr (default), en
      page.tsx                # Homepage
      account/                # Player account page (link to in-game)
      leaderboard/            # Public ranking + player profile (XP/cosmetics/jobs)
      news/  store/  wiki/    # Public content
      admin/                  # Staff panel (gated by session+permissions)
        layout.tsx            # Shell, sidebar, AdminContext provider
        community/            # All players (linked + unlinked) — perm: community.view
        roles/                # Role × Permission matrix       — perm: permissions.manage
        staff/                # Staff users CRUD                — perm: staff.manage
        analytics/            # Dashboards, retention, logs, etc.
        tickets/  wiki/  roadmap/
    api/
      account/                # Player account: link/verify, microsoft OAuth
      auth/                   # Staff auth: discord, microsoft, me, logout
      ingest/[...path]/       # Plugin → site (x-api-key gated)
                              # routes: join leave world chat death command
                              #         block batch logs casino sanction
                              #         player-aliases economy-snapshot
                              #         player-profile cosmetics
      leaderboard/            # Public read API
      community/              # Admin: paged list of all players
      permissions/            # Admin: read/write role_permissions
      staff/  tickets/  ...
  components/
    admin/AdminContext.tsx    # { staff, can(perm), permissions, headers, logout }
    admin/AnalyticsAPI.tsx    # Helpers for analytics fetchers
    Navbar Footer Hero ...
  lib/
    analytics-db.ts           # libSQL client + idempotent schema migrations
    auth.ts                   # Staff session + requirePermission (server)
    player-auth.ts            # Player session + getPlayerStats (link via xuid)
    permissions.ts            # DB-backed permission map (cache, invalidation)
    roles.ts                  # Types, labels, DEFAULT_PERMISSIONS, ingame→site map
    staff-sync.ts             # syncStaffFromIngame: in-game rank → staff_users
    articles.ts ...
```

## Auth & Permissions
- **Staff**: log in via Discord or Microsoft. Session cookie → `staff_users` row.
- **Player** (public): log in via Microsoft, link in-game pseudo through `/link CODE`
  command (the plugin POSTs xuid + username to `/api/account/link/verify`).
- **Permissions**: `lib/roles.ts` exports `Permission` union and `DEFAULT_PERMISSIONS`
  (used as fallback). Live overrides live in `role_permissions` table, cached
  by `lib/permissions.ts` (30 s TTL, invalidated on write).
- `requirePermission(req, perm)` (server): async, reads cached map.
- `useAdmin().can(perm)` (client): reads the map shipped via `/api/auth/me`,
  falls back to `hasPermission()` defaults if not loaded.
- **Founder is hard-coded super-admin**: always has every permission, not
  editable from the matrix UI (security: prevents accidental lock-out).

## Rank sync (in-game → site)
On every `player-profile` ingest, `syncStaffFromIngame()` runs:
1. Resolves linked website account by `xuid` (in `player_accounts.linked_player_uuid`).
2. Maps in-game rank (`vérificateur`/`guide` → `guide`, `modérateur` → `moderator`,
   `super-modérateur` → `super_moderator`, `administrateur` → `admin`, `owner` → `founder`).
3. UPSERTs an `ingame`-sourced staff row, or DELETEs if the rank no longer maps to staff.
4. NEVER touches `manual`-sourced rows; manual rows take precedence.
5. Audit logged in `staff_audit` table.

Demoting a player in-game removes their site staff role within ~5 minutes
(plugin pushes profile every 5 min + on join/quit).

## DB tables (additions for player-account / community work)
- `player_accounts` — website accounts (Microsoft OAuth + manual link)
- `player_sessions`
- `player_profile_extra (xuid PK, rank, prestige, money, kills, deaths, jobs, ...)`
- `player_cosmetics (xuid + full_id PK, type, name, active)`
- `players.xuid` — added column, backfilled by ingest (links analytics player → linked account)
- `role_permissions (role, permission, allowed)` — overrides for the matrix
- `staff_users.source` ('manual' | 'ingame'), `.ingame_rank`, `.linked_xuid`
- `staff_audit (actor, action, target, detail, timestamp)` — audit trail

## Plugin ↔ site contract (x-api-key)
The plugin (`LinesiaCore`) authenticates every push with `X-Api-Key` matching
`ANALYTICS_API_KEY`. Routes consumed:
- `POST /api/ingest/join | leave | command | death | chat | world | block | casino | sanction | player-aliases | economy-snapshot | logs | batch`
- `POST /api/ingest/player-profile` — enriched profile (rank, prestige, jobs, money…) → backfills `players.xuid` + triggers `syncStaffFromIngame`
- `POST /api/ingest/cosmetics` — owned + active cosmetics
- `POST /api/account/link/verify` — confirms a `/link CODE` from Minecraft

## Key env vars
| Var | Purpose | Default |
|-----|---------|---------|
| `DATABASE_URL` | libSQL endpoint (local SQLite) | `file:./data/linesia.db` |
| `ANALYTICS_API_KEY` | Shared with plugin for ingest + link verify | (rotate in prod) |
| `ANALYTICS_API_URL` | URL of analytics backend (used by `/api/analytics/` proxy) | http://localhost:3000 |
| `ADMIN_PASSWORD` | Legacy article admin password | linesia-admin-2026 |
| `MICROSOFT_CLIENT_ID/SECRET/REDIRECT` | Staff + player MS OAuth | — |
| `DISCORD_CLIENT_ID/SECRET/REDIRECT` | Staff Discord OAuth | — |

See `SECURITY.md` for rotation policy + threat model.

## Commands
- `npm run dev` · `npm run build` · `npm run lint`

## Conventions
- All admin pages MUST gate render with `useAdmin().can("…")` (defense in depth).
- All admin API routes MUST gate via `requirePermission(req, "…")`.
- Never store player UUID in `staff_users.microsoft_id` — that column is the
  Microsoft account id (XUID for MS-linked humans only).
- `player_accounts.linked_player_uuid` actually holds the **xuid** post-link
  (legacy column name). Use `getPlayerStats(idOrXuid)` which accepts either.
