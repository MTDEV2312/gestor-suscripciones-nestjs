# Proposal: Expense Reports PDF and CSV Export

## Intent
Enable users to export expense and payment reports in either **PDF** or **CSV** format directly from the Reports interface, featuring a highly readable, visually attractive, executive-ready PDF report design reflecting active filters and currency conversions.

## Scope
| Type | Items |
| :--- | :--- |
| **In Scope** | • Backend PDF generation endpoint `GET /payments/report/export/pdf` via `pdfmake`.<br>• Executive PDF layout with header branding, KPI summary cards, monthly breakdown table, detailed transactions table with color-coded status badges, and dynamic footer pagination (`Página X de Y`).<br>• Frontend format selector (Dropdown menu with PDF and CSV options) in `Reports.tsx` with loading indicators.<br>• Frontend API client method `downloadReportPdf` in `api.ts`. |
| **Out of Scope** | • User-customizable drag-and-drop PDF template builder.<br>• Scheduled email dispatch of PDF reports (separate feature). |

## Capabilities
- **Modified `expense-reports`**: Add PDF export format selection alongside existing CSV export, with executive visual document formatting and multi-currency metrics.

## Technical Approach
- **Backend (`apps/backend`)**:
  - Install `pdfmake` and `@types/pdfmake`.
  - Implement `exportPdf()` in `PaymentsService` creating a structured `pdfmake` document definition (header, metadata, KPI cards, tables with styling/zebra rows, status badges, page numbering).
  - Expose `GET /payments/report/export/pdf` in `PaymentsController` returning `application/pdf` buffer stream.
- **Frontend (`apps/frontend`)**:
  - Add `api.payments.downloadReportPdf(params)` in `api.ts` handling binary blob download and dynamic filename extraction.
  - Update `Reports.tsx` header with an Export dropdown menu offering "Exportar PDF" (`FileText` icon) and "Exportar CSV" (`FileSpreadsheet` icon), respecting active date/subscription/status/currency filters.

## Affected Areas
- `apps/backend/package.json` — Add `pdfmake` & `@types/pdfmake`.
- `apps/backend/src/payments/payments.controller.ts` — Add PDF export endpoint.
- `apps/backend/src/payments/payments.service.ts` — Implement PDF generation logic.
- `apps/frontend/src/services/api.ts` — Add `downloadReportPdf` API helper.
- `apps/frontend/src/pages/Reports.tsx` — Add export format selector & handlers.

## Risks & Mitigations
| Risk | Mitigation |
| :--- | :--- |
| **Font bundling in Node.js** | Use standard virtual file system Roboto fonts (`pdfmake/build/vfs_fonts.js`). |
| **Memory usage on large reports** | Stream response buffer directly and reuse existing optimized query logic. |
| **Mobile UX for dropdown** | Accessible dropdown menu with click-outside detection and responsive layout. |

## Rollback Plan
1. Remove `pdfmake` from `apps/backend/package.json`.
2. Remove `GET /payments/report/export/pdf` route and `exportPdf()` service method.
3. Revert `Reports.tsx` and `api.ts` to single CSV export action.

## Success Criteria
- [ ] Users can export reports in PDF or CSV format from `Reports.tsx`.
- [ ] `GET /payments/report/export/pdf` generates a clean, styled multi-page PDF matching active filters.
- [ ] PDF includes branding, KPI cards, monthly breakdown, formatted transactions table, and footer page numbering.
- [ ] Backend and frontend test/build suites pass.
