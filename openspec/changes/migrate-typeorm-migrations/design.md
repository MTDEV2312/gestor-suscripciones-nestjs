# Design: migrate-typeorm-migrations

## Technical Approach
Refactor the database integration from automatic schema synchronization (`synchronize: true`) to a robust TypeORM migrations flow. We will introduce a dynamic `DataSource` configuration that supports both SQLite (existing setup) and PostgreSQL (for future deployment) based on `.env` variables. TypeORM migrations will run automatically on application startup to ensure schema consistency, and CLI scripts will be added to enable developers to create, generate, and run migrations.

## Architecture Decisions
### Decision: Schema Synchronization Mode
| Option | Tradeoffs | Decision |
|---|---|---|
| Use `synchronize: true` | Convenient in early development but dangerous for production as it can drop or modify tables causing data loss. | **Rejected**. |
| Adopt TypeORM Migrations with `synchronize: false` | Professional, trackable, and safe schema evolution through versioned migration files. | **Chosen**. Required for production safety. |

### Decision: Database Support in DataSource Configuration
| Option | Tradeoffs | Decision |
|---|---|---|
| Hardcode SQLite configuration | Simple, but does not prepare the application for PostgreSQL migration. | **Rejected**. |
| Dynamic SQLite/PostgreSQL configuration | Allows SQLite for local development and PostgreSQL for production environments via environment variables. | **Chosen**. Provides maximum flexibility. |

### Decision: Automatic Migrations Executions (`migrationsRun`)
| Option | Tradeoffs | Decision |
|---|---|---|
| Run migrations only via CLI | Requires manual commands or CI/CD pipelines to run migrations during deployments. | **Rejected**. |
| Set `migrationsRun: true` in NestJS TypeOrmModule | Automatically applies pending database migrations on application boot. | **Chosen**. Recommended for containerized and serverless environments. |

## Data Flow
```
[TypeORM CLI / NestJS Boot]
             │
             ├── Loads apps/backend/.env (via dotenv)
             ▼
    [data-source.ts]
             │ (Resolves DataSourceOptions)
             ▼
  ┌─────────────────────────────────────┐
  │ DB_TYPE == 'postgres' ?             │
  │   - Connects to PostgreSQL          │
  │ :                                   │
  │   - Connects to SQLite File         │
  └─────────────────────────────────────┘
             │
             ├── Compares Entities (User, Subscription) with Database Schema
             ▼
    [TypeORM Migrations Engine] (Runs pending migrations / Generates new ones)
```

## File Changes
| File | Action | Description |
|------|--------|-------------|
| `apps/backend/src/database/data-source.ts` | Create | Define and export `dataSourceOptions` and default `new DataSource`. Dynamically switches driver options between `better-sqlite3` and `postgres` based on environment variables. |
| `apps/backend/src/app.module.ts` | Edit | Import `dataSourceOptions` from `data-source.ts` and pass them to `TypeOrmModule.forRoot()`. Configure `autoLoadEntities: true` and `migrationsRun: true`. |
| `apps/backend/package.json` | Edit | Add CLI scripts for `typeorm`, `migration:create`, `migration:generate`, `migration:run`, and `migration:revert` using `typeorm-ts-node-commonjs`. |
| `apps/backend/.env` | Edit | Document new default environment variables for database configurations (`DB_TYPE`, `DB_DATABASE`, etc.). |

## Interfaces / Contracts
### DataSource Environment Configuration
```typescript
interface DatabaseEnvConfig {
  DB_TYPE?: 'better-sqlite3' | 'postgres';
  DB_DATABASE?: string; // sqlite path or postgres db name
  DB_HOST?: string;
  DB_PORT?: string;
  DB_USERNAME?: string;
  DB_PASSWORD?: string;
  DB_LOGGING?: 'true' | 'false';
  DB_MIGRATIONS_RUN?: 'true' | 'false';
}
```

## Testing Strategy
| Layer | What to Test | Approach |
|---|---|---|
| Configuration | Environment fallback | Verify `dataSourceOptions` defaults to SQLite (`better-sqlite3`, `database.sqlite`) if no environment variables are defined. |
| CLI / Run | Migration execution | Run `pnpm migration:run` in a fresh SQLite instance and verify the tables `user` and `subscription` are created. |
| E2E | System integration | Run standard system e2e tests (`pnpm test:e2e`) to ensure database queries work seamlessly with `synchronize: false`. |

## Threat Matrix
Not applicable. No changes to network routing, shell commands, subprocesses, VCS/PR automation, executable-file classification, or process integration.

## Migration / Rollout
1. **Initial Migration Generation**: 
   Rename the existing `database.sqlite` database file to start fresh. Run `pnpm run migration:generate src/database/migrations/InitialSchema` to create the initial table layouts.
2. **Existing Environment Setup**:
   For environments with pre-existing tables, mark the initial migration as executed by running an insert to the metadata table:
   ```sql
   INSERT INTO migrations (timestamp, name) VALUES (<timestamp>, '<InitialSchemaMigrationClassName>');
   ```
3. **Application Boot**:
   Upon deployment, NestJS will automatically check for and run any pending migrations on startup.

## Open Questions
- [ ] Do we need to package the PostgreSQL driver (`pg`) in `dependencies` now, or should we wait until we switch the target environment to production? We recommend adding it now to ensure driver compatibility.
