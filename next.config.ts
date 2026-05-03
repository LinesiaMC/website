import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
    // pg + toutes ses deps transitives utilisent des APIs Node natives
    // (fs, path, net, tls, stream) — ne pas les bundler.
    serverExternalPackages: [
        "pg", "pg-native", "pg-pool", "pg-cursor",
        "pg-connection-string", "pg-types", "pgpass",
    ],
    // serverExternalPackages couvre routes/server components mais pas
    // toujours instrumentation.ts ni les imports en cascade depuis un
    // composant qui pourrait finir dans un bundle client.
    webpack: (config, { isServer }) => {
        if (isServer) {
            // Côté serveur : pg & co restent en require natif Node.
            const externals = config.externals as Array<unknown>;
            externals.push(({ request }: { request?: string }, cb: (err?: Error | null, res?: string) => void) => {
                if (request && /^(pg|pg-native|pg-pool|pg-cursor|pg-connection-string|pg-types|pgpass|split2)$/.test(request)) {
                    return cb(null, "commonjs " + request);
                }
                cb();
            });
        } else {
            // Côté client : pg n'a rien à y faire (server-only). On stub
            // les modules Node natifs et pg lui-même, ainsi un import
            // hérité dans un composant client ne casse plus le build.
            // Si le code essaie réellement d'utiliser pg côté client, ça
            // crashera à l'exécution — c'est voulu, c'est un bug.
            config.resolve = config.resolve || {};
            config.resolve.fallback = {
                ...(config.resolve.fallback || {}),
                fs: false, path: false, net: false, tls: false, dns: false,
                stream: false, crypto: false, os: false, http: false, https: false, zlib: false,
                "pg-native": false,
            };
        }
        return config;
    },
};

export default withNextIntl(nextConfig);
