// Boot des subscriptions LISTEN au démarrage du serveur Next.
// Importé par instrumentation.ts pour s'attacher dès le boot.
//
// Invalide les caches in-memory au moment où la DB change (rang joueur,
// matrice de permissions, lien Discord, etc.). Évite tout polling.

import { subscribe } from "./db";
import { invalidatePermissionCache, invalidateStaffExtrasCache } from "./permissions";
import { cacheInvalidate } from "./query-cache";

let started = false;

export async function startDbListeners(): Promise<void> {
    if (started) return;
    started = true;

    await subscribe("linesia.permissions_changed", () => {
        invalidatePermissionCache();
    });

    await subscribe("linesia.staff_changed", () => {
        invalidatePermissionCache();
        invalidateStaffExtrasCache();
        cacheInvalidate(["staff:"]);
    });

    await subscribe("linesia.player_profile_updated", (payload) => {
        const xuid = (payload as { xuid?: string })?.xuid;
        if (xuid) cacheInvalidate([`profile:${xuid}`, "leaderboard:"]);
    });

    await subscribe("linesia.player_cosmetics_updated", (payload) => {
        const xuid = (payload as { xuid?: string })?.xuid;
        if (xuid) cacheInvalidate([`cosmetics:${xuid}`]);
    });

    await subscribe("linesia.player_link_changed", (payload) => {
        const xuid = (payload as { xuid?: string })?.xuid;
        const discordId = (payload as { discord_id?: string })?.discord_id;
        const prefixes: string[] = [];
        if (xuid) prefixes.push(`profile:${xuid}`);
        if (discordId) prefixes.push(`discord:${discordId}`);
        if (prefixes.length) cacheInvalidate(prefixes);
    });

    await subscribe("linesia.sanction_added", (payload) => {
        const xuid = (payload as { xuid?: string })?.xuid;
        if (xuid) cacheInvalidate([`sanctions:${xuid}`]);
    });

    console.log("[db-listen] subscribed to linesia.* channels");
}
