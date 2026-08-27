# Technical Design: Expense Reports PDF and CSV Export

## 1. Overview & Architecture

This design establishes server-side executive PDF generation alongside CSV export for expense reports, extending the `expense-reports` capability. The backend generates styled PDF documents via `pdfmake` and streams them via NestJS, while the frontend provides a format selector dropdown in `Reports.tsx`.

```
[Reports.tsx UI] 
       │
       ▼ (api.ts: downloadReportPdf / downloadReportCsv)
[GET /payments/report/export/pdf?params...]
       │
       ▼
[PaymentsController.exportPdf]
       │
       ▼
[PaymentsService.exportPdf] ──► [CurrencyService.convert]
       │
       ▼
[pdfmake (VFS Fonts + Layout Builder)] ──► Buffer / StreamableFile (application/pdf)
```

---

## 2. Architecture Decisions

| Decision Area | Options Considered | Tradeoffs | Decision |
| :--- | :--- | :--- | :--- |
| **PDF Generation Engine** | 1. Backend `pdfmake`<br>2. Frontend `jspdf`<br>3. Headless Puppeteer | `jspdf` lacks backend API reuse; Puppeteer has high memory/Chromium overhead. `pdfmake` provides lightweight, fast vector rendering with declarative schema. | **Backend `pdfmake`**: Consistent REST API (`/export/pdf`), low memory footprint, deterministic pagination. |
| **Font Distribution** | 1. Local filesystem TTF files<br>2. Embedded VFS `vfs_fonts` | Filesystem paths break in Docker/cloud environments. VFS packages Roboto standard font buffers in memory. | **Virtual File System (`pdfmake/build/vfs_fonts`)**: Zero external filesystem dependencies. |
| **Streaming Mechanism** | 1. Write to temp disk file<br>2. Direct memory Buffer stream | Temp files require cleanup lifecycle; memory Buffer via `@Res({ passthrough: true })` streams directly to HTTP response. | **Direct Buffer Stream**: Clean, stateless, efficient. |
| **Export UI Pattern** | 1. Separate standalone buttons<br>2. Unified dropdown menu | Two separate buttons clutter the top navbar; dropdown provides scalable format selection with icons. | **Dropdown Menu**: "Exportar" trigger with `FileText` (PDF) and `FileSpreadsheet` (CSV) options. |

---

## 3. Backend Implementation Design

### 3.1 Dependencies
- `pdfmake` (`^0.2.18`) and `@types/pdfmake` (`^0.2.11`) added to `apps/backend/package.json`.

### 3.2 PDF Styling Palette & Visual Theme
- **Color Scheme**:
  - Primary Accent: Indigo (`#4F46E5`, `#3730A3`)
  - Secondary / Neutral: Slate (`#1E293B` text, `#64748B` muted, `#F8FAFC` background, `#E2E8F0` borders)
  - Status Badges: PAID (`#10B981` bg: `#D1FAE5`), PENDING (`#D97706` bg: `#FEF3C7`), FAILED (`#DC2626` bg: `#FEE2E2`)
- **Page Setup**: Margin `[36, 36, 36, 40]`, Page Size `A4`, Portrait orientation.
- **Dynamic Footer**: Callback `(currentPage, pageCount)` displaying metadata and `Página ${currentPage} de ${pageCount}` with top divider.

### 3.3 Document Definition Generator
`PaymentsService.exportPdf` executes:
1. Fetch and aggregate report data via existing `getExpenseReport(req, queryDto)`.
2. Build `TDocumentDefinitions` object containing:
   - **Header**: Brand title ("GESTOR DE SUSCRIPCIONES"), document title ("Reporte Ejecutivo de Gastos"), emission metadata, and filter criteria badges.
   - **KPI Summary Cards Table**: 4 column cards (Total Consolidado, Pagos Realizados, Suscripciones Únicas, Desglose Multimoneda).
   - **Monthly Breakdown Table**: Historical spending per billing period (`YYYY-MM`).
   - **Transaction Ledger Table**: Columns: Fecha, Suscripción, Período, Monto Original, Monto Convertido, Método, Estado (color-coded badge).
3. Compile document into `Buffer` via `PdfPrinter` and return stream.

### 3.4 Controller Endpoint
- **Route**: `GET /payments/report/export/pdf`
- **Guards**: `JwtAuthGuard`
- **Response Headers**:
  - `Content-Type`: `application/pdf`
  - `Content-Disposition`: `attachment; filename="reporte-gastos-{startMonth}_{endMonth}.pdf"`
- **Handler Signature**:
  ```typescript
  @Get('report/export/pdf')
  async exportPdf(
    @Query() queryDto: QueryReportDto,
    @Request() req: Request & { user: AuthUser },
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | Buffer>
  ```

---

## 4. Frontend Implementation Design

### 4.1 API Client (`apps/frontend/src/services/api.ts`)
Add `downloadReportPdf(params?: ReportQueryParams): Promise<void>`:
- Authenticated `fetch()` to `/payments/report/export/pdf`.
- Blob extraction, `Content-Disposition` filename parsing, temporary anchor tag dispatch, and object URL revocation.

### 4.2 Format Selector Dropdown (`Reports.tsx`)
- Replace single CSV button with a dropdown:
  - Trigger: `[ Exportar ▾ ]` button (`Download` and `ChevronDown` icons).
  - Menu Items:
    - `Exportar PDF` (`FileText` icon, indicator badge, triggers `handleExportPdf`).
    - `Exportar CSV` (`FileSpreadsheet` icon, triggers `handleExportCsv`).
- Click-outside handler to close the dropdown menu on outside click or escape key.
- Distinct loading spinners and disabled states during download execution.
- Graceful error alert handling on failure.

---

## 5. Verification & Test Plan

1. **Unit Tests**:
   - `PaymentsService`: Validate `exportPdf` returns a non-empty `Buffer` and correctly parses single and multi-currency transactions.
   - `PaymentsController`: Validate headers `Content-Type: application/pdf` and `Content-Disposition` attachment filename.
2. **E2E / Integration Tests**:
   - Verify `GET /payments/report/export/pdf` with active query filters (`startMonth`, `endMonth`, `targetCurrency`, `status`).
   - Test empty report period returns valid zeroed PDF without throwing errors.
   - Test invalid date ranges throw HTTP `400 Bad Request`.
