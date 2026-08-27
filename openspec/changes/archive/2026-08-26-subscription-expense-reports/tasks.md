# Tasks: Subscription Expense Reports & Payment History

## Review Workload Forecast
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units
| Work Unit | Focus | Target Files |
| :--- | :--- | :--- |
| **WU1: DB & Backend** | Migration, Entity, DTOs, PaymentsService, Controller | `apps/backend/src/payments/*`, `migrations/*`, `app.module.ts` |
| **WU2: Frontend** | API types/client, PaymentModal, Reports page, Dashboard | `apps/frontend/src/pages/Reports.tsx`, `PaymentModal.tsx`, `api.ts`, `Dashboard.tsx` |
| **WU3: Testing & Quality** | Backend unit/controller tests, lint, and build verification | `apps/backend/src/payments/*.spec.ts` |

---

## Phase 1: Database & Entity Infrastructure
- [x] 1.1 Create migration `1784864063153-AddSubscriptionPayments.ts` for `subscription_payments` table with indexes, FKs, and constraints.
- [x] 1.2 Implement `SubscriptionPayment` entity in `apps/backend/src/payments/entities/subscription-payment.entity.ts` with snapshot fields and nullable relation.

## Phase 2: Backend Payments Module & Logic
- [x] 2.1 Define validation DTOs (`CreatePaymentDto`, `UpdatePaymentDto`, `QueryReportDto`) in `apps/backend/src/payments/dto/`.
- [x] 2.2 Implement `PaymentsService` with CRUD, duplicate payment warning/override logic, and `CurrencyService` multi-currency aggregation.
- [x] 2.3 Add CSV stream builder in `PaymentsService` with UTF-8 BOM (`\uFEFF`) and formula sanitization.
- [x] 2.4 Implement `PaymentsController` endpoints for CRUD, `/report` metrics aggregation, and `/report/export/csv` export with `JwtAuthGuard`.
- [x] 2.5 Register `PaymentsModule` in `apps/backend/src/app.module.ts`.

## Phase 3: Frontend API & State Integration
- [x] 3.1 Define TypeScript interfaces (`SubscriptionPayment`, `ExpenseReportResponse`, `CreatePaymentPayload`) in `apps/frontend/src/services/api.ts`.
- [x] 3.2 Implement API client functions for payment CRUD, report fetching, and CSV export in `apps/frontend/src/services/api.ts`.

## Phase 4: Frontend UI
- [x] 4.1 Build `PaymentModal.tsx` modal component for manual and subscription-prefilled payment entry.
- [x] 4.2 Create `Reports.tsx` page with preset period filters, custom date pickers, and currency selector.
- [x] 4.3 Add summary metrics cards (Total Spent, Paid Count, Subscriptions Tracked) and Recharts monthly spending bar chart to `Reports.tsx`.
- [x] 4.4 Implement responsive payments history table with sorting, status badges, and action triggers in `Reports.tsx`.
- [x] 4.5 Add CSV download trigger button and hook up backend export endpoint in `Reports.tsx`.
- [x] 4.6 Register `'reports'` route in `apps/frontend/src/App.tsx` and add "Registrar Pago" quick-action and navigation button in `Dashboard.tsx`.

## Phase 5: Verification & Tests
- [x] 5.1 Write unit tests for `PaymentsService` covering CRUD, duplicate prevention, multi-currency aggregation, and CSV generation.
- [x] 5.2 Write unit/integration tests for `PaymentsController` verifying tenant scoping and query validations.
- [x] 5.3 Run backend and frontend linting, TypeScript type-check, and automated test suites to ensure clean build.
