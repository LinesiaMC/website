# Security — Linesia Website

## Threat model
The website handles three classes of trust:

| Class | Trust source | Worst case if compromised |
|-------|--------------|---------------------------|
| Public visitors | none | nothing (read-only public data) |
| Linked players | Microsoft OAuth + `/link` from in-game | impersonate their own profile actions on the site |
| Staff (guide → founder) | Discord/Microsoft OAuth + `staff_users` row | leak/manipulate logs, sanctions, articles, **promote arbitrary staff** |
| Plugin (`LinesiaCore`) | `X-Api-Key` shared secret | full ingest write — synthetic players, fake casino events, **inject staff via fake rank push** |

The plugin trust class is the highest-impact entry point because it can
auto-promote staff via `syncStaffFromIngame`. Protect the API key
accordingly.

## API key (`ANALYTICS_API_KEY`)
- **Where it lives**: env var on the website + `GlobalConstants::ANALYTICS["api-key"]` on the plugin.
- **Scope**: every `POST /api/ingest/*` route and `POST /api/account/link/verify`.
- **Rotation policy**: rotate every 90 days OR within 24 h of any of:
  - a staff departure with prod access
  - a leaked git commit / log
  - a lost or compromised dev machine that had it
- **Rotation procedure**:
  1. Generate a new 256-bit hex secret (`openssl rand -hex 32`).
  2. Add it as a SECOND accepted key on the website — do NOT remove the old one yet.
     (Modify `[...path]/route.ts` and `link/verify/route.ts` to accept either, or
     deploy a transient env `ANALYTICS_API_KEY_OLD`.)
  3. Update the plugin config + redeploy the server.
  4. Confirm zero traffic on the old key (logs).
  5. Remove old key from website env, redeploy.
- **Never log it.** Already excluded from request logging — keep it that way.

## Staff session security
- 30-day session cookie (`linesia_staff_session`, HttpOnly, SameSite=Lax).
- Sessions live in `staff_sessions`; deleted on logout, on staff row delete,
  and on rank demotion via `syncStaffFromIngame`.
- **Defense in depth**: every admin API route MUST call `requirePermission`,
  every admin page MUST call `useAdmin().can(...)` before rendering. Never
  rely solely on the sidebar hiding a link.

## Permission matrix
- Stored in `role_permissions`, edited via `/admin/roles` (perm `permissions.manage`).
- Defaults in `lib/roles.ts → DEFAULT_PERMISSIONS`.
- **Founder is hard-coded all-true** (`hasPermissionDb` short-circuits before
  the map). The matrix UI disables founder cells. This prevents an admin
  from accidentally locking out founder by toggling `permissions.manage` off.
- Cache TTL is 30 s; writes invalidate immediately.
- Audit any change manually if you need full traceability — extend
  `staff_audit` with a `permission.change` action.

## Staff auto-sync (in-game → site)
- Triggered by `POST /api/ingest/player-profile` containing a `rank` field.
- Mapping is in `lib/roles.ts → ingameRankToStaffRole`. Bedrock players
  cannot self-promote: rank changes only happen via in-game commands
  executed by privileged staff.
- **Risk**: a compromised plugin API key can fake a `player-profile` payload
  with `rank: "owner"` and a controlled `xuid` → auto-creates a `founder`-
  level staff row.
  - **Mitigation #1**: rotate the API key on any incident.
  - **Mitigation #2**: `staff_audit` records every promote/demote with
    actor=`ingame-sync`. Review periodically.
  - **Mitigation #3**: the auto-created row has `discord_id = NULL` and only
    `microsoft_id` set if the player previously linked their MS account. An
    attacker without the player's MS OAuth still cannot log in as that staff
    member — so this risk is *role escalation only via plugin compromise*.

## Player linking
- The `/link CODE` flow proves "this Microsoft user controls this Bedrock
  account" by having the player run a command in-game.
- Codes expire after 15 minutes (`LINK_CODE_TTL_MS`).
- Auto-link by Gamertag match is disabled-by-default (only via the explicit
  command).

## Common gotchas
- `player_accounts.linked_player_uuid` actually stores the **xuid** post-link
  (the column name predates the decision). `getPlayerStats(idOrXuid)`
  handles both.
- Never grant `community.view` to anonymous endpoints. The community list
  exposes `microsoft_id`, `xuid`, IPs (`players.ip_address`) — same
  sensitivity as the players analytics page.
- `players.ip_address` is only the most recent IP; we hash incoming IPs
  via `md5()` server-side BEFORE inserting (see plugin `ConnectionListener`).
  If you change this, update GDPR docs.

## Reporting
Vulnerabilities → DM founder on Discord. **Do not** open a public issue.
