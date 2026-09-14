#!/usr/bin/env bash
# =============================================================================
# health-check.sh — Service health verification script
# =============================================================================
# Verifies that both the backend and frontend endpoints are healthy and reachable.
# Returns 0 on success, 1 on failure.
#
# Usage: bash scripts/health-check.sh
# =============================================================================

set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:3000/health}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost}"
MAX_RETRIES="${MAX_RETRIES:-5}"
RETRY_INTERVAL="${RETRY_INTERVAL:-3}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [HEALTH] $*"
}

log "Starting health check validation..."
log "Backend target:  $BACKEND_URL"
log "Frontend target: $FRONTEND_URL"
log "Max retries:     $MAX_RETRIES (interval: ${RETRY_INTERVAL}s)"

# ─── 1. Backend Health Check ──────────────────────────────────────────────────
BACKEND_HEALTHY=false
for i in $(seq 1 "$MAX_RETRIES"); do
    log "Probing backend endpoint (attempt $i/$MAX_RETRIES)..."
    RESPONSE=$(curl -sf "$BACKEND_URL" 2>/dev/null || true)
    if echo "$RESPONSE" | grep -q '"status":"OK"'; then
        BACKEND_HEALTHY=true
        log "Backend health check passed on attempt $i."
        break
    fi
    log "Backend health check attempt $i failed. Retrying in ${RETRY_INTERVAL}s..."
    sleep "$RETRY_INTERVAL"
done

if [ "$BACKEND_HEALTHY" = false ]; then
    log "ERROR: Backend failed health check after $MAX_RETRIES attempts."
    exit 1
fi

# ─── 2. Frontend Health Check ─────────────────────────────────────────────────
FRONTEND_HEALTHY=false
for i in $(seq 1 "$MAX_RETRIES"); do
    log "Probing frontend endpoint (attempt $i/$MAX_RETRIES)..."
    HTTP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        FRONTEND_HEALTHY=true
        log "Frontend health check passed on attempt $i (HTTP $HTTP_STATUS)."
        break
    fi
    log "Frontend health check attempt $i failed (HTTP $HTTP_STATUS). Retrying in ${RETRY_INTERVAL}s..."
    sleep "$RETRY_INTERVAL"
done

if [ "$FRONTEND_HEALTHY" = false ]; then
    log "ERROR: Frontend failed health check after $MAX_RETRIES attempts."
    exit 1
fi

log "All health checks passed successfully."
exit 0
