// Next.js instrumentation hook — exécuté une fois au boot du serveur,
// avant la 1re requête. C'est ici qu'on attache les LISTEN Postgres
// et qu'on démarre le heartbeat.

export async function register(): Promise<void> {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;
    const { startDbListeners } = await import("./lib/db-listen");
    const { startHeartbeat } = await import("./lib/heartbeat");
    await Promise.all([
        startDbListeners().catch((e) => console.error("[instrumentation] startDbListeners:", e)),
        startHeartbeat().catch((e) => console.error("[instrumentation] startHeartbeat:", e)),
    ]);
}
