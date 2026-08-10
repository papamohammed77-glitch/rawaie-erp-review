# Manual Stock Vouchers — E2E Reconciliation 002

## Status
BRANCH IMPLEMENTATION — NOT FOR PRODUCTION YET

## Scope
Close the remaining compatibility gap between `PWA/warehouse/vouchers.html` and the deployed manual-voucher inventory core without weakening the database contract.

## Findings and actions

### 1. Legacy `MAIN` branch code in the current UI
The current vouchers UI sends `fromId: 'MAIN'`, while the database contract requires a UUID branch id.

**Action taken:** `create-stock-voucher` now resolves `MAIN` server-side to the current company's `branches.id`. The RPC contract remains UUID-only.

### 2. DirectSale destination is omitted by the current UI
The current UI sends an empty destination for `DirectSale`.

**Action taken:** `create-stock-voucher` resolves the authenticated user's vehicle holding branch as `VAN-{user.email}` server-side when the DirectSale destination is omitted. This preserves the vehicle-as-temporary-branch model and prevents the client from selecting an arbitrary vehicle branch.

### 3. DirectReturn endpoints are omitted by the current UI
The current UI does not provide the vehicle branch and MAIN destination explicitly.

**Action taken:** `create-stock-voucher` resolves the authenticated user's `VAN-{user.email}` branch as the DirectReturn source and MAIN as its destination when omitted.

### 4. Receive action sends an empty item list
The current UI calls `receive-stock-voucher` with `receivedItems: []`.

**Action taken:** `receive-stock-voucher` now treats an empty list as "receive all remaining quantities" calculated server-side from `qty - received_qty`. This is safe because the server derives the remaining amount and the atomic RPC still enforces the remaining balance.

## Important non-actions

- No Production SQL was changed.
- No migration was added for these compatibility fixes.
- No RLS policy was weakened or disabled.
- No Company Context architecture was redesigned.
- No test/business data was inserted.
- The central `post_manual_stock_voucher_atomic` contract was not weakened.

## Remaining E2E UI issue
`PWA/warehouse/vouchers.html` still exposes a generic `Receive` button for every `Sent` voucher. The backend correctly rejects RECEIVE for `DirectSale` and `SupplierReturn`, because those types complete without an inbound stock operation. The UI should be aligned so that:

- `Transfer` / `DirectReturn` → Receive
- `DirectSale` / `SupplierReturn` → Complete

The final UI change must also provide explicit branch/supplier endpoints for Transfer/SupplierReturn instead of relying on hidden defaults.

## Release rule
Do not deploy the branch changes above until the UI alignment is complete and the full E2E path has been reviewed once.
