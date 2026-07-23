# Tasks: Fase 6 - Dominios y Hosting

## Review Workload Forecast
| Field | Value |
|-------|-------|
| Estimated changed lines | 150-250 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units
| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Backend updates and tests | PR 1 | npm run test:backend | Local NestJS backend | Revert schema column / git checkout |
| 2 | Frontend service and dashboard updates | PR 1 | npm run test:frontend | Local Vite frontend | git checkout |

## Phase 1: Backend DTOs & Entities
- [x] 1.1 Add Simple-Enum `type` to [subscription.entity.ts](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/src/subscriptions/entities/subscription.entity.ts) defaulting to 'SUBSCRIPTION'.
- [x] 1.2 Add `type` validation using `@IsOptional()`, `@IsString()`, `@Matches()` to [create-subscription.dto.ts](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/src/subscriptions/dto/create-subscription.dto.ts).
- [x] 1.3 Add `type` field to [update-subscription.dto.ts](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/src/subscriptions/dto/update-subscription.dto.ts) with similar validation constraints.

## Phase 2: Frontend API / Dashboard Types
- [x] 2.1 Update type definition in [api.ts](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/frontend/src/services/api.ts) to include type: `'SUBSCRIPTION' | 'DOMAIN' | 'HOSTING'`.

## Phase 3: Dashboard UI Components & Badging
- [x] 3.1 Introduce service type dropdown in form modal in [Dashboard.tsx](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/frontend/src/pages/Dashboard.tsx).
- [x] 3.2 Display type badge within the subscription table in [Dashboard.tsx](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/frontend/src/pages/Dashboard.tsx).

## Phase 4: Verification & Testing
- [x] 4.1 Update mock data definition inside [subscriptions.service.spec.ts](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/src/subscriptions/subscriptions.service.spec.ts).
- [x] 4.2 Write backend unit tests verifying default subscription type fallback behavior in [subscriptions.service.spec.ts](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/src/subscriptions/subscriptions.service.spec.ts).
- [x] 4.3 Manually verify frontend form submissions and badge render status inside dashboard interface.
