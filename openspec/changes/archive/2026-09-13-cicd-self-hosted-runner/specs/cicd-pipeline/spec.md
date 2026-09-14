# Specification: CI/CD Pipeline (`cicd-pipeline`)

## Purpose
Define automated monorepo CI validation, zero-downtime deployment to self-hosted Proxmox LXC infrastructure, pre-migration database snapshotting, post-deployment health verification, and deterministic rollback workflows.

## Requirements

### Requirement 1: Consolidated Monorepo CI Validation
The CI pipeline **MUST** execute clean checkout, non-mutating lint check (`lint:check`), static TypeScript typecheck, automated tests, and production builds across backend and frontend workspaces. The workflow **MUST** fail if any verification step returns non-zero.

#### Scenario 1.1: Successful CI validation
- **Given** a pull request or branch push with valid code and passing tests
- **When** the CI workflow triggers
- **Then** the workflow **MUST** run lint, typecheck, tests, and builds, completing with success.

#### Scenario 1.2: Failure on lint or type error
- **Given** code containing TypeScript compiler or ESLint violations
- **When** the CI workflow executes
- **Then** the failing check **MUST** fail the job and block deployment.

### Requirement 2: Production Continuous Deployment via Self-Hosted Runner
The CD pipeline **MUST** run automatically on `main` push via a dedicated self-hosted runner. It **MUST** enforce deployment concurrency to prevent race conditions, establish SSH access to the Proxmox LXC host, install production dependencies, execute zero-downtime PM2 reload (`pm2 reload`), and serve frontend assets via Nginx.

#### Scenario 2.1: Automated production deployment
- **Given** changes merged into `main`
- **When** the CD workflow runs on the self-hosted runner
- **Then** it **MUST** acquire the concurrency lock, run `scripts/deploy.sh` over SSH, and reload PM2 with zero downtime.

#### Scenario 2.2: Concurrency protection
- **Given** an active deployment in progress
- **When** another push occurs on `main`
- **Then** the pipeline **MUST** queue or cancel overlapping runs, preventing concurrent deployments.

### Requirement 3: Automated Pre-Migration Backup
Before running database schema migrations (`migration:run`), `scripts/deploy.sh` **MUST** generate a timestamped PostgreSQL backup with `pg_dump`. If migration fails, the deployment script **MUST** catch the failure, restore the snapshot, and terminate deployment.

#### Scenario 3.1: Pre-migration snapshot creation
- **Given** pending TypeORM migrations
- **When** the deployment script starts the migration phase
- **Then** it **MUST** generate a verified `pg_dump` snapshot before executing migrations.

#### Scenario 3.2: Automated rollback on migration error
- **Given** a faulty migration returning non-zero
- **When** migration execution fails
- **Then** the deployment trap **MUST** restore the pre-migration snapshot and exit with an error.

### Requirement 4: Automated and Manual Rollback Operations
The system **MUST** provide automated rollback upon fatal deployment failure and a manual `workflow_dispatch` GitHub Actions workflow. `scripts/rollback.sh` **MUST** checkout the specified commit or tag, reinstall dependencies, rebuild artifacts, optionally restore database snapshots, and reload PM2.

#### Scenario 4.1: Manual rollback via workflow dispatch
- **Given** an operator selecting a previous stable commit ref
- **When** the operator triggers the rollback workflow
- **Then** the workflow **MUST** checkout the target ref, rebuild, reload PM2, and verify service health.

#### Scenario 4.2: Automated rollback on deployment failure
- **Given** a fatal error during deployment after checkout
- **When** the error trap fires in `scripts/deploy.sh`
- **Then** the script **MUST** revert to the prior working commit and reload PM2.

### Requirement 5: Health Check Verification
Following PM2 reload, the pipeline **MUST** probe backend (`/api` or `/health`) and frontend endpoints. Probes **SHOULD** retry up to 5 times with backoff. If endpoints fail to return HTTP 200 within the timeout window, the pipeline **MUST** trigger rollback and mark deployment failed.

#### Scenario 5.1: Health check success
- **Given** healthy reloaded services
- **When** `scripts/health-check.sh` queries the endpoints
- **Then** all checks **MUST** return HTTP 200 and report deployment success.

#### Scenario 5.2: Health check failure triggers rollback
- **Given** a service returning HTTP 500 or failing to respond
- **When** retries are exhausted
- **Then** the health check **MUST** fail and trigger rollback.
