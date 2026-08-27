# Specification: Subscription Payments Ledger

## 1. Overview
The `subscription-payments` capability provides an independent financial ledger for tracking individual subscription payment transactions. It maintains immutable historical records, prevents duplicate period payments, and supports quick payment logging.

## 2. Requirements

| ID | Requirement | RFC 2119 | Description |
| :--- | :--- | :--- | :--- |
| **REQ-SP-01** | Payment Record Ledger | **MUST** | Store transactions in `subscription_payments` with `id`, `user_id`, `subscription_id`, `subscription_name`, `amount`, `currency`, `payment_date`, `billing_month`, `billing_year`, `billing_period`, `payment_method`, `status`, and `notes`. |
| **REQ-SP-02** | Snapshot Immutability | **MUST** | Store `subscription_name` snapshot and set foreign key `onDelete: 'SET NULL'` on `subscription_id` so deleting or editing a subscription preserves historical payment records. |
| **REQ-SP-03** | CRUD Endpoints | **MUST** | Provide authenticated endpoints: `POST /payments`, `GET /payments`, `GET /payments/:id`, `PATCH /payments/:id`, and `DELETE /payments/:id`, strictly scoped to the authenticated user. |
| **REQ-SP-04** | Duplicate Detection | **MUST** | Reject creation with `409 Conflict` if a `PAID` record exists for the same `subscription_id` and `billing_period` (`YYYY-MM`), unless `allow_duplicate: true` is explicitly provided. |
| **REQ-SP-05** | Quick-Pay Action | **SHOULD** | Provide a "Registrar Pago" button on subscription cards/rows that opens a pre-filled payment modal. |

## 3. Scenarios

### Scenario 1: Create a manual payment transaction (Happy Path)
- **Given** an authenticated user and an active subscription with ID `sub-123`, price `15.99`, and currency `USD`
- **When** the user sends `POST /payments` with `subscription_id: "sub-123"`, `amount: 15.99`, `currency: "USD"`, `billing_month: 8`, `billing_year: 2026`, and `status: "PAID"`
- **Then** the system MUST persist the payment with `billing_period: "2026-08"` and snapshot `subscription_name`
- **And** return HTTP `201 Created` with the payment payload.

### Scenario 2: Reject duplicate payment without override flag (Conflict)
- **Given** an existing `PAID` payment for `subscription_id: "sub-123"` with `billing_year: 2026` and `billing_month: 8`
- **When** the user sends `POST /payments` for the same subscription and period with `allow_duplicate: false` or omitted
- **Then** the system MUST return HTTP `409 Conflict` with error message `"Ya existe un pago registrado para este período"`
- **And** no duplicate record SHALL be created.

### Scenario 3: Allow duplicate payment with explicit override (Edge Case)
- **Given** an existing `PAID` payment for `subscription_id: "sub-123"` in period `2026-08`
- **When** the user sends `POST /payments` with the same period and `allow_duplicate: true`
- **Then** the system MUST create the second payment record and return HTTP `201 Created`.

### Scenario 4: Preserve payment ledger upon subscription deletion (Data Integrity)
- **Given** payments linked to subscription `sub-123` with snapshot `subscription_name: "Netflix"`
- **When** subscription `sub-123` is deleted
- **Then** the payment records MUST persist with `subscription_id: null` and retain `subscription_name: "Netflix"`.

### Scenario 5: Unauthorized payment access attempt (Security)
- **Given** a payment belonging to User A
- **When** User B sends `GET /payments/:id` or `PATCH /payments/:id` for User A's payment ID
- **Then** the system MUST return HTTP `404 Not Found` or `403 Forbidden` without modifying or exposing data.
