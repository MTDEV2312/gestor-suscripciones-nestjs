# Tasks: Fase 7 — Características Avanzadas

## Review Workload Forecast
| Field | Value |
|-------|-------|
| Estimated changed lines | 450-600 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (History & Recalc) -> PR 2 (Currency & Fallback) -> PR 3 (Tags) -> PR 4 (Cron & Frontend) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units
| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| Unit 1 | Subscription History & Recalculation | PR 1 | `npm run test -- subscription-history` | Jest / Test DB | Revert PR 1 migration and code |
| Unit 2 | Currency Conversion API & Fallback | PR 2 | `npm run test -- currency` | Jest / Test DB | Revert PR 2 migration and code |
| Unit 3 | Custom Tags & 50 Limit Validation | PR 3 | `npm run test -- tags` | Jest / Test DB | Revert PR 3 migration and code |
| Unit 4 | Telegram Cron Alerts & Frontend Integration | PR 4 | `npm run test -- cron-job` | Jest / Cypress | Revert PR 4 changes |

## Phase 1: Subscription History & Recalculation
- [x] 1.1 RED: Test history logging & renewal date recalculation on price/frequency change in `apps/backend/src/subscriptions/subscriptions.service.spec.ts`
- [x] 1.2 Create `subscription_history` table migration in `apps/backend/src/database/migrations/1784838482192-AddSubscriptionHistory.ts`
- [x] 1.3 Create `SubscriptionHistory` entity in `apps/backend/src/subscription-history/entities/subscription-history.entity.ts`
- [x] 1.4 Create `SubscriptionHistoryService` and `SubscriptionHistoryModule` in `apps/backend/src/subscription-history/subscription-history.service.ts` and `apps/backend/src/subscription-history/subscription-history.module.ts`
- [x] 1.5 Create `SubscriptionHistoryController` for `GET /subscriptions/:id/history` in `apps/backend/src/subscription-history/subscription-history.controller.ts`
- [x] 1.6 Update `Subscription` entity in `apps/backend/src/subscriptions/entities/subscription.entity.ts` and `SubscriptionsService` in `apps/backend/src/subscriptions/subscriptions.service.ts` to log changes and recalculate renewal dates


## Phase 2: Exchange Rate API & Admin Fallback
- [x] 2.1 RED: Test API 500/timeout fallback & key security in `apps/backend/src/currency/currency.service.spec.ts`
- [x] 2.2 Create `exchange_rate_fallback` table migration in `apps/backend/src/database/migrations/1784838482193-AddExchangeRateFallback.ts`
- [x] 2.3 Create `ExchangeRateFallback` entity in `apps/backend/src/currency/entities/exchange-rate-fallback.entity.ts`
- [x] 2.4 Create `CurrencyService` and `CurrencyModule` handling Exchange Rate API and DB fallback in `apps/backend/src/currency/currency.service.ts` and `apps/backend/src/currency/currency.module.ts`
- [x] 2.5 Create `CurrencyController` for `GET/PUT /admin/exchange-rates` in `apps/backend/src/currency/currency.controller.ts`
- [x] 2.6 Integrate `CurrencyService` with `DashboardService` in `apps/backend/src/dashboard/dashboard.service.ts`

## Phase 3: Custom Tags & 50 Limit Validation
- [x] 3.1 RED: Test 50 custom tag limit enforcement returning Bad Request on 51st tag in `apps/backend/src/tags/tags.service.spec.ts`
- [x] 3.2 Create `tag` and `subscription_tags` migration in `apps/backend/src/database/migrations/1784838482194-AddTagsAndSubscriptionTags.ts`
- [x] 3.3 Create `Tag` entity in `apps/backend/src/tags/entities/tag.entity.ts` and update `Subscription` entity in `apps/backend/src/subscriptions/entities/subscription.entity.ts`
- [x] 3.4 Create `CreateTagDto` in `apps/backend/src/tags/dto/create-tag.dto.ts`
- [x] 3.5 Create `TagsService` and `TagsModule` enforcing 50 limit in `apps/backend/src/tags/tags.service.ts` and `apps/backend/src/tags/tags.module.ts`
- [x] 3.6 Create `TagsController` in `apps/backend/src/tags/tags.controller.ts`

## Phase 4: Cron Job & Telegram 7d/3d/1d Notifications
- [x] 4.1 RED: Test target date calculations (+7d, +3d, +1d) across DST and month boundaries in `apps/backend/src/cron-job/cron-job.scheduler.spec.ts`
- [x] 4.2 Update `CronJobScheduler` in `apps/backend/src/cron-job/cron-job.scheduler.ts` for 7d/3d/1d Telegram notification logic

## Phase 5: Frontend Integration
- [x] 5.1 Update interfaces for history, exchange rates, and tags in `apps/frontend/src/services/api.ts`
- [x] 5.2 Add tag filter, currency selector, and price history chart to `apps/frontend/src/pages/Dashboard.tsx`

## Phase 6: Verification & Testing
- [x] 6.1 Execute unit and integration tests across backend modules (`npm run test`)
- [x] 6.2 Execute end-to-end tests (`npm run test:e2e`)
