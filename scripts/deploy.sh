#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Production deployment script for gestor-suscripciones
# =============================================================================
# Executed by the self-hosted runner via SSH on LXC 112 (homelab).
# Runs as the 'deploy' user with restricted sudo privileges.
#
# Enforces:
# - Strict bash error safety (set -euo pipefail)
# - Pre-deploy dependency checks (pnpm, postgres)
# - Pre-migration database snapshot with pg_dump
# - Automated backup restoration trap if migration fails
# - Zero-downtime PM2 reload and Nginx reload
# - Health check execution
#
# Usage: bash scripts/deploy.sh
# =============================================================================

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────
APP_DIR="${APP_DIR:-/opt/gestor-suscripciones}"
BACKUP_DIR="${BACKUP_DIR:-/opt/gestor-suscripciones-backups}"
BACKEND_NAME="${BACKEND_NAME:-gestor-suscripciones-backend}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_LOG="$BACKUP_DIR/deploy_$TIMESTAMP.log"

# ─── Helpers ─────────────────────────────────────────────────────────────────
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [DEPLOY] $*" | tee -a "$DEPLOY_LOG"
}

die() {
    log "FATAL: $*"
    exit 1
}

mkdir -p "$BACKUP_DIR"

log "=== Starting Deployment ($TIMESTAMP) ==="

# ─── 1. Pre-deploy checks ─────────────────────────────────────────────────────
log "=== 1. Running Pre-deploy Checks ==="

cd "$APP_DIR" || die "Application directory not found: $APP_DIR"

# Verify pnpm is installed and available
command -v pnpm >/dev/null 2>&1 || die "pnpm is not installed or not in PATH"
log "pnpm version: $(pnpm --version)"

# Verify PostgreSQL service is running and reachable
sudo -u postgres psql -c "SELECT 1;" >/dev/null 2>&1 || die "PostgreSQL is not reachable"
log "PostgreSQL connection: OK"

# ─── 2. Git Pull Latest Code ──────────────────────────────────────────────────
log "=== 2. Updating Source Code ==="
PREV_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "initial")
log "Previous commit: $PREV_COMMIT"

git fetch origin main 2>> "$DEPLOY_LOG" || true
git pull origin main 2>> "$DEPLOY_LOG" || die "Failed to pull latest changes from origin/main"

NEW_COMMIT=$(git rev-parse --short HEAD)
log "Target commit: $NEW_COMMIT"

# ─── 3. Detect Pending Migrations & Create Pre-Migration Backup ───────────────
log "=== 3. Checking Pending Migrations & Database Snapshot ==="

DB_NAME=$(grep -E "^DB_DATABASE=" apps/backend/.env 2>/dev/null | cut -d'=' -f2- | tr -d ' "\r' || true)
DB_NAME="${DB_NAME:-gestor_suscripciones}"

MIGRATIONS_OUTPUT=$(npx typeorm migration:show -d apps/backend/src/database/data-source.ts 2>&1 || true)
PENDING_COUNT=$(echo "$MIGRATIONS_OUTPUT" | grep -E -c "(\[ \]|pending)" || true)

BACKUP_FILE=""
if [ "$PENDING_COUNT" -gt 0 ]; then
    log "Found $PENDING_COUNT pending migration(s) — taking pre-migration snapshot of '$DB_NAME'..."
    BACKUP_FILE="$BACKUP_DIR/db_before_deploy_$TIMESTAMP.sql"
    sudo -u postgres pg_dump "$DB_NAME" > "$BACKUP_FILE" 2>> "$DEPLOY_LOG" || die "pg_dump database backup failed"
    log "Pre-migration database backup created: $BACKUP_FILE"
else
    log "No pending migrations detected."
fi

# ─── Error Trap for Migration Failure ─────────────────────────────────────────
restore_backup_on_failure() {
    log "ERROR: Migration failed! Initiating automated database restore..."
    if [ -n "${BACKUP_FILE:-}" ] && [ -f "$BACKUP_FILE" ]; then
        log "Restoring database '$DB_NAME' from snapshot '$BACKUP_FILE'..."
        if sudo -u postgres psql "$DB_NAME" < "$BACKUP_FILE" >/dev/null 2>&1; then
            log "Database restored successfully from pre-migration backup."
        else
            log "CRITICAL: Database restore failed! Manual intervention required."
        fi
    fi
    die "Deployment aborted due to migration failure (state restored)."
}

# ─── 4. Install Dependencies & Build ──────────────────────────────────────────
log "=== 4. Installing Dependencies and Building Monorepo ==="

# Install dependencies (including devDependencies required for compilation)
pnpm install --frozen-lockfile 2>> "$DEPLOY_LOG" || pnpm install 2>> "$DEPLOY_LOG" || die "pnpm install failed"
log "Dependencies installed successfully."

# Compile backend and frontend
log "Building monorepo artifacts (backend + frontend)..."
pnpm build 2>> "$DEPLOY_LOG" || die "pnpm build failed"
log "Build completed successfully."

# Prune devDependencies to keep production environment lean
log "Ensuring production dependency layout..."
pnpm install --prod 2>> "$DEPLOY_LOG" || true

# ─── 5. Execute TypeORM Migrations ────────────────────────────────────────────
if [ "$PENDING_COUNT" -gt 0 ]; then
    log "=== 5. Applying Database Migrations ==="
    npx typeorm migration:run -d apps/backend/src/database/data-source.ts 2>> "$DEPLOY_LOG" || restore_backup_on_failure
    log "Database migrations applied successfully."
else
    log "=== 5. Skipping Migrations (None Pending) ==="
fi

# ─── 6. Zero-Downtime Service Reload ──────────────────────────────────────────
log "=== 6. Reloading Services ==="

# PM2 zero-downtime cluster reload
log "Reloading PM2 service '$BACKEND_NAME'..."
sudo pm2 reload "$BACKEND_NAME" --update-env 2>> "$DEPLOY_LOG" || die "PM2 reload failed"
log "PM2 reload: OK"

# Nginx configuration / worker reload
log "Reloading Nginx web server..."
(sudo nginx -s reload 2>> "$DEPLOY_LOG" || sudo systemctl reload nginx 2>> "$DEPLOY_LOG") || die "Nginx reload failed"
log "Nginx reload: OK"

# ─── 7. Execute Health Check ──────────────────────────────────────────────────
log "=== 7. Verifying Deployment Health ==="
bash scripts/health-check.sh 2>&1 | tee -a "$DEPLOY_LOG" || die "Post-deployment health checks failed!"
log "Post-deployment health verification passed."

# ─── 8. Backup Rotation ───────────────────────────────────────────────────────
log "=== 8. Rotating Old Backups (Keeping last 5) ==="
ls -t "$BACKUP_DIR"/db_before_deploy_*.sql 2>/dev/null | tail -n +6 | xargs -r rm -f 2>/dev/null || true

# ─── Summary ──────────────────────────────────────────────────────────────────
log "=== Deployment Successfully Completed ==="
log "Deployed commit: $NEW_COMMIT"
log "Previous commit: $PREV_COMMIT"
log "Migrations run:  $PENDING_COUNT"
log "Deployment log:  $DEPLOY_LOG"

exit 0
