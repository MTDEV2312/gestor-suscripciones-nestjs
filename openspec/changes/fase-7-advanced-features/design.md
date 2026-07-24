# Design: Fase 7 — Características Avanzadas

## Technical Approach

Add four features (Subscription History, Currency Conversion & Exchange Rate API, Telegram Reminders, Custom Tags) as independent NestJS modules with TypeORM migrations:

1. **Currency Conversion**: External Exchange Rate API (`https://v6.exchangerate-api.com/v6/${EXCHANGERATE_API_KEY}/latest/USD`) with `EXCHANGERATE_API_KEY` env variable. Fallback to Admin-configured manual exchange rates stored in DB if the API fails or is unavailable.
2. **Subscription History**: Track changes to BOTH price and billing frequency (e.g., `MONTHLY` <-> `YEARLY`). Frequency changes automatically trigger recalculation of `next_renewal_date` and update notification scheduling.
3. **Telegram Notification Cron**: Daily cron checks subscriptions matching specific threshold windows:
   - **7 days before** (`next_renewal_date = CURRENT_DATE + 7`): Preventive warning notification.
   - **3 days before** (`next_renewal_date = CURRENT_DATE + 3`): Preventive warning notification.
   - **1 day before** (`next_renewal_date = CURRENT_DATE + 1`): Imminent charge warning (tomorrow).
4. **Custom Tags**: Dedicated `Tag` entity (M:N with subscriptions). Enforce maximum limit of 50 custom tags per user via backend DTO and Service validation.

## Architecture Decisions

| Decision | Option Selected | Tradeoffs / Alternatives | Rationale |
|----------|-----------------|--------------------------|-----------|
| Subscription History | Auto-record on `Subscription.update()` for price OR frequency changes | Manual history logging endpoint | Zero friction; captures complete history of cost and billing cycle changes over time. |
| Currency Conversion | Exchange Rate API + Admin Manual Fallback | Static hardcoded rates OR User-defined rates | Real-time rate accuracy via Exchange Rate API with resilience during outages through Admin-managed fallback rates. |
| Notification Windows | Explicit 7d, 3d, 1d renewal checks in daily Cron | Per-subscription configurable integer days | Clear, predictable escalation warnings (7d/3d preventive, 1d imminent charge) aligned with Telegram notification scheduler. |
| Custom Tags Limit | Hard limit of 50 custom tags per user (DTO + Service validation) | Unlimited tags OR soft warning | Protects DB against spam while giving ample flexibility for user organization. |

## Data Flow

```
Subscription PATCH (price or frequency change)
  → SubscriptionsService.update()
    → Detect price !== old_price OR frequency !== old_frequency
    → SubscriptionHistoryService.record(sub_id, old_price, new_price, old_freq, new_freq, effective_date)
    → If frequency changed: recalculate sub.next_renewal_date

Cron '0 8 * * *' (checkRenewals)
  → RenewalScheduler.checkRenewals()
    → Query subs where next_renewal_date == CURRENT_DATE + 7 → send 7-day preventive Telegram alert
    → Query subs where next_renewal_date == CURRENT_DATE + 3 → send 3-day preventive Telegram alert
    → Query subs where next_renewal_date == CURRENT_DATE + 1 → send 1-day imminent charge Telegram alert

Dashboard GET /dashboard
  → DashboardService.dashboard()
    → CurrencyService.getRates() tries Exchange Rate API (using EXCHANGERATE_API_KEY)
    → On API failure/timeout → fallback to Admin-configured ExchangeRate DB records
    → Convert spending totals to user.preferred_currency

POST /tags
  → TagsService.create()
    → Check count(Tag where user_id = current_user) >= 50 → throw BadRequestException(50 limit)
    → Save new Tag
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/backend/src/subscription-history/entities/subscription-history.entity.ts` | **Create** | Entity: `id`, `subscription_id` (FK), `old_price`, `new_price`, `old_frequency`, `new_frequency`, `currency`, `effective_date`, `created_at` |
| `apps/backend/src/subscription-history/subscription-history.module.ts` | **Create** | Module importing TypeOrmModule for `SubscriptionHistory` |
| `apps/backend/src/subscription-history/subscription-history.service.ts` | **Create** | `recordChange()`, `findBySubscription(subId)` |
| `apps/backend/src/subscription-history/subscription-history.controller.ts` | **Create** | `GET /subscriptions/:id/history` |
| `apps/backend/src/currency/entities/exchange-rate-fallback.entity.ts` | **Create** | Entity for Admin manual rates: `from_currency`, `to_currency`, `rate`, `updated_at` |
| `apps/backend/src/currency/currency.service.ts` | **Create** | API client for Exchange Rate API (`EXCHANGERATE_API_KEY`), Admin manual fallback handler, `convert()` |
| `apps/backend/src/currency/currency.controller.ts` | **Create** | `GET/PUT /admin/exchange-rates` (Admin-only manual rate configuration) |
| `apps/backend/src/tags/entities/tag.entity.ts` | **Create** | Entity: `id`, `name` (varchar 50), `user_id` (FK), `color` (varchar 7) |
| `apps/backend/src/tags/tags.service.ts` | **Create** | Tag CRUD + 50 tags limit enforcement per user + default seed tags |
| `apps/backend/src/tags/dto/create-tag.dto.ts` | **Create** | Validation DTO for tag name & color |
| `apps/backend/src/subscriptions/entities/subscription.entity.ts` | **Modify** | Add `@OneToMany` to `SubscriptionHistory`, `@ManyToMany` to `Tag` |
| `apps/backend/src/subscriptions/subscriptions.service.ts` | **Modify** | Inject `SubscriptionHistoryService`; detect price/frequency change, trigger history record & renewal date recalculation |
| `apps/backend/src/cron-job/cron-job.scheduler.ts` | **Modify** | Implement 7d (`CURRENT_DATE + 7`), 3d (`CURRENT_DATE + 3`), and 1d (`CURRENT_DATE + 1`) Telegram warning logic |
| `apps/backend/src/dashboard/dashboard.service.ts` | **Modify** | Use `CurrencyService` to convert amounts to `preferred_currency` |
| `apps/backend/src/database/migrations/XXXX-AddSubscriptionHistory.ts` | **Create** | Migration: `subscription_history` table (price + frequency) |
| `apps/backend/src/database/migrations/XXXX-AddExchangeRateFallback.ts` | **Create** | Migration: `exchange_rate_fallback` table |
| `apps/backend/src/database/migrations/XXXX-AddTags.ts` | **Create** | Migration: `tag` table + `subscription_tags` join table |
| `apps/frontend/src/services/api.ts` | **Modify** | Update TypeScript interfaces for history, exchange rates, and tags |
| `apps/frontend/src/pages/Dashboard.tsx` | **Modify** | Tag filter UI, currency selector, subscription history view |

## Interfaces / Contracts

```typescript
// SubscriptionHistory Entity Interface
interface SubscriptionHistory {
  id: string;
  subscription_id: string;
  old_price?: number;
  new_price: number;
  old_frequency?: 'MONTHLY' | 'YEARLY' | 'WEEKLY' | 'QUARTERLY';
  new_frequency: 'MONTHLY' | 'YEARLY' | 'WEEKLY' | 'QUARTERLY';
  currency: string;
  effective_date: string;
  created_at: Date;
}

// Exchange Rate Fallback Interface (Admin Managed)
interface ExchangeRateFallback {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: Date;
}

// Custom Tag Limit Constraint
const MAX_CUSTOM_TAGS_PER_USER = 50;

// Telegram Cron Window Rules
// Day 7: CURRENT_DATE + 7 -> Preventive alert
// Day 3: CURRENT_DATE + 3 -> Preventive alert
// Day 1: CURRENT_DATE + 1 -> Imminent charge alert
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `CurrencyService.convert()` with API response & Admin fallback on network error | Jest test with HTTP mock & fallback DB mock |
| Unit | `TagsService.create()` throws `BadRequestException` on 51st tag | Jest test checking user tag count boundary |
| Unit | `SubscriptionHistoryService` records both price and frequency changes | Jest unit test for history creation logic |
| Integration | Subscriptions update recalculates `next_renewal_date` when frequency changes | Integration test with real test DB |
| Integration | RenewalScheduler triggers Telegram alerts for +7d, +3d, and +1d targets | Mock system clock date & verify query matches exact dates |

## Threat Matrix

| Threat Boundary | Status | Planned RED Test / Safeguard |
|-----------------|--------|------------------------------|
| External API Failure / Timeout (`exchangerate-api.com`) | Applicable | Mock HTTP 500 / timeout in `CurrencyService`. Verify system falls back seamlessly to Admin manual exchange rates without crashing. |
| API Key Exposure (`EXCHANGERATE_API_KEY`) | Applicable | Verify `EXCHANGERATE_API_KEY` is loaded strictly via `ConfigService` / `process.env` and never logged or sent to client responses. |
| Tag Over-allocation / DB Spam | Applicable | Attempt posting 51 tags for single user. RED test verifies HTTP 400 Bad Request error. |
| Cron Timezone / Date Miscalculation | Applicable | Test cron target date calculation (`CURRENT_DATE + 7/3/1`) across DST / month boundary dates. |

## Migration / Rollout

1. **Environment Setup**: Add `EXCHANGERATE_API_KEY` to backend `.env`.
2. **Migrations**:
   - `AddSubscriptionHistory`: Creates `subscription_history` table supporting price and frequency changes.
   - `AddExchangeRateFallback`: Creates `exchange_rate_fallback` table for admin manual rates fallback.
   - `AddTags`: Creates `tag` table with foreign key `user_id` and `subscription_tags` M:N join table.
3. **Admin Fallback Seed**: Seed default fallback exchange rates for common currencies (USD, EUR, MXN, ARS).
4. **Cron Job Deployment**: Update scheduler to query 7d, 3d, and 1d renewal targets.

## Open Questions

All open questions for Fase 7 have been resolved:
- [x] **Currency rates**: Uses Exchange Rate API (`https://v6.exchangerate-api.com/v6/${EXCHANGERATE_API_KEY}/latest/USD`) with Admin-only manual rate fallbacks stored in DB.
- [x] **Subscription history**: History tracks changes to BOTH price and billing frequency. Frequency changes automatically recalculate `next_renewal_date`.
- [x] **Telegram Cron Logic**: Escalated reminders sent 7 days before, 3 days before (preventive), and 1 day before (imminent charge).
- [x] **Custom Tags Limit**: Maximum 50 custom tags per user enforced in DTO and Service.

