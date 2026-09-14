# Proposal: CI/CD Pipeline with Self-Hosted Runner

## Intent
Establish a robust, automated CI/CD and rollback workflow using GitHub Actions running on a self-hosted runner, targeting bare-metal deployment to a Proxmox LXC container hosting PM2, Nginx, and PostgreSQL.

## Scope
### In Scope
- **CI Workflow (`.github/workflows/ci.yml`)**: Consolidated monorepo verification (`lint:check`, `typecheck`, `test`, `build`) on pull requests and pushes.
- **CD Workflow (`.github/workflows/cd.yml`)**: Automated deployment via SSH to the Proxmox LXC container triggered on `main` branch pushes.
- **Rollback Workflow (`.github/workflows/rollback.yml`)**: Manual dispatch rollback to a specific commit or previous release tag.
- **Deployment Scripts (`scripts/`)**:
  - `scripts/deploy.sh`: Pre-migration `pg_dump` snapshot, dependency install, build, TypeORM migration, PM2 reload, and health check.
  - `scripts/rollback.sh`: Git checkout to target ref, database snapshot restoration if required, rebuild, and PM2 reload.
  - `scripts/health-check.sh`: Automated verification of backend `/api` and frontend HTTP endpoints.
- **Package Scripts**: Add non-mutating `lint:check` to `apps/backend/package.json` and root convenience scripts (`lint`, `test`, `typecheck`).

### Out of Scope
- Docker containerization or Kubernetes orchestration (retaining bare-metal PM2 + Nginx on LXC).
- External cloud runners or commercial SaaS CI platforms.

## Capabilities
### New Capabilities
- `cicd-pipeline`: Automated build/test pipeline, SSH-based deployment to self-hosted Proxmox infrastructure, automated pre-deploy DB backups, and deterministic rollback workflows.

### Modified Capabilities
- None.

## Approach
1. **Runner Execution**: Leverage a dedicated self-hosted GitHub Actions runner with network access or secure SSH connectivity to the Proxmox LXC target.
2. **Safe Migration Pattern**: Generate timestamped PostgreSQL dumps (`pg_dump`) prior to running `migration:run`. If migration or health verification fails, trigger automatic rollback.
3. **Zero-Downtime Reload**: Use PM2 cluster mode reload (`pm2 reload ecosystem.config.js`) and Nginx static asset routing.
4. **Convenience Tooling**: Align monorepo script entrypoints across backend and frontend workspaces for unified CI invocations.

## Affected Areas
- `.github/workflows/ci.yml` (new)
- `.github/workflows/cd.yml` (new)
- `.github/workflows/rollback.yml` (new)
- `scripts/deploy.sh` (new)
- `scripts/rollback.sh` (new)
- `scripts/health-check.sh` (new)
- `package.json` (modified)
- `apps/backend/package.json` (modified)

## Risks
- **Runner Availability**: Self-hosted runner downtime blocks builds and deploys.
  *Mitigation*: Retain manual shell runbooks and health monitoring on the runner host.
- **Migration Incompatibility**: Destructive schema migrations may complicate rollbacks.
  *Mitigation*: Mandatory pre-migration `pg_dump` and automated restoration in `scripts/rollback.sh`.

## Rollback Plan
1. **Automated Rollback**: `scripts/deploy.sh` traps errors, restores the pre-migration database snapshot, and restarts PM2 with the prior build.
2. **Manual Rollback**: Trigger `.github/workflows/rollback.yml` with target commit SHA/tag.

## Dependencies
- Pre-configured GitHub self-hosted runner and repository secrets (`SSH_HOST`, `SSH_USER`, `SSH_KEY`, etc.).
- Proxmox LXC with Node.js, pnpm, PM2, PostgreSQL client, and Nginx.

## Success Criteria
- [ ] CI pipeline validates linting, types, unit tests, and build artifacts.
- [ ] CD pipeline executes automated deployment and health check on `main`.
- [ ] Rollback pipeline successfully restores previous commit and database state.
