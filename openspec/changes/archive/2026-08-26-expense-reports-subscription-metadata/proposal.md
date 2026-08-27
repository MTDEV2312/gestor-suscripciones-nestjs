# Proposal: Enhanced Subscription Metadata in PDF Expense Reports

## Intent
Enrich the PDF expense report with complete subscription profile metadata (service name, billing frequency, service type, contracted price, next renewal date, active status) and a dedicated subscription breakdown summary table to give users a comprehensive financial and operational overview of their subscriptions.

## Scope
| Type | Items |
| :--- | :--- |
| **In Scope** | • In multi-subscription reports: Add a "RESUMEN POR SUSCRIPCIÓN" table (Subscription Name, Frequency/Type, Payment Count, Total Paid in original & target currencies, % of total period spend).<br>• In single-subscription filtered reports: Add a highlighted "PERFIL DE SUSCRIPCIÓN" card with contracted regular price, frequency, category type, next renewal date, and active status.<br>• In detailed transaction ledger: Display payment method and notes columns.<br>• Eagerly load `subscription` relation in `PaymentsService.findAll` and `exportPdf`. |
| **Out of Scope** | • Custom drag-and-drop column configurator for PDF exports.<br>• Automatic renewal notifications via email (separate feature). |

## Capabilities
- **Modified `expense-reports`**: Extend PDF document generation requirements to include subscription profile metadata, multi-subscription spending breakdown with budget percentages, and transaction payment methods.

## Approach
- **Backend (`apps/backend`)**:
  - Update `PaymentsService.findAll()` to join `subscription` relation (`leftJoinAndSelect('payment.subscription', 'subscription')`).
  - Update `PaymentsService.exportPdf()`:
    - Group payments by subscription to calculate per-subscription spend, transaction count, and % share of total period expenses.
    - Render "PERFIL DE SUSCRIPCIÓN" when a specific `subscriptionId` is queried.
    - Render "RESUMEN POR SUSCRIPCIÓN" table in multi-subscription reports.
    - Include `payment_method` in the detailed transaction rows.

## Affected Areas
| Area | Impact | Description |
| :--- | :--- | :--- |
| `apps/backend/src/payments/payments.service.ts` | Modified | Join subscription relation, aggregate subscription metrics, and render metadata blocks in PDF. |
| `apps/backend/src/payments/payments.service.spec.ts` | Modified | Unit tests asserting subscription metadata rendering in generated PDF buffers. |

## Risks & Mitigations
| Risk | Likelihood | Mitigation |
| :--- | :--- | :--- |
| **Soft-deleted or null subscription reference** | Low | Fall back gracefully to `payment.subscription_name` snapshot with `N/A` for deleted subscription details. |
| **Page overflow with extra sections** | Low | Dynamic page break algorithm automatically splits sections and renders continuation headers. |

## Rollback Plan
Revert changes in `PaymentsService.exportPdf` to the previous document layout.

## Success Criteria
- [ ] Multi-subscription PDF reports include the "RESUMEN POR SUSCRIPCIÓN" section with spending breakdown and percentage share.
- [ ] Single-subscription PDF reports display the "PERFIL DE SUSCRIPCIÓN" card with type, frequency, price, and renewal date.
- [ ] Payment methods and notes appear in the transaction details.
- [ ] All unit tests pass.
