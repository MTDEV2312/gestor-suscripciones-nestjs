# Tasks: CI/CD Pipeline with Self-Hosted Runner

## Review Workload Forecast
| Field | Value |
|-------|-------|
| Estimated changed lines | 250-350 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units
| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Package scripts, operational bash scripts, and GitHub Actions workflows | Single PR | `pnpm --filter backend lint:check` & `bash -n scripts/*.sh` | Self-hosted runner / LXC 112 | Git revert |

## Phase 1: Package & Workspace Scripts
- [x] 1.1 Add non-mutating `lint:check` script (`eslint "{src,apps,libs,test}/**/*.ts"`) to `apps/backend/package.json`.
- [x] 1.2 Add monorepo helper scripts (`lint:check`, `typecheck`) to root `package.json`.

## Phase 2: Deployment & Operational Scripts
- [x] 2.1 Create `scripts/health-check.sh` with retry loops and backoff validating backend `/health` and frontend endpoints.
- [x] 2.2 Create `scripts/deploy.sh` with pre-deploy git pull, timestamped `pg_dump` backup, `pnpm install --prod`, TypeORM `migration:run` with auto-restore on failure, PM2 cluster reload, Nginx reload, and health check.
- [x] 2.3 Create `scripts/rollback.sh` supporting commit ref argument, input sanitization, target ref checkout, build, PM2 reload, Nginx reload, and post-rollback health check.

## Phase 3: GitHub Actions Workflows
- [x] 3.1 Create `.github/workflows/ci.yml` for pull requests and pushes to `main`, running consolidated checkout, install, lint:check, typecheck, tests, and build on `self-hosted`.
- [x] 3.2 Create `.github/workflows/cd.yml` running on `main` push with deployment concurrency, SSH key setup with trap cleanup, and remote invocation of `scripts/deploy.sh`.
- [x] 3.3 Create `.github/workflows/rollback.yml` with `workflow_dispatch` commit/tag input, SSH execution of `scripts/rollback.sh`, and post-rollback verification.

## Phase 4: Local Verification & Lint
- [x] 4.1 Validate syntax of all shell scripts using `bash -n scripts/*.sh`.
- [x] 4.2 Validate backend non-mutating lint check using `pnpm --filter backend lint:check`.
- [x] 4.3 Validate YAML structure and syntax of all GitHub Actions workflow files.
