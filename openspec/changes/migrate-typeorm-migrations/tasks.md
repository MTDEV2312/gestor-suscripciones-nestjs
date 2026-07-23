# Tasks: Migrate TypeORM Migrations

## Review Workload Forecast
| Field | Value |
|-------|-------|
| Estimated changed lines | 100-200 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units
| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Implement Dynamic DataSource, CLI scripts, and initial migration | Single PR | pnpm test:e2e | Local NestJS / SQLite | Git revert |

## Phase 1: Environment Variables & Dependencies
- [x] 1.1 Add `pg` to dependency list in [package.json](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/package.json).
- [x] 1.2 Define database configuration variables in [.env](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/.env).
- [x] 1.3 Create [.env.example](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/.env.example) file with database config placeholders.

## Phase 2: DataSource Configuration
- [x] 2.1 Create [data-source.ts](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/src/database/data-source.ts) exporting `dataSourceOptions` with dynamic SQLite/PostgreSQL support.
- [x] 2.2 Verify `dataSourceOptions` falls back to SQLite configuration with default path when env variables are empty.

## Phase 3: NestJS Integration
- [x] 3.1 Modify [app.module.ts](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/src/app.module.ts) to import and use `dataSourceOptions`.
- [x] 3.2 Disable schema synchronization (`synchronize: false`) and enable automatic migrations (`migrationsRun: true`) in [app.module.ts](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/src/app.module.ts).

## Phase 4: package.json CLI Scripts
- [x] 4.1 Add scripts for `typeorm`, `migration:generate`, `migration:run`, and `migration:revert` to [package.json](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/package.json).

## Phase 5: Initial Migration Generation & Verification
- [x] 5.1 Generate initial schema migration in `apps/backend/src/database/migrations` directory using TypeORM CLI.
- [x] 5.2 Validate migrations run successfully against a new SQLite database using `pnpm run migration:run`.
- [x] 5.3 Run system E2E tests via `pnpm test:e2e` to verify full integration and functionality.
