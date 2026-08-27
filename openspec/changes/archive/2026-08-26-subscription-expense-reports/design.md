# Technical Design: Subscription Expense Reports & Payment History

## 1. Technical Approach
The `subscription-expense-reports` feature introduces a dedicated `PaymentsModule` in NestJS and a `Reports.tsx` dashboard in React. Payments maintain historical transactions independently of subscription lifecycles through snapshot fields (`subscription_name`) and nullable foreign keys (`onDelete: 'SET NULL'`). Multi-currency expense aggregation leverages `CurrencyService` for unified target-currency reporting and Excel-compatible UTF-8 BOM CSV exports.

## 2. Architecture Decisions

| Area | Option | Tradeoff | Decision |
| :--- | :--- | :--- | :--- |
| **Data Model** | Dedicated `SubscriptionPayment` vs extending `SubscriptionHistory` | New table vs mixing plan audit logs with financial transactions | **Dedicated Entity**: Pure ledger separation, snapshot immutability, `SET NULL` on subscription deletion. |
| **Duplicate Prevention** | Service pre-validation vs DB unique index | Service query vs DB-level constraint preventing valid edge recharges | **Service Check**: Blocks duplicate `PAID` payments for `(subscription_id, billing_period)` unless `allow_duplicate: true`. |
| **Multi-Currency** | In-Memory `CurrencyService` vs SQL multi-currency functions | Memory CPU vs non-portable DB stored procs | **`CurrencyService` Aggregation**: Uses existing 5-day exchange rate cache portably across SQLite and Postgres. |
| **CSV Export** | Backend UTF-8 BOM stream vs client-side CSV generator | Dedicated endpoint vs client formatting inconsistency | **Backend Endpoint (`GET /payments/report/export/csv`)**: Encodes `\uFEFF` BOM, sanitizes formulas, guarantees standard export. |

## 3. Data Flow

```
[React Frontend: Reports.tsx / Dashboard.tsx]
       │
       ▼ (HTTP + Bearer JWT)
[PaymentsController] ──> [JwtAuthGuard / User Scope]
       │
       ▼
[PaymentsService]
  ├──> [SubscriptionPayment Repository] (CRUD, duplicate check)
  ├──> [CurrencyService] (Convert line items to target currency)
  └──> [CSV Stream / JSON Aggregator] (Monthly totals, BOM headers)
       │
       ▼
[Client: Recharts Bar Chart / Summary Cards / CSV File Download]
```

## 4. Database Schema & Migration

### Table: `subscription_payments`
- `id` (varchar/UUID, PK)
- `user_id` (varchar(50), NOT NULL, FK `user(id)` ON DELETE CASCADE)
- `subscription_id` (varchar(50), NULL, FK `subscription(id)` ON DELETE SET NULL)
- `subscription_name` (varchar(100), NOT NULL) — *Snapshot*
- `amount` (decimal(10,2), NOT NULL)
- `currency` (varchar(3), NOT NULL)
- `payment_date` (date, NOT NULL)
- `billing_month` (smallint, NOT NULL, 1-12)
- `billing_year` (smallint, NOT NULL)
- `billing_period` (varchar(7), NOT NULL) — *Format: YYYY-MM*
- `payment_method` (varchar(50), NULL)
- `status` (varchar(20), NOT NULL DEFAULT 'PAID') — *PAID, PENDING, FAILED*
- `notes` (text, NULL)
- `created_at` (datetime, NOT NULL DEFAULT now)
- `updated_at` (datetime, NOT NULL DEFAULT now)

**Indexes**:
- `IDX_payments_user_date` (`user_id`, `payment_date`)
- `IDX_payments_user_period` (`user_id`, `billing_year`, `billing_month`)
- `IDX_payments_sub_period` (`subscription_id`, `billing_period`)

**Migration**: `1784864063153-AddSubscriptionPayments.ts` creates table with foreign keys, checks, and composite indexes.

## 5. File Changes

| Action | Path | Purpose |
| :--- | :--- | :--- |
| **Create** | `apps/backend/src/database/migrations/1784864063153-AddSubscriptionPayments.ts` | TypeORM migration for `subscription_payments`. |
| **Create** | `apps/backend/src/payments/entities/subscription-payment.entity.ts` | TypeORM entity for payments. |
| **Create** | `apps/backend/src/payments/dto/*.dto.ts` | `CreatePaymentDto`, `UpdatePaymentDto`, `QueryReportDto`. |
| **Create** | `apps/backend/src/payments/payments.service.ts` | Ledger CRUD, duplicate check, multi-currency reporting & CSV engine. |
| **Create** | `apps/backend/src/payments/payments.controller.ts` | Endpoints for payments, report metrics, and CSV download. |
| **Create** | `apps/backend/src/payments/payments.module.ts` | Payments module definition. |
| **Create** | `apps/backend/src/payments/payments.service.spec.ts` | Unit tests for service logic and edge cases. |
| **Modify** | `apps/backend/src/app.module.ts` | Import `PaymentsModule`. |
| **Create** | `apps/frontend/src/pages/Reports.tsx` | Reports page with filters, metric cards, Recharts chart, and table. |
| **Create** | `apps/frontend/src/components/PaymentModal.tsx` | Reusable modal for creating/editing payment records. |
| **Modify** | `apps/frontend/src/services/api.ts` | Add payments and reports API client methods and types. |
| **Modify** | `apps/frontend/src/App.tsx` | Add `'reports'` page route and navigation handling. |
| **Modify** | `apps/frontend/src/pages/Dashboard.tsx` | Add "Reportes" nav link and "Registrar Pago" row action. |

## 6. Interfaces & DTO Contracts

```typescript
export class CreatePaymentDto {
  @IsOptional() @IsString() subscription_id?: string;
  @IsNotEmpty() @IsString() @Length(1, 100) subscription_name!: string;
  @IsNotEmpty() @IsNumber() amount!: number;
  @IsNotEmpty() @IsString() @Length(3, 3) currency!: string;
  @IsNotEmpty() @IsDateString() payment_date!: string;
  @IsNotEmpty() @IsInt() @Min(1) @Max(12) billing_month!: number;
  @IsNotEmpty() @IsInt() @Min(2000) @Max(2100) billing_year!: number;
  @IsOptional() @IsString() payment_method?: string;
  @IsOptional() @IsIn(['PAID', 'PENDING', 'FAILED']) status?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() allow_duplicate?: boolean;
}

export interface ExpenseReportResponse {
  total_spent: number;
  target_currency: string;
  paid_count: number;
  subscriptions_count: number;
  currency_breakdown: Record<string, number>;
  monthly_breakdown: Array<{
    period: string; // YYYY-MM
    year: number;
    month: number;
    total_amount: number;
    transaction_count: number;
  }>;
  payments: SubscriptionPaymentResponse[];
}
```

## 7. Testing Strategy
- **Unit (`PaymentsService`)**: CRUD operations, duplicate conflict detection (409), `allow_duplicate` override, multi-currency conversion aggregation, empty range response, CSV string generation with `\uFEFF`.
- **Integration (`PaymentsController`)**: JWT authentication guard, user tenant isolation, query validation (`startDate` <= `endDate`).
- **Frontend**: Component rendering of `Reports.tsx`, preset filter selection, modal submit handling, CSV download trigger.

## 8. Threat Matrix

| Threat | Impact | Likelihood | Mitigation |
| :--- | :--- | :--- | :--- |
| **Cross-Tenant Access (IDOR)** | High | Low | Enforce `user_id = req.user.id` on all queries and mutations. |
| **CSV Injection (Formula Exec)** | Medium | Low | Prefix formula triggers (`=`, `+`, `-`, `@`) with a single quote `'` in CSV exports. |
| **Exchange Rate Tampering** | Low | Low | Perform all conversions server-side via `CurrencyService`. |

## 9. Migration & Rollout Plan
1. Execute migration `1784864063153-AddSubscriptionPayments.ts`.
2. Deploy backend with `PaymentsModule`.
3. Deploy frontend with `Reports` page and quick-pay actions.
4. *Rollback*: Drop `subscription_payments` table, revert frontend routing.

## 10. Open Questions
*None.* Specifications and architecture requirements are fully specified.
