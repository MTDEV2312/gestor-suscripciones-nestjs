# Exploration: Subscription Expense Reports & Payment History

## Topic
Reporte de gastos de suscripciones (Subscription Expense Reports & Payment History)
Change Name: `subscription-expense-reports`

---

## 1. Current State Analysis

### 1.1 Repository Structure
The project is a monorepo containing:
- `apps/backend`: NestJS 11 + TypeORM REST API supporting SQLite (`better-sqlite3`) in development and PostgreSQL in production via environment variables (`DB_TYPE`).
- `apps/frontend`: Vite + React 18 + TypeScript + Tailwind CSS + Lucide Icons + Recharts SPA.
- `openspec/changes`: Change specifications and implementation tracking.

### 1.2 Existing Data Models & Entities
- **`User`** (`apps/backend/src/users/entities/user.entity.ts`):
  - Fields: `id` (UUID), `username`, `email`, `password`, `telegramUsername`, `notificationHour`, `createdAt`, `updatedAt`.
  - Relations: `subscriptions` (OneToMany -> `Subscription`), `tags` (OneToMany -> `Tag`).
- **`Subscription`** (`apps/backend/src/subscriptions/entities/subscription.entity.ts`):
  - Fields: `id` (UUID), `name`, `price` (decimal 10,2), `currency` (varchar 3), `frequency` ('MONTHLY' | 'YEARLY'), `start_date` (date), `next_renewal_date` (date), `is_active` (boolean), `type` ('SUBSCRIPTION' | 'DOMAIN' | 'HOSTING'), `user_id`, `created_at`, `updated_at`.
  - Relations: `user` (ManyToOne), `history` (OneToMany -> `SubscriptionHistory`), `tags` (ManyToMany -> `Tag`).
- **`SubscriptionHistory`** (`apps/backend/src/subscription-history/entities/subscription-history.entity.ts`):
  - Records **price and frequency changes** (plan changes/audit history) whenever a subscription is edited.
  - Does **NOT** record actual payment transactions, billing dates, or expense history.
- **`Tag`** (`apps/backend/src/tags/entities/tag.entity.ts`):
  - Custom user-defined category tags for subscriptions.
- **`ExchangeRateFallback`** (`apps/backend/src/currency/entities/exchange-rate-fallback.entity.ts`):
  - Currency conversion rates with 5-day cache TTL and external API integration.

### 1.3 Existing Multi-Currency & Dashboard Services
- `CurrencyService` (`apps/backend/src/currency/currency.service.ts`):
  - Handles real-time conversion between currencies (USD, EUR, ARS, MXN, CLP, BRL, COP, UYU, PEN, etc.) with caching and fallback rates.
- `DashboardService` (`apps/backend/src/dashboard/dashboard.service.ts`):
  - Calculates estimated monthly/yearly spending based on currently active subscriptions.
- `RenewalScheduler` (`apps/backend/src/cron-job/cron-job.scheduler.ts`):
  - Cron runner that alerts users of upcoming renewals (7d, 3d, 1d) and advances `next_renewal_date` on due dates.

### 1.4 Frontend Routing and UI
- State-based navigation in `apps/frontend/src/App.tsx` (`currentPage: 'login' | 'register' | 'dashboard' | 'profile'`).
- `Dashboard.tsx` contains metric cards, currency dropdown, tag filters, charts (`recharts`), and subscription CRUD modals.
- `services/api.ts` provides strongly typed HTTP API helpers for backend endpoints.

---

## 2. Affected Areas

- `apps/backend/src/database/migrations/*` — New migration to create `subscription_payments` table with proper indexes and foreign keys.
- `apps/backend/src/payments/entities/subscription-payment.entity.ts` — New entity representing individual payment transactions.
- `apps/backend/src/payments/dto/*` — DTOs for creating, updating, and querying payments and expense reports.
- `apps/backend/src/payments/payments.service.ts` — Business logic for registering payments, idempotency/duplicate detection, aggregation by month/period, currency conversion, and CSV generation.
- `apps/backend/src/payments/payments.controller.ts` — REST endpoints for payment management, report generation, and CSV export.
- `apps/backend/src/payments/payments.module.ts` — Payments module registration and dependency injection.
- `apps/backend/src/app.module.ts` — Import of `PaymentsModule`.
- `apps/frontend/src/services/api.ts` — New API methods for payments, reports, and CSV download.
- `apps/frontend/src/pages/Reports.tsx` — New "Reportes de suscripciones" page with period filters, summary metrics, monthly breakdowns, payment history table, chart visualizations, and CSV export.
- `apps/frontend/src/App.tsx` — Navigation update to support `'reports'` page route.
- `apps/frontend/src/pages/Dashboard.tsx` — Add navigation link to "Reportes" and quick "Registrar Pago" action button on subscriptions.

---

## 3. Technical Approaches Comparison

### 3.1 Data Modeling for Payment History

#### Option A: Dedicated `SubscriptionPayment` Entity with Relation and Snapshots (Recommended)
- Store `id`, `user_id` (FK User), `subscription_id` (nullable FK Subscription with `onDelete: 'SET NULL'`), `subscription_name` (snapshot), `amount`, `currency`, `payment_date`, `billing_month`, `billing_year`, `billing_period`, `payment_method`, `status`, `notes`, `created_at`.
- **Pros**:
  - Full financial ledger immutability: payments remain intact even if a subscription is edited, renamed, or deleted.
  - Clean separation of concerns from plan change audit logs (`SubscriptionHistory`).
  - Allows standalone expense registration if desired.
  - Straightforward indexing on `[user_id, billing_year, billing_month]` and `[user_id, payment_date]`.
- **Cons**:
  - Requires a new database table and TypeORM migration.
- **Effort**: Medium.

#### Option B: Overloading `SubscriptionHistory` Table
- Extend existing `subscription_history` table to store both plan changes and payment records using a discriminator column.
- **Pros**:
  - Reuses an existing table.
- **Cons**:
  - Pollutes domain model with mixed responsibilities.
  - High risk of query bugs and migration complexities.
- **Effort**: High.

---

### 3.2 Duplicate Prevention & Idempotency

#### Option A: Service Validation with Unique Period Constraint Check (Recommended)
- Enforce check on `(subscription_id, billing_year, billing_month)` where `status = 'PAID'`.
- Provide clear error response (409 Conflict) if a payment for that subscription and period already exists, with an option to bypass if explicitly flagged (e.g. multiple charges in same month).
- **Pros**:
  - Prevents accidental double clicks or duplicate manual entries.
  - Preserves user control for legitimate multi-charge scenarios.
- **Cons**:
  - Requires pre-insert query validation.
- **Effort**: Low.

#### Option B: Database Unique Index Constraint on `(subscription_id, billing_year, billing_month)`
- Hard DB constraint rejecting any second record.
- **Pros**:
  - Zero possibility of DB-level duplication.
- **Cons**:
  - Prevents valid edge cases (e.g., partial refund + re-charge, or two separate subscriptions sharing an ID before deletion).
- **Effort**: Low.

---

### 3.3 Querying & Aggregation Engine

#### Option A: TypeORM QueryBuilder + `CurrencyService` Consolidated Aggregation (Recommended)
- Fetch filtered payments within period criteria using TypeORM `QueryBuilder`.
- Calculate monthly groupings, total spent per original currency, and converted total in target currency using `CurrencyService.convert()`.
- Return structured summary, monthly breakdown, and raw payment records in a single payload.
- **Pros**:
  - Consistent across SQLite and PostgreSQL.
  - Seamlessly integrates with the application's existing 5-day exchange rate cache.
  - Single roundtrip for frontend charts and tables.
- **Cons**:
  - Minor CPU overhead for in-memory currency conversion on large result sets.
- **Effort**: Medium.

#### Option B: Database SQL `SUM(amount) GROUP BY` Only
- Perform all grouping in SQL.
- **Pros**:
  - Fast for single currency.
- **Cons**:
  - Cannot handle multi-currency conversions across different subscription currencies in DB portably without complex DB stored procedures.
- **Effort**: High.

---

### 3.4 CSV Export Architecture

#### Option A: Backend Endpoint Generating UTF-8 BOM CSV (Recommended)
- Endpoint `GET /payments/report/export/csv` (or `POST /payments/report/export/csv`) formats filtered report data into CSV string with BOM (`\uFEFF`), Spanish localized headers, summary header, and per-payment details.
- Frontend fetches blob with JWT auth and triggers browser file download.
- **Pros**:
  - Accurate, testable, reusable backend logic.
  - Perfect Excel compatibility with Spanish characters (accent marks, ñ).
- **Cons**:
  - Requires API endpoint and client download handler.
- **Effort**: Low.

#### Option B: Frontend-only Client CSV Generator
- Generate CSV in browser memory from current table state.
- **Pros**:
  - No dedicated backend export endpoint.
- **Cons**:
  - Inconsistent formatting, cannot be reused by external API consumers or tests.
- **Effort**: Low.

---

## 4. Recommendation

We recommend:
1. **Data Model**: Dedicated `SubscriptionPayment` entity with `user_id`, `subscription_id` (`onDelete: 'SET NULL'`), `subscription_name` snapshot, `amount`, `currency`, `payment_date`, `billing_month`, `billing_year`, `billing_period`, `payment_method`, `status`, and `notes`.
2. **Backend Architecture**: New `PaymentsModule` (`PaymentsController`, `PaymentsService`, TypeORM migration) providing:
   - CRUD for payments (`POST /payments`, `GET /payments`, `GET /payments/:id`, `PATCH /payments/:id`, `DELETE /payments/:id`).
   - Expense report endpoint (`GET /payments/report`) with filtering by single month, multiple months, date range, subscription, and target currency.
   - Duplicate payment detection for subscription + period.
   - CSV export endpoint (`GET /payments/report/export/csv`).
3. **Frontend UI**:
   - New top navigation option and page: **`Reportes`** (`apps/frontend/src/pages/Reports.tsx`).
   - Period filters: Quick selector buttons ("Este Mes", "Mes Anterior", "Trimestre", "Año Actual", "Rango Personalizado") + date/month pickers.
   - Multi-currency consolidated metrics cards.
   - Monthly expenses breakdown table and interactive bar chart (`recharts`).
   - Complete payment details table with status indicators.
   - "Exportar CSV" button.
   - "Registrar Pago" modal accessible from Reports page and from Dashboard subscriptions list.

---

## 5. Risks & Mitigations

- **Risk 1: Currency Conversion Fluctuations**:
  - *Risk*: Historical payments converted at today's rate vs payment date rate.
  - *Mitigation*: Store original amount and currency on each payment. Converted totals clearly indicate conversion basis; show original currency totals alongside converted target currency.
- **Risk 2: Subscription Deletion**:
  - *Risk*: Deleting a subscription could cascade-delete financial payment history.
  - *Mitigation*: Set `onDelete: 'SET NULL'` on `subscription_id` and store `subscription_name` as an immutable snapshot.
- **Risk 3: CSV Encoding in Excel**:
  - *Risk*: Special characters and accents (e.g. "Suscripción", "Período") showing corrupted in Microsoft Excel.
  - *Mitigation*: Prepend UTF-8 Byte Order Mark (`\uFEFF`) and set `Content-Type: text/csv; charset=utf-8`.
- **Risk 4: Database Dialect Compatibility**:
  - *Risk*: Queries using SQLite-specific functions breaking in PostgreSQL.
  - *Mitigation*: Use TypeORM standard QueryBuilder methods and JS-level date-fns formatting rather than dialect-specific SQL functions.

---

## 6. Ready for Proposal
Yes. The requirements and architecture are fully explored, all dependencies and constraints are clear, and the project is ready for the OpenSpec proposal phase (`sdd-propose`).
