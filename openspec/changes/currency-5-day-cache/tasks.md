# Tasks: currency-5-day-cache

## Review Workload Forecast
| Field | Value |
|-------|-------|
| Estimated changed lines | 60-120 lines |
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
| 1 | Implement 5-day exchange rate caching & DB fallback | PR 1 | `npm run test -- apps/backend/src/currency/currency.service.spec.ts` | Jest / NestJS Test Module | Git revert PR 1 |

## Phase 1: Entity Update
- [x] 1.1 Add nullable `last_fetched_at` column to `ExchangeRateFallback` in [exchange-rate-fallback.entity.ts](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/src/currency/entities/exchange-rate-fallback.entity.ts).

## Phase 2: Core Implementation
- [x] 2.1 Update `cacheTtlMs` to 5 days (`432_000_000` ms) in [currency.service.ts](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/src/currency/currency.service.ts).
- [x] 2.2 Implement DB fallback check during `convert()` in [currency.service.ts](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/src/currency/currency.service.ts) to hydrate cache from DB if `last_fetched_at` is within 5 days.
- [x] 2.3 Update API fetch handler in [currency.service.ts](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/src/currency/currency.service.ts) to persist rates and `last_fetched_at` timestamp into DB upon successful fetch.
- [x] 2.4 Add fallback handling in [currency.service.ts](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/src/currency/currency.service.ts) to retain existing DB rates if external API call fails or times out.

## Phase 3: Verification & Unit Tests
- [x] 3.1 Add unit tests in [currency.service.spec.ts](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/src/currency/currency.service.spec.ts) verifying memory cache hits within 5-day TTL skip API calls.
- [x] 3.2 Add unit tests in [currency.service.spec.ts](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/src/currency/currency.service.spec.ts) verifying empty cache hydrates from DB when `last_fetched_at` is under 5 days.
- [x] 3.3 Add unit tests in [currency.service.spec.ts](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/src/currency/currency.service.spec.ts) verifying API refresh and DB update when rates are older than 5 days.
- [x] 3.4 Add unit tests in [currency.service.spec.ts](file:///C:/Users/agusm/Videos/gestor_suscripciones_nest-js/apps/backend/src/currency/currency.service.spec.ts) verifying API failure retains DB fallback rates.
