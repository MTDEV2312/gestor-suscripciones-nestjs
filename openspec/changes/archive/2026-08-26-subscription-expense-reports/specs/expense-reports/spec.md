# Specification: Subscription Expense Reports

## 1. Overview
The `expense-reports` capability provides aggregated expense analytics, multi-currency consolidated summaries, monthly spending breakdowns, and Excel-compatible UTF-8 BOM CSV exports for subscription payments.

## 2. Requirements

| ID | Requirement | RFC 2119 | Description |
| :--- | :--- | :--- | :--- |
| **REQ-ER-01** | Period & Query Filtering | **MUST** | Provide endpoint `GET /payments/report` accepting `startDate`, `endDate`, `startMonth` (YYYY-MM), `endMonth` (YYYY-MM), `subscriptionId`, `status`, and `targetCurrency`. |
| **REQ-ER-02** | Metric Aggregation & Conversion | **MUST** | Compute aggregated metrics: `total_spent` (converted to `targetCurrency` via `CurrencyService`), `paid_count`, `subscriptions_count`, `active_period`, and original `currency_breakdown`. |
| **REQ-ER-03** | Monthly Breakdown | **MUST** | Return `monthly_breakdown` list grouped by `billing_period` (YYYY-MM) with `year`, `month`, `total_amount` in target currency, and `transaction_count`. |
| **REQ-ER-04** | UTF-8 BOM CSV Export | **MUST** | Provide `GET /payments/report/export/csv` returning a CSV file with UTF-8 BOM (`\uFEFF`), `Content-Type: text/csv; charset=utf-8`, and Spanish headers (Fecha, Suscripción, Monto Original, Moneda, Monto Convertido, Método de Pago, Estado, Notas). |
| **REQ-ER-05** | Reports Navigation & UI | **SHALL** | Include a navbar link to "Reportes" (`/reports`) offering period presets ("Este Mes", "Mes Anterior", "Trimestre", "Año Actual", "Personalizado"), summary metric cards, Recharts chart, and CSV export. |

## 3. Scenarios

### Scenario 1: Generate multi-currency expense report (Happy Path)
- **Given** User A has payments in 2026-08: `$10.00 USD` and `€20.00 EUR` (conversion rate: 1 EUR = 1.10 USD)
- **When** User A sends `GET /payments/report?startMonth=2026-08&endMonth=2026-08&targetCurrency=USD`
- **Then** the system MUST return HTTP `200 OK`
- **And** `total_spent` MUST equal `32.00` USD (`10.00 + 22.00`)
- **And** `monthly_breakdown` MUST contain one item for `2026-08` with total `32.00`
- **And** `currency_breakdown` MUST list `{ USD: 10.00, EUR: 20.00 }`.

### Scenario 2: Generate expense report for empty date range (Empty Range Edge Case)
- **Given** an authenticated user with no payments recorded in 2025
- **When** the user sends `GET /payments/report?startDate=2025-01-01&endDate=2025-12-31&targetCurrency=USD`
- **Then** the system MUST return HTTP `200 OK` with `total_spent: 0`, `paid_count: 0`, `subscriptions_count: 0`, and `monthly_breakdown: []`.

### Scenario 3: Export CSV report with UTF-8 BOM (Export Path)
- **Given** payments with Spanish characters (e.g. `Suscripción: "Telefonía Móvil"`, `Notas: "Pago anual"`)
- **When** the user requests `GET /payments/report/export/csv?startMonth=2026-01&endMonth=2026-12`
- **Then** the response MUST return `200 OK`, `Content-Type: text/csv; charset=utf-8`
- **And** the binary body MUST begin with byte sequence `EF BB BF` (`\uFEFF`)
- **And** column headers MUST include `"Fecha"`, `"Suscripción"`, `"Monto Original"`, `"Moneda"`, `"Monto Convertido"`, `"Método"`, `"Estado"`, and `"Notas"`.

### Scenario 4: Filter expenses by specific subscription (Filter Edge Case)
- **Given** payments belonging to subscriptions `sub-1` and `sub-2`
- **When** the user sends `GET /payments/report?subscriptionId=sub-1`
- **Then** the result MUST ONLY aggregate and return payments where `subscription_id = 'sub-1'`.

### Scenario 5: Reject invalid date query parameters (Validation Error)
- **Given** an authenticated user
- **When** the user sends `GET /payments/report?startDate=2026-12-31&endDate=2026-01-01`
- **Then** the system MUST return HTTP `400 Bad Request` with an error indicating `startDate` cannot exceed `endDate`.
