# Tasks: Enhanced Subscription Metadata in PDF Expense Reports

## Review Workload Forecast
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units
| Unit | Description | Est. Lines | PR |
| :--- | :--- | :--- | :--- |
| WU-1 | Eager subscription relation loading & PDF layout enhancement | ~120 | PR 1 |
| WU-2 | Unit test suite updates | ~40 | PR 1 |

---

## Phase 1: Implementation
- [x] 1.1 In `PaymentsService.findAll()`, join `payment.subscription` relation (`leftJoinAndSelect('payment.subscription', 'subscription')`).
- [x] 1.2 In `PaymentsService.exportPdf()`, aggregate per-subscription spend, transaction count, and percentage share.
- [x] 1.3 In `PaymentsService.exportPdf()`, implement "PERFIL DE SUSCRIPCIÓN" card box when filtering by specific subscription.
- [x] 1.4 In `PaymentsService.exportPdf()`, implement "RESUMEN POR SUSCRIPCIÓN" breakdown table in multi-subscription reports.
- [x] 1.5 In `PaymentsService.exportPdf()`, add `payment_method` column to transaction detail ledger table.

---

## Phase 2: Verification & Automated Tests
- [x] 2.1 Update unit tests in `payments.service.spec.ts` asserting subscription metadata rendering in generated PDF buffers.
- [x] 2.2 Run backend tests and build.
