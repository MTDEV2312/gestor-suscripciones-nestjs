# Exploration: Expense Reports PDF and CSV Format Selection

**Change ID**: `expense-reports-pdf-export`  
**Date**: 2026-08-26  
**Status**: Completed  
**Target Capability**: `expense-reports`  

---

## 1. Context & User Request

The user requested the ability to select the export format for expense reports: either **PDF** or **CSV**.
Specifically:
- The user must be able to choose between exporting the report in **PDF** or **CSV** format directly from the user interface.
- The **PDF** format must be **visually attractive, polished, professional, and easy to read** ("visualmente atractivo el contenido y fácil de leer").
- The export should reflect active filters (period, date range, subscription filter, payment status, target currency).

---

## 2. Current State Architecture

### Backend (`apps/backend`)
- **Framework**: NestJS 11 with Express, TypeORM, Better-SQLite3 / Postgres.
- **Current Payments Controller** ([`PaymentsController`](file:///C:/Users/agusm/Videos/Dev/gestor_suscripciones_nest-js/apps/backend/src/payments/payments.controller.ts)):
  - `GET /payments/report`: Returns aggregated metrics (`total_spent`, `target_currency`, `paid_count`, `subscriptions_count`, `currency_breakdown`, `monthly_breakdown`, `payments`).
  - `GET /payments/report/export/csv`: Generates and streams a UTF-8 BOM CSV file with Spanish headers and formula sanitization.
- **Current Payments Service** ([`PaymentsService`](file:///C:/Users/agusm/Videos/Dev/gestor_suscripciones_nest-js/apps/backend/src/payments/payments.service.ts)):
  - Contains `getExpenseReport()` (multi-currency aggregation via `CurrencyService`) and `exportCsv()`.
  - No PDF generation module or library is currently installed on the backend.

### Frontend (`apps/frontend`)
- **Framework**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts.
- **Reports Page** ([`Reports.tsx`](file:///C:/Users/agusm/Videos/Dev/gestor_suscripciones_nest-js/apps/frontend/src/pages/Reports.tsx)):
  - Header navbar currently features a single action button: `[ Exportar CSV ]`.
  - Supports preset periods ("Este Mes", "Mes Anterior", "Últimos 3 Meses", "Año Actual", "Personalizado"), subscription filter, status filter, and target currency selector.
  - Displays KPI summary cards, a monthly spending bar chart (`Recharts`), and a detailed transactions table.
- **API Client** ([`api.ts`](file:///C:/Users/agusm/Videos/Dev/gestor_suscripciones_nest-js/apps/frontend/src/services/api.ts)):
  - Contains `api.payments.downloadReportCsv(params)` which handles blob fetching, `Content-Disposition` filename extraction, and automated download trigger via temporary `<a>` element.

---

## 3. Affected Areas

- `apps/backend/src/payments/payments.controller.ts` — Add `GET /payments/report/export/pdf` endpoint.
- `apps/backend/src/payments/payments.service.ts` — Implement `exportPdf(req, queryDto)` to build structured PDF buffer.
- `apps/backend/package.json` — Add PDF generation dependency (`pdfmake` or `pdfkit`).
- `apps/frontend/src/services/api.ts` — Add `api.payments.downloadReportPdf(params)` API helper.
- `apps/frontend/src/pages/Reports.tsx` — Replace single CSV button with format selector (Dropdown Menu or Split Action Button: PDF / CSV) with visual loading states.

---

## 4. Visual Design & Layout Requirements for PDF

To satisfy the requirement of being **visually attractive and easy to read**, the PDF must include:

1. **Document Header & Branding**:
   - Modern top accent banner with company/app brand ("Gestor de Suscripciones").
   - Title: "Reporte Ejecutivo de Gastos y Pagos".
   - Metadata Block: Emission timestamp, authenticated user email/username, applied period filter, and target consolidation currency.

2. **Executive Summary KPI Cards**:
   - Visual summary cards with shaded background and borders:
     - **Gasto Total Consolidado** (prominent bold metric in target currency).
     - **Pagos Realizados** (count of paid transactions vs total).
     - **Suscripciones Activas** (count of unique services paid).
     - **Desglose Multimoneda Original** (summary of original currencies before conversion).

3. **Monthly Evolution Summary Table**:
   - Clean tabular breakdown of spending per billing period (`YYYY-MM`), payment counts, and consolidated totals.

4. **Detailed Transactions Table**:
   - Polished table with column formatting:
     - Fecha de Pago (DD/MM/YYYY)
     - Suscripción / Servicio
     - Período (YYYY-MM)
     - Monto Original ({Amount} {Currency})
     - Monto Convertido ({Amount} {TargetCurrency})
     - Método de Pago
     - Estado (Visual color badges: `PAID` in emerald `#10B981`, `PENDING` in amber `#F59E0B`, `FAILED` in red `#EF4444`)
     - Notas / Observaciones
   - Subtle zebra striping or crisp cell borders for high readability in print or digital viewing.

5. **Document Footer & Multi-Page Pagination**:
   - Top divider line above footer.
   - Left: "Gestor de Suscripciones • Reporte generado automáticamente".
   - Right: Dynamic page numbering ("Página X de Y").

---

## 5. Architectural Approaches Compared

### Approach 1: Backend PDF Generation via `pdfmake` (Recommended for REST Completeness)
- **Description**:
  The backend NestJS service uses `pdfmake` to generate the PDF server-side. A new endpoint `GET /payments/report/export/pdf` streams the generated PDF document. The frontend API client fetches the PDF blob and triggers a browser download.
- **Pros**:
  - Full REST API symmetry (`/export/csv` and `/export/pdf`).
  - Allows external automated consumers (bots, cron emails, curl, mobile apps) to download PDF reports directly.
  - Declarative layout engine with native support for tables, columns, headers, footers, page numbering `(currentPage, pageCount)`, and vector styling.
  - Centralized business logic and formatting in the backend service.
- **Cons**:
  - Adds server-side CPU and memory processing overhead for large reports.
  - Requires bundling standard Roboto fonts with `pdfmake/build/vfs_fonts`.
- **Effort**: Medium

### Approach 2: Client-Side Vector PDF Generation via `jspdf` + `jspdf-autotable`
- **Description**:
  The PDF is assembled directly in the browser using `jspdf` and `jspdf-autotable` from the already loaded `report` state in React.
- **Pros**:
  - Zero server CPU / memory overhead. NestJS backend remains purely lightweight JSON/CSV.
  - Instant generation with no extra network payload or roundtrip if data is cached.
  - `jspdf-autotable` handles page breaks, repeated table headers, and custom cell styling seamlessly.
- **Cons**:
  - PDF generation is not available via backend API endpoints for third-party consumers or automated scripts.
  - Frontend bundle size increases slightly (~250 KB).
- **Effort**: Medium

### Approach 3: Browser Print Stylesheet / HTML Canvas Rendering (`window.print()` or `html2pdf`)
- **Description**:
  Use CSS `@media print` or render off-screen HTML converted to canvas via `html2canvas`.
- **Pros**:
  - Reuses React JSX components and Tailwind CSS styles directly.
- **Cons**:
  - `window.print()` triggers browser print dialog instead of a direct file download `.pdf`.
  - `html2canvas` produces blurry rasterized images, massive file sizes, and poor multi-page page breaks.
- **Effort**: Low to Medium (but poor user experience and output quality).

---

## 6. Comparison Matrix

| Criteria | Approach 1: Backend `pdfmake` | Approach 2: Client-side `jspdf` | Approach 3: HTML / Print Canvas |
| :--- | :--- | :--- | :--- |
| **Visual Polish & Readability** | ⭐⭐⭐⭐⭐ High (declarative vector, crisp fonts, KPI boxes, colored badges) | ⭐⭐⭐⭐⭐ High (vector typography, autotable badges, headers) | ⭐⭐ Low-Medium (raster blur / inconsistent print dialog) |
| **Direct File Download** | Yes (`reporte-pagos-{period}.pdf`) | Yes (`reporte-pagos-{period}.pdf`) | No (Print dialog) or blurry blob |
| **API Availability** | Yes (`GET /payments/report/export/pdf`) | No (Frontend only) | No (Browser DOM only) |
| **Server Load** | Moderate (PDF rendering in Node.js) | Zero (Client rendered) | Zero |
| **Multi-page Support** | Native (Headers, Footers, Page X of Y) | Native via autotable hooks | Problematic page splits |
| **Implementation Effort** | Medium | Medium | Low |

---

## 7. Recommendation

**Recommended Option**: **Approach 1 (Backend PDF Generation with `pdfmake`) with an Elegant Export Dropdown / Action Selector in Frontend**.

### Rationale:
1. **API Consistency**: NestJS backend already exposes `GET /payments/report/export/csv`. Exposing `GET /payments/report/export/pdf` creates a clean, symmetrical, production-grade API architecture.
2. **Professional PDF Design**: `pdfmake` enables declarative, structured document layouts with precise margins, colored summary cards, clean tables with zebra striping, status badges, and dynamic `Página X de Y` footers.
3. **Format Selection UI**: `Reports.tsx` will feature an intuitive "Exportar ▾" dropdown menu (or dual action buttons) with `lucide-react` icons (`FileText` for PDF, `Download` / `FileSpreadsheet` for CSV), clear format labels, and active loading indicators.

---

## 8. Risks & Mitigation

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Font resolution in Node.js / Docker** | Medium | Use standard `pdfmake` bundled Roboto VFS (`pdfmake/build/vfs_fonts.js`), which requires no external font files on disk. |
| **Large transaction count performance** | Low-Medium | Stream PDF buffer via Express `res`, chunking rows efficiently and applying pagination limit if needed. |
| **Dropdown UX on mobile screens** | Low | Design responsive UI with full touch targets and close-on-click-outside listeners. |

---

## 9. Ready for Proposal
- **Decision**: Ready to proceed with OpenSpec Proposal (`sdd-propose`).
