# Specification Delta: Fix Missing Data & Multi-Column Layout in PDF Report

## 1. Overview
Ensures complete data fidelity between CSV exports and PDF reports by resolving coordinate accumulation bugs in PDF text rendering and rendering all transaction fields within visible page boundaries.

## 2. Requirements Delta

### MODIFIED Requirements

| ID | Requirement | RFC 2119 | Description |
| :--- | :--- | :--- | :--- |
| **REQ-ER-06** | Executive PDF Export Generation | **MUST** | Provide endpoint `GET /payments/report/export/pdf` returning `StreamableFile` with `application/pdf`. The transaction ledger in the PDF document MUST visibly render all 7 core columns on the page canvas using absolute text matrix positioning: Fecha, Suscripción, Período, Método de Pago, Monto Original con moneda, Monto Convertido con divisa destino, y Estado con badge de color. Notas adicionales MUST be rendered without clipping. |

## 3. Scenarios

### Scenario 1: Verify all 7 columns in transaction ledger (Happy Path)
- **Given** an authenticated user with multiple subscription payments
- **When** the user sends `GET /payments/report/export/pdf?startMonth=2026-08&endMonth=2026-08&targetCurrency=USD`
- **Then** the PDF document MUST contain text elements for Fecha (`2026-08-15`), Suscripción (`Netflix`), Período (`2026-08`), Método (`Credit Card` / `Tarjeta`), Monto Original (`$15.99 USD`), Monto Convertido (`$15.99`), and Estado (`PAGADO`) all positioned between page margins `[40, 555] pt`.
