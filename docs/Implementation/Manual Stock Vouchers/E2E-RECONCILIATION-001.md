# Manual Stock Vouchers — E2E Reconciliation 001

**Target:** Manual Stock Vouchers
**Branch:** `rescue/manual-vouchers-inventory-core`
**Production Release:** `20260810_manual_voucher_core_v1_RELEASE.sql` already executed successfully.
**Current status:** `BLOCKED — APPLICATION CONTRACT FIX REQUIRED`

## Verified path

`vouchers.html → Edge Function → manual-voucher-rules.ts → post_manual_stock_voucher_atomic → stock_branches + inventory_log + stock_voucher_details/status`

## Findings

### Finding 001 — Create UI does not supply valid endpoints

`PWA/warehouse/vouchers.html` currently submits:

- `fromType: Branch`
- `fromId: 'MAIN'`
- `toType: Branch`
- `toId: ''`

The current server contract requires actual UUID branch IDs and validates that the branches belong to the current company. Therefore the current UI cannot reliably create the supported voucher types.

**Decision:** FIX REQUIRED in the application layer. Do not weaken the Edge Function/RPC contract to accommodate the UI.

### Finding 002 — Receive button sends an empty receipt payload

The current list-level receive action calls `receive-stock-voucher` with `receivedItems: []`, while the Edge Function explicitly requires a non-empty received item list.

**Decision:** FIX REQUIRED in the application layer. The UI must collect actual receipt quantities and submit them. Partial receipt must remain supported.

### Finding 003 — Sent status action is not type-aware

The current UI presents a generic `استلام` action for all `Sent` vouchers. However:

- `Transfer` and `DirectReturn` require RECEIVE and may then reach `Received`.
- `DirectSale` and `SupplierReturn` do not perform RECEIVE; they complete from `Sent` to `Completed`.

**Decision:** FIX REQUIRED in the application layer. The action shown for a `Sent` voucher must follow the voucher lifecycle type.

### Finding 004 — Branch/vehicle endpoint semantics must remain server-validated

For `DirectSale`, the source is a real warehouse branch and the destination is the vehicle/holding branch. For `DirectReturn`, the direction is reversed. The UI must select/resolve real branch UUIDs; it must not invent IDs such as `MAIN`.

The existing server-side endpoint validation and company ownership checks are correct and must not be weakened.

## Explicit non-findings

The following are **not reopened** by this review:

- V1 remains one company with multiple branches/users.
- `company_id` remains for future extensibility.
- Existing Owner Control Plane remains untouched.
- RLS is not being redesigned.
- `DirectSale` OUT + IN represents movement of stock from the source warehouse to the vehicle/holding branch and is retained unless new evidence contradicts the business contract.
- The Production release is not being rolled back.
- No new test/business data is required.

## Required implementation outcome

The application layer must be corrected so that:

1. voucher endpoints are real UUIDs selected from authoritative branch/supplier data;
2. DirectSale can target an actual vehicle/holding branch;
3. DirectReturn can source from an actual vehicle/holding branch;
4. Transfer supports branch-to-branch selection;
5. SupplierReturn supports branch-to-supplier selection;
6. receive UI collects per-item quantities, including partial receipts;
7. Sent actions are lifecycle-aware;
8. the Edge Functions and central RPC remain the integrity boundary;
9. no database/RLS relaxation is introduced to compensate for UI defects.

## Next action

Repair `PWA/warehouse/vouchers.html` as one coherent application-layer change, then perform one consolidated static/E2E review against the already-deployed RPC contract. No additional Production SQL is requested at this point.
