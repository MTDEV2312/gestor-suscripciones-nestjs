# Proposal: Fix Missing Data & Multi-Column Layout in PDF Report

## Intent
Ensure all transaction details (Subscription Name, Billing Period, Payment Method, Original Currency Amount, Converted Amount, Status Badge, Notes) render with absolute coordinate precision in the PDF report, matching the complete detail of the CSV export.

## Scope
| Type | Items |
| :--- | :--- |
| **In Scope** | • Replace relative `Td` text operator accumulations with absolute text matrix positioning (`1 0 0 1 x y Tm`) across all PDF tables (Subscription Summary, Monthly Summary, and Transaction Ledger).<br>• Ensure all 7 columns in the transaction ledger (Fecha, Suscripción, Período, Método, Monto Orig., Monto Conv., Estado) render on the visible page canvas.<br>• Display payment notes below transaction rows when present.<br>• Update unit tests to verify full column visibility. |
| **Out of Scope** | • Modifying CSV export structure or frontend download triggers. |

## Capabilities
- **Modified `expense-reports`**: Guarantee full visual rendering and data parity between CSV and PDF report transaction details without coordinate clipping.

## Approach
- In `PaymentsService.exportPdf()`:
  - Implement a dedicated text placement helper `textAt(x, y, font, size, rgb, text)` using `1 0 0 1 x y Tm`.
  - Distribute column widths across the standard A4 printable width (515 pt).
  - Apply absolute coordinate rendering across table headers and table rows.

## Affected Areas
| Area | Impact | Description |
| :--- | :--- | :--- |
| `apps/backend/src/payments/payments.service.ts` | Modified | Use absolute text matrix positioning for all PDF table cells. |
| `apps/backend/src/payments/payments.service.spec.ts` | Modified | Unit tests asserting full column content rendering. |

## Risks & Mitigations
| Risk | Likelihood | Mitigation |
| :--- | :--- | :--- |
| **Text truncation on long names** | Low | Substring trimming and proportional column width allocation. |

## Rollback Plan
Revert changes in `payments.service.ts` to prior commit.

## Success Criteria
- [x] All columns (Fecha, Suscripción, Período, Método, Monto Orig., Monto Conv., Estado) are visible on the generated PDF.
- [x] No text is placed outside page bounds.
- [x] Unit tests pass.
