# Tasks: Fix Missing Data & Multi-Column Layout in PDF Report

## Review Workload Forecast
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units
| Unit | Description | Est. Lines | PR |
| :--- | :--- | :--- | :--- |
| WU-1 | Fix PDF text coordinate positioning with `textAt` helper | ~90 | PR 1 |
| WU-2 | Update automated unit tests | ~30 | PR 1 |

---

## Phase 1: Implementation
- [x] 1.1 Implement `textAt(x, y, font, size, rgb, text)` helper with `1 0 0 1 x y Tm` in `PaymentsService.exportPdf()`.
- [x] 1.2 Update "INFORMACION DE LA SUSCRIPCION" profile card to use `textAt`.
- [x] 1.3 Update "RESUMEN POR SUSCRIPCION" table headers and row items to use `textAt`.
- [x] 1.4 Update "RESUMEN MENSUAL" table headers and row items to use `textAt`.
- [x] 1.5 Update "DETALLE DE TRANSACCIONES Y PAGOS" table headers and row items to use `textAt` for all 7 columns + notes.

---

## Phase 2: Verification & Automated Tests
- [x] 2.1 Update unit tests asserting that all column values (Fecha, Suscripción, Período, Método, Monto Orig, Monto Conv, Estado) appear in generated PDF buffer.
- [x] 2.2 Run backend unit tests and build.
