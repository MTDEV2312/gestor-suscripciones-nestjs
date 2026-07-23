# Design: Fase 6 - Dominios y Hosting

## Technical Approach
Add a `type` field to the `Subscription` entity in the SQLite database via TypeORM to support classifying subscriptions as 'SUBSCRIPTION', 'DOMAIN', or 'HOSTING'. Propagate this field to the backend DTO validation layer, frontend API service, and Dashboard UI, enabling users to select and filter/display the service type. Default existing and new undefined records to 'SUBSCRIPTION' for full backward compatibility.

## Architecture Decisions
### Decision: Database Schema Migration & Default Value
| Option | Tradeoffs | Decision |
|---|---|---|
| Use automatic synchronization (`synchronize: true`) with default `'SUBSCRIPTION'` value | Easy local development; no migration files needed. | **Chosen**. Fits the project's existing configuration of TypeORM `synchronize: true` for SQLite. |
| Write raw SQL/TypeORM migration file | More explicit schema management, but adds complexity. | **Rejected**. Not required given existing dev environment settings. |

### Decision: API Validation Strategy
| Option | Tradeoffs | Decision |
|---|---|---|
| Optional `type` field in DTOs validating enum | Allows client flexibility and supports backwards compatibility without breaking old client requests. | **Chosen**. Provides clean validation with `@IsOptional()`, `@IsString()`, `@Matches(...)`. |
| Required `type` field in DTOs | Enforces strict validation, but breaks any client not yet sending `type`. | **Rejected**. Fails backwards-compatibility requirement. |

## Data Flow
```
[Frontend Form (Dashboard)] 
      │ 
      ▼ (type: 'SUBSCRIPTION' | 'DOMAIN' | 'HOSTING')
[API Service (api.ts)]
      │
      ▼ (HTTP POST/PATCH /api/subscriptions)
[Subscriptions Controller]
      │
      ▼ (CreateSubscriptionDto validation)
[Subscriptions Service]
      │
      ▼ (TypeORM Save)
[SQLite Database (Subscription Table)]
```

## File Changes
| File | Action | Description |
|------|--------|-------------|
| `apps/backend/src/subscriptions/entities/subscription.entity.ts` | Edit | Add `@Column` for `type` field with simple-enum, default value `'SUBSCRIPTION'`, and `nullable: false`. |
| `apps/backend/src/subscriptions/dto/create-subscription.dto.ts` | Edit | Add `@IsOptional()`, `@IsString()`, and `@Matches()` validation rules for the `type` field. |
| `apps/backend/src/subscriptions/subscriptions.service.spec.ts` | Edit | Add `type: 'SUBSCRIPTION'` to `mockSubscription` definition to pass TypeScript checks. |
| `apps/frontend/src/services/api.ts` | Edit | Add `type` to `Subscription` interface (`type: 'SUBSCRIPTION' | 'DOMAIN' | 'HOSTING'`). |
| `apps/frontend/src/pages/Dashboard.tsx` | Edit | Add UI select field in modal form, add local state for `formType`, submit `type` inside the save payload, and render a type badge column in the subscription table. |

## Interfaces / Contracts
### Subscription Type definition
```typescript
// Backend (Entity/Types) & Frontend (api.ts)
type SubscriptionType = 'SUBSCRIPTION' | 'DOMAIN' | 'HOSTING';
```

## Testing Strategy
| Layer | What to Test | Approach |
|---|---|---|
| Backend DTO Validation | Create and update validation for valid enum values | Run unit tests for controller/service, write DTO unit test if needed. |
| Database Entity | Default value configuration | Verify `type` defaults to `'SUBSCRIPTION'` for existing database entries. |
| Frontend UI | Type selection and table rendering | Manual verification of modal dropdown selections and table badge styles. |

## Threat Matrix
Not applicable. No changes to network routing, shell commands, subprocesses, VCS/PR automation, executable-file classification, or process integration.

## Migration / Rollout
Since TypeORM is configured with `synchronize: true`, SQLite will automatically add the new column `type` with a default value of `'SUBSCRIPTION'`. All existing records will automatically acquire this value on backend boot.

## Open Questions
- [ ] None.
