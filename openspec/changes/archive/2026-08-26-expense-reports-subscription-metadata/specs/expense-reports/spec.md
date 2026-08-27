# Specification Delta: Enhanced Subscription Metadata in PDF Expense Reports

## 1. Overview
Extends the `expense-reports` capability to enrich PDF expense reports with full subscription profile metadata (service name, contracted price, billing frequency, service type, next renewal date, active status) and an aggregated subscription spending breakdown table with budget share percentages.

## 2. Requirements Delta

### MODIFIED Requirements

| ID | Requirement | RFC 2119 | Description |
| :--- | :--- | :--- | :--- |
| **REQ-ER-06** | Executive PDF Export Generation | **MUST** | Provide endpoint `GET /payments/report/export/pdf` returning `StreamableFile` with `application/pdf`. The PDF document MUST render: branding header, generation metadata, active filter criteria, consolidated KPI summary cards, **Subscription Profile metadata block** (for single-subscription filter), **Subscription Spending Breakdown table** with percentage share (for multi-subscription reports), monthly summary table, and detailed transaction ledger including **payment methods** and color-coded status badges. |

## 3. Scenarios

### Scenario 1: Generate PDF report for all subscriptions (Multi-Subscription Summary)
- **Given** an authenticated user with payments across multiple subscriptions ("Netflix", "AWS", "Spotify")
- **When** the user sends `GET /payments/report/export/pdf?startMonth=2026-01&endMonth=2026-08&targetCurrency=USD`
- **Then** the PDF MUST include a "RESUMEN POR SUSCRIPCIÓN" table listing each subscription, its frequency/type, payment count, total converted amount, and its percentage share of total period expenses.

### Scenario 2: Generate PDF report for a specific subscription (Profile Card)
- **Given** an authenticated user filtering by a specific `subscriptionId`
- **When** the user sends `GET /payments/report/export/pdf?subscriptionId=sub-123&targetCurrency=USD`
- **Then** the PDF document MUST display a "PERFIL DE SUSCRIPCIÓN" card containing: Service Name, Frequency (Mensual/Anual), Type (Suscripción/Dominio/Hosting), Regular Price & Currency, Next Renewal Date, and Active Status.

### Scenario 3: Detailed transaction ledger with payment methods
- **Given** recorded payments with payment methods ("Credit Card", "PayPal", "Bank Transfer")
- **When** the user exports the PDF
- **Then** each transaction row in the detailed ledger table MUST display the recorded payment method.
