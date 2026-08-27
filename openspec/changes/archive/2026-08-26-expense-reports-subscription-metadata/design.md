# Technical Design: Enhanced Subscription Metadata in PDF Reports

## 1. Overview & Data Flow
This design defines the integration of subscription entity metadata (frequency, category type, regular price, next renewal date, active status) into the PDF generation engine in `PaymentsService.exportPdf()`.

```
[PaymentsService.exportPdf]
       │
       ├─► LeftJoin subscription relation (frequency, type, price, next_renewal_date, is_active)
       │
       ├─► Aggregate subscription metrics (spend per sub, % of total spend, payment count)
       │
       ├─► IF single subscription filter:
       │     └─► Render "PERFIL DE SUSCRIPCIÓN" card box
       │   ELSE:
       │     └─► Render "RESUMEN POR SUSCRIPCIÓN" breakdown table
       │
       ├─► Render "RESUMEN MENSUAL" table
       │
       └─► Render "DETALLE DE TRANSACCIONES" table with Payment Method column & status badges
```

## 2. Layout Structure & Geometry (A4 Portrait, 595.28 x 841.89 pt)

### 2.1 Single Subscription Filter Mode
- **Metadata Card Box** (`36 645 523 55`):
  - **Suscripción**: Name, Active Badge
  - **Tipo y Frecuencia**: `SUBSCRIPTION | MENSUAL`, etc.
  - **Precio Contratado**: `$15.99 USD / mes`
  - **Próxima Renovación**: `2026-09-15`

### 2.2 Multi-Subscription Summary Mode
- **Table: "RESUMEN POR SUSCRIPCIÓN"**:
  - Columns:
    1. Suscripción (`width: 170 pt`)
    2. Tipo / Frecuencia (`width: 100 pt`)
    3. Pagos Realizados (`width: 80 pt`)
    4. Total Pagado (`width: 100 pt`)
    5. % del Total (`width: 70 pt`)

### 2.3 Detailed Transactions Table
- Columns:
  1. Fecha (`margin + 6`)
  2. Suscripción (`margin + 65`)
  3. Período (`margin + 165`)
  4. Método de Pago (`margin + 225`)
  5. Monto Orig. (`margin + 295`)
  6. Monto Target (`margin + 375`)
  7. Estado Badge (`margin + 455`)

## 3. Unit Tests Plan
- Assert generated PDF contains "PERFIL DE SUSCRIPCIÓN" when `subscriptionId` is queried.
- Assert generated PDF contains "RESUMEN POR SUSCRIPCIÓN" when multi-subscription report is queried.
