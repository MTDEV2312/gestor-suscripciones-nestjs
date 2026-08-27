# Proposal: Subscription Expense Reports & Payment History

## Intent
Enable users to track historical subscription payments, analyze multi-currency expense reports across customizable date ranges, visualize spending trends, and export detailed CSV reports.

## Scope
| Type | Items |
| :--- | :--- |
| **In Scope** | • `SubscriptionPayment` entity with immutable snapshots (`subscription_name`) and nullable FK (`onDelete: 'SET NULL'`)<br>• Backend `PaymentsModule` with payment CRUD, period duplicate detection, multi-currency aggregation, and CSV export<br>• Frontend `Reports.tsx` with date/preset filters, summary metric cards, Recharts monthly bar chart, payment history table, and CSV download<br>• Navigation linking from `App.tsx` and quick-pay action in `Dashboard.tsx` |
| **Out of Scope** | • Automatic bank/payment gateway sync (Stripe, PayPal)<br>• Automated recurring credit card charging |

## Capabilities
- **New `subscription-payments`**: Record, edit, and delete actual payment transactions; warn/prevent duplicate payments for the same subscription period.
- **New `expense-reports`**: Generate aggregated expense analytics by date range, month, or custom period, converted to user-selected currency, with UTF-8 BOM CSV export.
- **Modified `dashboard-navigation`**: Integrate Reports view and payment shortcuts.

## Technical Approach
- **Data Model**: Dedicated `subscription_payments` table with `user_id`, `subscription_id`, `amount`, `currency`, `payment_date`, `billing_month`, `billing_year`, `payment_method`, `status`, and `notes`.
- **Backend**: NestJS `PaymentsModule` utilizing TypeORM `QueryBuilder` and `CurrencyService` for unified currency conversions and Excel-compatible UTF-8 BOM CSV generation.
- **Frontend**: React `Reports.tsx` with period presets ("Este Mes", "Último Mes", "Año Actual", "Personalizado"), Recharts bar chart, responsive data tables, and modal for payment logging.

## Affected Areas
- `apps/backend/src/payments/*` (Module, Controller, Service, Entity, DTOs)
- `apps/backend/src/database/migrations/*` (New migration)
- `apps/backend/src/app.module.ts`
- `apps/frontend/src/pages/Reports.tsx`
- `apps/frontend/src/services/api.ts`
- `apps/frontend/src/App.tsx`, `apps/frontend/src/pages/Dashboard.tsx`

## Risks & Mitigations
| Risk | Mitigation |
| :--- | :--- |
| **Subscription Deletion** | Nullable FK (`onDelete: 'SET NULL'`) + snapshot `subscription_name` preserve financial records. |
| **Excel CSV Encoding** | Prepend UTF-8 BOM (`\uFEFF`) and set `Content-Type: text/csv; charset=utf-8`. |
| **Multi-Currency Accuracy** | Store immutable original amounts and use `CurrencyService` conversion for target currency view. |
| **DB Dialect Compatibility** | Use standard TypeORM QueryBuilder methods compatible with SQLite and PostgreSQL. |

## Rollback Plan
1. Revert TypeORM migration (`DROP TABLE subscription_payments`).
2. Remove `PaymentsModule` from `AppModule`.
3. Revert frontend route and navigation changes in `App.tsx` and `Dashboard.tsx`.

## Success Criteria
- [ ] Payments can be logged manually or from dashboard shortcuts with duplicate period warnings.
- [ ] Reports accurately summarize multi-currency expenses over custom and monthly ranges.
- [ ] CSV export downloads with proper formatting and character encoding.
- [ ] Test coverage passes on both backend and frontend builds.
