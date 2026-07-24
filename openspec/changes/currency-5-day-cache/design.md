# Design: currency-5-day-cache

## Technical Approach
Update `CurrencyService` to enforce a 5-day cache window (`432,000,000 ms`) for external exchange rates. Rates fetched from Exchange Rate API will be stored in PostgreSQL/SQLite database (`ExchangeRateFallback` entity) with a `last_fetched_at` timestamp. Subsequent conversion requests will check in-memory cache first, then database fallback records. External API calls will only occur if the database rates are missing or older than 5 days. If the external API fails or times out after 5 days, existing DB rates will be preserved and used as fallback.

## Architecture Decisions
### Decision: Cache Persistence & Fallback Strategy
| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Separate Cache Table** | Requires new entity, repository injection, and extra DB migration overhead. | Rejected. |
| **Extend `ExchangeRateFallback` Entity** | Reuses existing fallback repository; single table for fallback and cached rates. | **Selected**: Add nullable `last_fetched_at` timestamp column to `ExchangeRateFallback`. |
| **Cron Job Refresh** | Background worker runs every 5 days regardless of API usage or system demand. | Rejected. |
| **Lazy Service-Level Fetch** | On-demand cache validation during `convert()` checks memory -> DB -> API. | **Selected**: Low resource footprint; checks freshness only when rates are needed. |

## Data Flow
```
[Client Request: convert(100, USD, EUR)]
          │
          ▼
[Check Memory Cache (rateCache)] ── Valid (< 5 days) ──► Return Rate
          │ Expired / Null
          ▼
[Query DB (ExchangeRateFallback)]
          │
   Check max(last_fetched_at)
          │
  ┌───────┴────────────────────────┐
  │ Within 5 days                  │ Older than 5 days / Empty
  ▼                                ▼
[Hydrate Memory Cache]   [Call External API]
  │                        │
  ▼                        ├──────► Success: Save Rates & last_fetched_at to DB ──► Return Rate
Return Rate                │
                           └──────► Failure/Timeout: Log warning, use existing DB rates ──► Return Rate
```

## File Changes
| File | Action | Description |
|------|--------|-------------|
| `apps/backend/src/currency/entities/exchange-rate-fallback.entity.ts` | Modify | Add nullable `last_fetched_at` column. |
| `apps/backend/src/currency/currency.service.ts` | Modify | Change `cacheTtlMs` to 5 days (`432_000_000`), implement DB cache hydration and persistence. |
| `apps/backend/src/currency/currency.service.spec.ts` | Modify | Update and add unit tests covering 5-day TTL, DB cache loading across restarts, and API fallback. |

## Interfaces / Contracts
```typescript
// Updated ExchangeRateFallback Entity
@Entity('exchange_rate_fallback')
export class ExchangeRateFallback {
  // Existing columns: id, base_currency, target_currency, rate, updated_at
  
  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Timestamp of last successful API fetch',
  })
  last_fetched_at?: Date;
}
```

## Testing Strategy
| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | Memory Cache Hit | Verify external API is NOT called when memory cache age < 5 days. |
| Unit | DB Cache Hit (Server Restart) | Verify when memory cache is empty, valid DB rates (`last_fetched_at` < 5 days) populate cache without API call. |
| Unit | Expired Cache API Fetch | Verify when DB rates are > 5 days old, external API is called and DB rates & `last_fetched_at` are updated. |
| Unit | External API Resiliency | Verify when DB rates are > 5 days old but external API fails, service retains DB rates as fallback without throwing. |

## Threat Matrix
Not Applicable (N/A). This change only alters in-memory and database caching logic within NestJS service layer. It does not introduce new routing endpoints, process execution, shell commands, or VCS automation.

## Migration / Rollout
Schema update is non-breaking. `last_fetched_at` is added as a nullable column (`nullable: true`). Existing DB records will have `NULL` for `last_fetched_at` and will trigger an API refresh on their first conversion request, thereafter caching for 5 days.

## Open Questions
- None.
