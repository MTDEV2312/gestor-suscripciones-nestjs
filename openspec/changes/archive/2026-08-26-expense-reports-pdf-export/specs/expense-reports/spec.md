# Specification Delta: Expense Reports PDF and CSV Export

## 1. Overview
Extends the `expense-reports` capability to support executive PDF report generation alongside CSV export, with comprehensive formatting (branding header, metadata, KPI summary cards, monthly breakdown, detailed transaction ledger with status badge styling, and dynamic footer pagination) and a frontend format selection dropdown.

## 2. Requirements Delta

### MODIFIED Requirements

| ID | Requirement | RFC 2119 | Description |
| :--- | :--- | :--- | :--- |
| **REQ-ER-05** | Reports Navigation & Format Selection | **SHALL** | Include a navbar link to "Reportes" (`/reports`) offering period presets ("Este Mes", "Mes Anterior", "Trimestre", "Año Actual", "Personalizado"), summary metric cards, Recharts visualization, and an export dropdown menu supporting both PDF and CSV formats with loading indicators. |

### ADDED Requirements

| ID | Requirement | RFC 2119 | Description |
| :--- | :--- | :--- | :--- |
| **REQ-ER-06** | Executive PDF Export Generation | **MUST** | Provide endpoint `GET /payments/report/export/pdf` returning `application/pdf`. The PDF document MUST include: header title, generation metadata, active filter criteria, consolidated KPI summary cards, monthly breakdown table, detailed transactions table with color-coded status badges, and dynamic pagination footer (`Página X de Y`). |
| **REQ-ER-07** | PDF Multi-Currency & Currency Conversion | **MUST** | The PDF export MUST format original payment amounts in their recorded currency, converted amounts in the user's `targetCurrency`, and display a multi-currency breakdown section when transactions span multiple currencies. |

## 3. Scenarios

### Scenario 1: Generate executive PDF expense report (Happy Path)
- **Given** an authenticated user with payments across multiple subscriptions in the selected period
- **When** the user sends `GET /payments/report/export/pdf?startMonth=2026-01&endMonth=2026-08&targetCurrency=USD`
- **Then** the system MUST return HTTP `200 OK` with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="reporte_gastos_2026-01_2026-08.pdf"`
- **And** the PDF document MUST render the header, filter criteria, KPI summary, monthly summary table, detailed transactions table, and footer `Página X de Y`.

### Scenario 2: Generate PDF report for empty date range (Empty Range Edge Case)
- **Given** an authenticated user with no payments recorded in the requested range
- **When** the user sends `GET /payments/report/export/pdf?startDate=2025-01-01&endDate=2025-12-31`
- **Then** the system MUST return HTTP `200 OK` with a valid PDF containing zeroed KPI cards (`Total: $0.00`, `0 pagos`) and an empty state notice in the transaction table.

### Scenario 3: PDF export with multi-currency transactions (Multi-Currency Edge Case)
- **Given** recorded payments in `USD`, `EUR`, and `COP` converted to `USD`
- **When** the user exports the PDF with `targetCurrency=USD`
- **Then** the PDF KPI section MUST list individual totals per currency (`USD`, `EUR`, `COP`) alongside the consolidated total in `USD`
- **And** transaction rows MUST display both original amount/currency and converted amount in `USD`.

### Scenario 4: Export format selection from Frontend (UI Interaction)
- **Given** the user is viewing `/reports` with active filters
- **When** the user clicks "Exportar" and selects "Exportar PDF"
- **Then** the UI MUST trigger `downloadReportPdf` with active filter parameters, show a loading state on the PDF option, and trigger browser file download upon completion.

### Scenario 5: Reject invalid date query parameters in PDF export (Validation Error)
- **Given** an authenticated user
- **When** the user sends `GET /payments/report/export/pdf?startDate=2026-12-31&endDate=2026-01-01`
- **Then** the system MUST return HTTP `400 Bad Request` with an error message indicating `startDate` cannot exceed `endDate`.
