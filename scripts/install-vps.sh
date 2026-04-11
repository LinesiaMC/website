#!/usr/bin/env bash
#
# Linesia website — VPS installation script (Debian / Ubuntu).
#
# What it does:
#   1. Installs Node.js 22 LTS, git, nginx, certbot, ufw
#   2. Creates a dedicated `linesia` system user
#   3. Clones or pulls the repo into /opt/linesia/website
#   4. Installs deps, builds Next.js for production
#   5. Writes a systemd service (linesia-website)
#   6. Writes an nginx reverse-proxy vhost
#   7. (Optional) issues a Let's Encrypt certificate
#   8. Opens firewall for 80/443/22
#
# Usage (as root):
#   DOMAIN=linesia.net \
#   REPO=https://github.com/YOUR_USER/linesia-website.git \
#   ADMIN_EMAIL=you@linesia.net \
#   bash install-vps.sh
#
# Idempotent: safe to re-run. Env vars can be overridden; defaults are
# noted inline.
#
set -euo pipefail

# ---- config ----------------------------------------------------------------
DOMAIN="${DOMAIN:-linesia.net}"
REPO="${REPO:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@${DOMAIN}}"
INSTALL_DIR="${INSTALL_DIR:-/opt/linesia/website}"
DATA_DIR="${DATA_DIR:-/opt/linesia/data}"
SERVICE_USER="${SERVICE_USER:-linesia}"
NODE_MAJOR="${NODE_MAJOR:-22}"
PORT="${PORT:-3000}"
ENABLE_SSL="${ENABLE_SSL:-1}"

# ---- helpers ---------------------------------------------------------------
log()  { printf "\033[1;35m[linesia]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[linesia]\033[0m %s\n" "$*" >&2; }
die()  { printf "\033[1;31m[linesia]\033[0m %s\n" "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Run as root (sudo)."

log "domain        : ${DOMAIN}"
log "install dir   : ${INSTALL_DIR}"
log "data dir      : ${DATA_DIR}"
log "service user  : ${SERVICE_USER}"
log "node          : ${NODE_MAJOR}"
log "port          : ${PORT}"

# ---- 1. base packages ------------------------------------------------------
log "installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg git nginx ufw sqlite3 rsync

# ---- 2. Node.js via NodeSource --------------------------------------------
if ! command -v node >/dev/null || [[ "$(node -v | cut -c2- | cut -d. -f1)" != "${NODE_MAJOR}" ]]; then
  log "installing Node.js ${NODE_MAJOR}"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
log "node $(node -v)  npm $(npm -v)"

# ---- 3. user + directories ------------------------------------------------
if ! id -u "${SERVICE_USER}" >/dev/null 2>&1; then
  log "creating system user ${SERVICE_USER}"
  useradd --system --home /opt/linesia --shell /usr/sbin/nologin "${SERVICE_USER}"
fi

mkdir -p "${INSTALL_DIR}" "${DATA_DIR}"
chown -R "${SERVICE_USER}:${SERVICE_USER}" /opt/linesia

# ---- 4. source code --------------------------------------------------------
if [[ -n "${REPO}" ]]; then
  if [[ -d "${INSTALL_DIR}/.git" ]]; then
    log "pulling latest"
    sudo -u "${SERVICE_USER}" git -C "${INSTALL_DIR}" pull --ff-only
  else
    log "cloning ${REPO}"
    sudo -u "${SERVICE_USER}" git clone "${REPO}" "${INSTALL_DIR}"
  fi
else
  warn "REPO not set — assuming code is already uploaded to ${INSTALL_DIR}"
  [[ -f "${INSTALL_DIR}/package.json" ]] || die "no package.json at ${INSTALL_DIR}"
fi

# ---- 5. env file -----------------------------------------------------------
ENV_FILE="${INSTALL_DIR}/.env.production"
if [[ ! -f "${ENV_FILE}" ]]; then
  log "creating template ${ENV_FILE} — EDIT IT BEFORE RESTART"
  cat > "${ENV_FILE}" <<EOF
# --- Linesia website production env ---
# DB — local SQLite lives under ${DATA_DIR}
DATABASE_URL=file:${DATA_DIR}/linesia.db

# Admin panel password
ADMIN_PASSWORD=change-me-${RANDOM}${RANDOM}

# Analytics ingest key (must match the Minecraft plugin / bot)
ANALYTICS_API_KEY=change-me-$(head -c 32 /dev/urandom | base64 | tr -d '+/=')

# Public site URL
NEXT_PUBLIC_SITE_URL=https://${DOMAIN}

# Node runtime port (nginx upstream)
PORT=${PORT}
NODE_ENV=production
EOF
  chown "${SERVICE_USER}:${SERVICE_USER}" "${ENV_FILE}"
  chmod 600 "${ENV_FILE}"
fi

# ---- 6. install + build ---------------------------------------------------
log "installing deps"
sudo -u "${SERVICE_USER}" bash -lc "cd '${INSTALL_DIR}' && npm ci --omit=dev --no-audit --no-fund || npm install --no-audit --no-fund"

log "building"
sudo -u "${SERVICE_USER}" bash -lc "cd '${INSTALL_DIR}' && npm run build"

# ---- 7. systemd service ---------------------------------------------------
SERVICE_FILE=/etc/systemd/system/linesia-website.service
log "writing ${SERVICE_FILE}"
cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=Linesia Next.js website
After=network.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/npm run start -- -p ${PORT}
Restart=on-failure
RestartSec=3
# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=${DATA_DIR} ${INSTALL_DIR}/.next

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable linesia-website
systemctl restart linesia-website
log "service started — check with: journalctl -u linesia-website -f"

# ---- 8. nginx reverse proxy -----------------------------------------------
NGINX_FILE=/etc/nginx/sites-available/linesia-website
log "writing ${NGINX_FILE}"
cat > "${NGINX_FILE}" <<EOF
# HTTP → HTTPS redirect (certbot will rewrite this block)
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    # ACME challenge stays plain http
    location /.well-known/acme-challenge/ { root /var/www/html; }

    # Reverse proxy to Next.js
    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 90s;
    }

    # Static cache for Next.js assets
    location /_next/static/ {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    client_max_body_size 10m;
}
EOF

ln -sf "${NGINX_FILE}" /etc/nginx/sites-enabled/linesia-website
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ---- 9. firewall -----------------------------------------------------------
if command -v ufw >/dev/null; then
  log "configuring ufw"
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
  yes | ufw enable >/dev/null 2>&1 || true
fi

# ---- 10. SSL ---------------------------------------------------------------
if [[ "${ENABLE_SSL}" == "1" ]]; then
  log "installing certbot"
  apt-get install -y -qq certbot python3-certbot-nginx
  if certbot certificates 2>/dev/null | grep -q "${DOMAIN}"; then
    log "certificate already present, skipping"
  else
    log "requesting Let's Encrypt certificate"
    certbot --nginx --non-interactive --agree-tos -m "${ADMIN_EMAIL}" \
      -d "${DOMAIN}" -d "www.${DOMAIN}" --redirect || \
      warn "certbot failed — re-run manually once DNS points to this VPS"
  fi
fi

log "DONE."
log ""
log "Next steps:"
log "  1. Edit ${ENV_FILE} and set a strong ADMIN_PASSWORD + ANALYTICS_API_KEY"
log "  2. Restart: systemctl restart linesia-website"
log "  3. Check: curl -I https://${DOMAIN}"
log "  4. (optional) Migrate Turso data:"
log "       TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... \\"
log "       LOCAL_DB_PATH=${DATA_DIR}/linesia.db \\"
log "       sudo -u ${SERVICE_USER} node ${INSTALL_DIR}/scripts/migrate-turso-to-sqlite.mjs"
