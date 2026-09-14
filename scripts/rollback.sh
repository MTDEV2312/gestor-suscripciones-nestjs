#!/usr/bin/env bash
# =============================================================================
# rollback.sh — Production rollback script for gestor-suscripciones
# =============================================================================
# Reverts the application to a specified target commit SHA or git tag.
#
# Enforces:
# - Strict bash error safety (set -euo pipefail)
# - Input sanitization preventing command injection
# - Commit existence validation via git cat-file
# - Clean dependency installation and rebuild
# - Process reload (PM2) and web server reload (Nginx)
# - Post-rollback health verification via scripts/health-check.sh
#
# Usage: bash scripts/rollback.sh <commit-sha-or-tag>
# =============================================================================

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────
COMMIT="${1:-}"
APP_DIR="${APP_DIR:-/opt/gestor-suscripciones}"
BACKEND_NAME="${BACKEND_NAME:-gestor-suscripciones-backend}"

# ─── Helpers ─────────────────────────────────────────────────────────────────
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ROLLBACK] $*"
}

die() {
    log "FATAL: $*"
    exit 1
}

# ─── 1. Input Validation & Sanitization ───────────────────────────────────────
if [ -z "$COMMIT" ]; then
    die "Target commit reference or tag is required. Usage: bash scripts/rollback.sh <commit-sha-or-tag>"
fi

# Sanitize against command injection
if [[ ! "$COMMIT" =~ ^[a-zA-Z0-9._-]+$ ]]; then
    die "Invalid target reference format: '$COMMIT'. Only alphanumeric, dot, underscore, and hyphen are allowed."
fi

cd "$APP_DIR" || die "Application directory not found: $APP_DIR"

# ─── 2. Validate Target Commit Existence ──────────────────────────────────────
log "Validating target reference '$COMMIT'..."
git fetch origin --tags 2>/dev/null || true

if ! git cat-file -e "$COMMIT^{commit}" 2>/dev/null && ! git cat-file -e "$COMMIT" 2>/dev/null; then
    die "Reference '$COMMIT' not found in git repository."
fi

CURRENT_COMMIT=$(git rev-parse --short HEAD)
log "Current commit: $CURRENT_COMMIT"
log "Initiating rollback to target reference: $COMMIT"

# ─── 3. Checkout Target Ref ───────────────────────────────────────────────────
log "Checking out '$COMMIT'..."
git reset --hard HEAD || true
git clean -fd -e apps/backend/.env || true
git checkout "$COMMIT" || die "git checkout '$COMMIT' failed"
NEW_COMMIT=$(git rev-parse --short HEAD)
log "Successfully checked out commit: $NEW_COMMIT"

# ─── 4. Reinstall Dependencies & Rebuild ──────────────────────────────────────
log "Installing dependencies for target revision..."
pnpm install --frozen-lockfile || pnpm install || die "pnpm install failed"

log "Rebuilding monorepo artifacts (backend + frontend)..."
pnpm build || die "Build failed during rollback"

# Prune devDependencies for production
pnpm install --prod || true

# ─── 5. Reload Services ───────────────────────────────────────────────────────
log "Reloading PM2 service '$BACKEND_NAME'..."
(sudo pm2 reload "$BACKEND_NAME" --update-env || sudo pm2 restart "$BACKEND_NAME" --update-env) || die "PM2 reload failed"
log "PM2 reload: OK"

log "Reloading Nginx web server..."
(sudo nginx -s reload || sudo systemctl reload nginx) || die "Nginx reload failed"
log "Nginx reload: OK"

# ─── 6. Verify Service Health ─────────────────────────────────────────────────
log "Executing post-rollback health checks..."
bash scripts/health-check.sh || die "Rollback health check failed! Manual intervention required."

log "=== Rollback Completed Successfully ==="
log "Previous commit: $CURRENT_COMMIT"
log "Active commit:   $NEW_COMMIT"

exit 0
