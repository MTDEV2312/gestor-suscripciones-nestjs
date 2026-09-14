# Ejemplo de referencia: deploy.sh
# Este archivo es un EJEMPLO DOCUMENTAL, no un script funcional.
# Copiar a scripts/deploy.sh y dar permisos chmod +x durante la implementación.

#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Production deployment script for gestor-suscripciones
# =============================================================================
# Ejecutado por el self-hosted runner via SSH en el LXC 112.
# Corre como el usuario 'deploy' con privilegios sudo limitados.
#
# Usage: bash scripts/deploy.sh
# =============================================================================

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────
APP_DIR="${APP_DIR:-/opt/gestor-suscripciones}"
BACKUP_DIR="${BACKUP_DIR:-/opt/gestor-suscripciones-backups}"
BACKEND_NAME="gestor-suscripciones-backend"
HEALTH_URL="http://localhost:3000/health"
FRONTEND_URL="http://localhost:80"
HEALTH_RETRIES=5
HEALTH_INTERVAL=3

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_LOG="$BACKUP_DIR/deploy_$TIMESTAMP.log"

# ─── Helpers ─────────────────────────────────────────────────────────────────
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$DEPLOY_LOG"; }
die() { log "FATAL: $*"; exit 1; }

mkdir -p "$BACKUP_DIR"

# ─── Pre-deploy checks ──────────────────────────────────────────────────────
log "=== Pre-deploy checks ==="

cd "$APP_DIR" || die "Application directory not found: $APP_DIR"

CURRENT_COMMIT=$(git rev-parse --short HEAD)
log "Current commit: $CURRENT_COMMIT"

# Verify PostgreSQL is reachable
sudo -u postgres psql -c "SELECT 1;" > /dev/null 2>&1 || die "PostgreSQL is not reachable"
log "PostgreSQL: OK"

# Verify pnpm is available
command -v pnpm > /dev/null 2>&1 || die "pnpm not found"
log "pnpm: $(pnpm --version)"

# ─── Detect pending migrations ──────────────────────────────────────────────
log "=== Checking for pending migrations ==="

MIGRATIONS_OUTPUT=$(npx typeorm migration:show -d apps/backend/src/database/data-source.ts 2>&1 || true)
PENDING_COUNT=$(echo "$MIGRATIONS_OUTPUT" | grep -c "pending" || true)

if [ "$PENDING_COUNT" -gt 0 ]; then
    log "Found $PENDING_COUNT pending migration(s) — creating database backup"

    DB_NAME=$(grep DB_DATABASE apps/backend/.env | cut -d'=' -f2 | tr -d ' ')
    DB_NAME="${DB_NAME:-gestor_suscripciones}"

    BACKUP_FILE="$BACKUP_DIR/db_before_deploy_$TIMESTAMP.sql"
    sudo -u postgres pg_dump "$DB_NAME" > "$BACKUP_FILE" 2>> "$DEPLOY_LOG"
    log "Backup created: $BACKUP_FILE"
else
    log "No pending migrations"
fi

# ─── Install dependencies ──────────────────────────────────────────────────
log "=== Installing dependencies ==="
pnpm install --frozen-lockfile --prod 2>> "$DEPLOY_LOG" || die "pnpm install failed"
log "Dependencies installed"

# ─── Run migrations ─────────────────────────────────────────────────────────
if [ "$PENDING_COUNT" -gt 0 ]; then
    log "=== Running migrations ==="
    npx typeorm migration:run -d apps/backend/src/database/data-source.ts 2>> "$DEPLOY_LOG" || {
        log "ERROR: Migration failed. Attempting to restore backup..."
        if [ -n "${BACKUP_FILE:-}" ] && [ -f "$BACKUP_FILE" ]; then
            sudo -u postgres psql "$DB_NAME" < "$BACKUP_FILE" > /dev/null 2>&1
            log "Database restored from backup"
        fi
        die "Migration failed and backup restored"
    }
    log "Migrations applied successfully"
fi

# ─── Restart backend ───────────────────────────────────────────────────────
log "=== Restarting backend ==="
sudo pm2 restart "$BACKEND_NAME" --update-env 2>> "$DEPLOY_LOG" || die "PM2 restart failed"
log "PM2 restart: OK"

# ─── Reload nginx ──────────────────────────────────────────────────────────
log "=== Reloading nginx ==="
sudo systemctl reload nginx 2>> "$DEPLOY_LOG" || die "Nginx reload failed"
log "Nginx reload: OK"

# ─── Health checks ─────────────────────────────────────────────────────────
log "=== Running health checks ==="
sleep "$HEALTH_INTERVAL"

HEALTH_OK=false
for i in $(seq 1 "$HEALTH_RETRIES"); do
    HEALTH_RESPONSE=$(curl -sf "$HEALTH_URL" 2>/dev/null || echo "FAILED")
    if echo "$HEALTH_RESPONSE" | grep -q '"status":"OK"'; then
        HEALTH_OK=true
        log "Backend health check: OK (attempt $i)"
        break
    fi
    log "Backend health check: retry $i/$HEALTH_RETRIES"
    sleep "$HEALTH_INTERVAL"
done

if [ "$HEALTH_OK" = false ]; then
    log "ERROR: Backend health check failed after $HEALTH_RETRIES attempts"
    log "Last response: $HEALTH_RESPONSE"
    sudo pm2 logs "$BACKEND_NAME" --lines 30 --nostream 2>> "$DEPLOY_LOG"
    die "Deploy failed: backend unhealthy"
fi

# Frontend health check
FRONTEND_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    log "Frontend health check: OK (HTTP $FRONTEND_STATUS)"
else
    log "WARNING: Frontend returned HTTP $FRONTEND_STATUS"
fi

# ─── Cleanup old backups (keep last 5) ────────────────────────────────────
log "=== Cleaning old backups ==="
ls -t "$BACKUP_DIR"/db_before_deploy_*.sql 2>/dev/null | tail -n +6 | xargs -r rm -f

# ─── Summary ───────────────────────────────────────────────────────────────
log "=== Deploy complete ==="
log "Commit: $CURRENT_COMMIT"
log "Migrations: $PENDING_COUNT pending"
log "Backend: healthy"
log "Frontend: HTTP $FRONTEND_STATUS"
log "Log: $DEPLOY_LOG"
