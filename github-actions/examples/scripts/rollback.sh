# Ejemplo de referencia: rollback.sh
# Este archivo es un EJEMPLO DOCUMENTAL, no un script funcional.
# Copiar a scripts/rollback.sh y dar permisos chmod +x durante la implementación.

#!/usr/bin/env bash
# =============================================================================
# rollback.sh — Rollback to a specific commit
# =============================================================================
# Usage: bash scripts/rollback.sh <commit-hash>
# =============================================================================

set -euo pipefail

COMMIT=${1:?Usage: rollback.sh <commit-hash>}
APP_DIR="${APP_DIR:-/opt/gestor-suscripciones}"
BACKEND_NAME="gestor-suscripciones-backend"
HEALTH_URL="http://localhost:3000/health"
HEALTH_RETRIES=5
HEALTH_INTERVAL=3

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { log "FATAL: $*"; exit 1; }

cd "$APP_DIR" || die "Application directory not found"

log "=== Rolling back to $COMMIT ==="

# Verify the commit exists
git cat-file -t "$COMMIT" > /dev/null 2>&1 || die "Commit $COMMIT does not exist"

git fetch origin 2>/dev/null

log "Checking out $COMMIT..."
git checkout "$COMMIT" 2>/dev/null || die "git checkout failed"

log "Installing dependencies..."
pnpm install --frozen-lockfile --prod 2>/dev/null || die "pnpm install failed"

log "Building..."
pnpm build 2>/dev/null || die "Build failed"

log "Restarting backend..."
sudo pm2 restart "$BACKEND_NAME" --update-env 2>/dev/null || die "PM2 restart failed"

log "Reloading nginx..."
sudo systemctl reload nginx 2>/dev/null || die "Nginx reload failed"

log "Running health checks..."
sleep "$HEALTH_INTERVAL"

HEALTH_OK=false
for i in $(seq 1 "$HEALTH_RETRIES"); do
    HEALTH_RESPONSE=$(curl -sf "$HEALTH_URL" 2>/dev/null || echo "FAILED")
    if echo "$HEALTH_RESPONSE" | grep -q '"status":"OK"'; then
        HEALTH_OK=true
        log "Backend health: OK"
        break
    fi
    log "Health check retry $i/$HEALTH_RETRIES"
    sleep "$HEALTH_INTERVAL"
done

if [ "$HEALTH_OK" = false ]; then
    die "Rollback health check failed. Manual intervention required."
fi

log "=== Rollback complete ==="
log "Current commit: $(git rev-parse --short HEAD)"
