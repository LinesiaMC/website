# Migration Vercel → VPS

Guide pas-à-pas pour passer le site Linesia de Vercel + Turso vers un VPS
auto-hébergé avec SQLite local.

## Pourquoi

- **Turso explose** en quota à cause du volume d'analytics (voir les
  correctifs dans `src/app/api/analytics/[...path]/route.ts` et
  `src/lib/query-cache.ts`).
- **SQLite en local** : zéro round-trip réseau, zéro quota, perfs 10-100×
  supérieures pour ce type de charge.
- **Vercel Functions** facturent à l'invocation ; le dashboard analytics
  polling = coût qui grimpe.

Le même client `@libsql/client` supporte les deux modes : il suffit de
passer `DATABASE_URL=file:./data/linesia.db` au lieu d'une URL `libsql://`.

## 0. Pré-requis VPS

- Debian 12 ou Ubuntu 22.04/24.04 LTS
- 2 vCPU / 2 Go RAM minimum (4 Go recommandé pour confort)
- 20 Go SSD
- Accès root SSH
- Un nom de domaine pointant sur l'IP (A record pour `linesia.net` et
  `www.linesia.net`)

## 1. Upload du code

Deux options :

**Option A — via git (recommandé)** : pousse ton projet sur un repo
GitHub/Gitea privé, puis laisse le script cloner.

**Option B — rsync direct** depuis ta machine :
```bash
rsync -az --exclude node_modules --exclude .next --exclude data \
  ./website/ root@VPS_IP:/opt/linesia/website/
```

## 2. Lancer le script d'installation

Sur le VPS, en root :

```bash
cd /opt/linesia/website
DOMAIN=linesia.net \
REPO=git@github.com:YOUR_USER/linesia-website.git \
ADMIN_EMAIL=you@linesia.net \
bash scripts/install-vps.sh
```

Si tu as uploadé via rsync (pas de git), laisse `REPO` vide :
```bash
DOMAIN=linesia.net ADMIN_EMAIL=you@linesia.net bash scripts/install-vps.sh
```

Le script est **idempotent** — tu peux le relancer pour appliquer une mise
à jour (pull + `npm run build` + restart service).

Il installe :
- Node.js 22 LTS
- nginx + certbot (Let's Encrypt auto)
- ufw (firewall 22/80/443)
- un user système `linesia`
- le service systemd `linesia-website`
- le vhost nginx reverse proxy vers `127.0.0.1:3000`

## 3. Configurer les variables d'env

Édite `/opt/linesia/website/.env.production` :

```env
DATABASE_URL=file:/opt/linesia/data/linesia.db
ADMIN_PASSWORD=<mot-de-passe-fort>
ANALYTICS_API_KEY=<clé-api-fort-aléatoire-64-chars>
NEXT_PUBLIC_SITE_URL=https://linesia.net
PORT=3000
NODE_ENV=production
```

La clé `ANALYTICS_API_KEY` doit être identique dans ton plugin Minecraft
et dans le bot qui envoient les événements vers `/api/ingest/*`.

Redémarre :
```bash
systemctl restart linesia-website
journalctl -u linesia-website -f
```

## 4. Migrer les données Turso → SQLite local

**Important** : fais ça *après* avoir arrêté les ingestions (ou en double
écriture), pour éviter de perdre des événements.

Depuis le VPS, une fois le service en route :

```bash
TURSO_DATABASE_URL=libsql://linesia-xxx.turso.io \
TURSO_AUTH_TOKEN=eyJhbGciOi... \
LOCAL_DB_PATH=/opt/linesia/data/linesia.db \
sudo -u linesia node /opt/linesia/website/scripts/migrate-turso-to-sqlite.mjs
```

Le script :
1. Crée le schéma SQLite local
2. Pagine chaque table en lots de 1000 lignes
3. Insère via `INSERT OR REPLACE` (idempotent)

Ordre de grandeur : sur 1M lignes de `logs`, prévoir ~2-5 minutes selon
la bande passante vers Turso.

## 5. Basculer le trafic

1. **Mets à jour ton DNS** : A record `linesia.net` → IP du VPS, TTL court
   (120s) pour pouvoir revenir en arrière vite.
2. **Pointe le plugin MC / le bot** vers `https://linesia.net/api/ingest/*`
   (au lieu de l'URL Vercel).
3. **Vérifie** : `curl -I https://linesia.net` et ouvre le panneau admin.
4. Après ~24 h stable : retire le projet Vercel, garde Turso en
   read-only 1 semaine au cas où.

## 6. Sauvegardes

SQLite = 1 fichier. Backup quotidien recommandé :

```bash
# /etc/cron.daily/linesia-db-backup
#!/bin/sh
DEST=/var/backups/linesia
mkdir -p $DEST
sqlite3 /opt/linesia/data/linesia.db ".backup $DEST/linesia-$(date +%F).db"
find $DEST -name "linesia-*.db" -mtime +14 -delete
```

`chmod +x /etc/cron.daily/linesia-db-backup`.

Pour un backup externe, pousse ensuite `$DEST/linesia-YYYY-MM-DD.db`
vers un S3/Backblaze/rsync distant.

## 7. Monitoring

- `systemctl status linesia-website`
- `journalctl -u linesia-website -f`
- Taille DB : `du -h /opt/linesia/data/linesia.db`
- `htop` pour la charge CPU/RAM
- Si tu veux aller plus loin : `netdata` (1 ligne d'install) donne un
  dashboard temps réel gratuit.

## 8. Mises à jour applicatives

```bash
cd /opt/linesia/website
sudo -u linesia git pull
sudo -u linesia npm ci --omit=dev
sudo -u linesia npm run build
systemctl restart linesia-website
```

Ou re-run le script `install-vps.sh` (même effet, avec le bonus d'appliquer
les évolutions de config nginx/systemd si tu les commit dans le script).

## 9. Performance — ce qui a été changé côté code

| Avant | Après |
|---|---|
| `stats/overview` : 10 requêtes séquentielles | 1 requête fusionnée avec sous-SELECTs |
| `stats/daily-players` (30 j) : 60 requêtes | 2 requêtes `GROUP BY day_bucket` |
| `stats/retention` (30 j) : 90 requêtes | 3 requêtes groupées |
| `stats/casino` : 10 requêtes | 1 requête conditionnelle |
| `stats/economy` : 7 requêtes | 1 requête conditionnelle |
| `stats/economy/daily` : 90 requêtes | 1 requête groupée |
| `stats/boxes` + `/daily` : 10 + 30 req | 2 requêtes |
| `stats/items/daily` : 42 requêtes | 1 requête groupée |
| `staff/overview` : 12 requêtes | 1 requête |
| `staff/daily-activity` : 30 requêtes | 1 requête groupée |
| `ingest/batch` : N `INSERT` séquentiels | 1 `db.batch()` |
| Auto-refresh admin : 30 s | 120 s |
| Pas de cache | Cache mémoire 30 s |

Résultat attendu avec 3 admins sur le dashboard :
- **Avant** : ~260 000 queries/jour/admin → ~780 000 req/jour
- **Après** : ~8 000 queries/jour total (les 3 tabs partagent le cache)

Soit **~100× moins** de charge DB.
