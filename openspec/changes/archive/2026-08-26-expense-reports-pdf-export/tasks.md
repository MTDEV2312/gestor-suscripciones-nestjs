# Tasks: Expense Reports PDF and CSV Export

## Review Workload Forecast
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units
| Unit | Description | Est. Lines | PR |
| :--- | :--- | :--- | :--- |
| WU-1 | Backend PDF generation engine & dependencies | ~140 | PR 1 (Backend) |
| WU-2 | Controller endpoint for PDF export | ~40 | PR 1 (Backend) |
| WU-3 | Frontend API client & format selector dropdown UI | ~90 | PR 2 (Frontend) |
| WU-4 | Unit tests & integration verification | ~80 | PR 2 (Frontend & Tests) |

---

## Phase 1: Backend PDF Engine & Dependency Setup

- [x] 1.1 Install `pdfmake` and `@types/pdfmake` in `apps/backend/package.json`.
- [x] 1.2 Import and configure virtual file system Roboto fonts (`pdfmake/build/vfs_fonts`) for Node environment.
- [x] 1.3 Implement PDF styling constants and palette (primary indigo, neutral slate, status badge color mapping) in `payments.service.ts`.
- [x] 1.4 Implement document definition builder in `PaymentsService.exportPdf()` covering header branding, generation metadata, and active filter criteria badges.
- [x] 1.5 Add KPI metric summary cards table generator in `exportPdf()` with multi-currency aggregated balances.
- [x] 1.6 Add monthly breakdown and detailed transactions tables with zebra rows, status badges, and currency formatting.
- [x] 1.7 Add dynamic footer pagination callback (`Página X de Y`) with top divider rule in document definition.
- [x] 1.8 Compile `TDocumentDefinitions` into a readable `Buffer` stream using `PdfPrinter`.

---

## Phase 2: Controller & REST Endpoint

- [x] 2.1 Add `@Get('report/export/pdf')` route handler in `PaymentsController` protected by `JwtAuthGuard`.
- [x] 2.2 Wire `QueryReportDto` validation and pass authenticated user context to `PaymentsService.exportPdf`.
- [x] 2.3 Set HTTP response headers `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="reporte-gastos-{startMonth}_{endMonth}.pdf"`.
- [x] 2.4 Return PDF `Buffer` / `StreamableFile` with error handling for empty or invalid date ranges.

---

## Phase 3: Frontend API & UI Format Selection

- [x] 3.1 Implement `downloadReportPdf(params)` in `apps/frontend/src/services/api.ts` handling binary blob download and dynamic filename parsing.
- [x] 3.2 Update `Reports.tsx` with format selection dropdown menu ("Exportar" button with `Download` and `ChevronDown` icons).
- [x] 3.3 Add "Exportar PDF" option (`FileText` icon) and "Exportar CSV" option (`FileSpreadsheet` icon) to dropdown.
- [x] 3.4 Implement click-outside and escape-key listeners to dismiss export dropdown.
- [x] 3.5 Bind export handlers to active filter states with independent loading indicators and disabled states during download.

---

## Phase 4: Verification & Automated Tests

- [x] 4.1 Create unit tests for `PaymentsService.exportPdf()` asserting non-empty PDF buffer generation and multi-currency formatting.
- [x] 4.2 Create unit tests for `PaymentsController.exportPdf()` verifying HTTP 200, response headers, and bad request validations.
- [x] 4.3 Verify end-to-end PDF download in browser across date filters and preset ranges.
- [x] 4.4 Run backend and frontend test suites and linting checks (`npm test`, `npm run lint`).
