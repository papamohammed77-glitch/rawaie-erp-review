# TASK-026 — Static Audit

## Status
SOURCE IMPLEMENTATION COMPLETE — NOT Production-ready. Runtime Gold Gate remains TASK-027.

## Candidate
`PWA/warehouse/vouchers.task-026.html`

## Verified implementation points
- Uses `RW_Auth` for login/session and enforces the `أذونات` warehouse role for non-owners.
- Loads explicit company context from `app_settings.company_id` and `main_branch_id`.
- Reads only company-scoped branches, suppliers, items, and stock vouchers.
- Keeps the existing canonical voucher values: `Transfer`, `DirectSale`, `DirectReturn`, `SupplierReturn`.
- Implements the owner semantics: DirectSale is MAIN → VAN custody; DirectReturn is VAN → MAIN; SupplierReturn is MAIN → Supplier.
- Uses the verified Production RPC signatures and parameter names for Create, Send, Receive, Complete, and Cancel.
- Uses `received_qty` and remaining quantity in the Partial Receive dialog; client rejects input above remaining quantity before RPC.
- Does not write `stock_branches`, `inventory_log`, `received_qty`, or voucher lifecycle status directly from the UI.
- Does not create VAN branches client-side.
- Preserves Pending / Completed / Account views, listing/search, item search/cart, quantity controls, details, Send, Receive, Complete, and Cancel.

## Known boundary
VAN branch creation/setup is intentionally not embedded in this candidate. If a required `VAN-{email}` custody branch does not exist, the UI fails safely instead of inventing business state. The dedicated VAN setup infrastructure must provide the custody record before DirectSale/DirectReturn can operate for that representative.

## Static conclusion
No deliberate removal of the listed original core capabilities was found in this candidate. The implementation is a controlled replacement of the Voucher lifecycle write path with the verified central RPCs.

## Not yet proven
- Runtime feature parity against every original user-visible behavior.
- DirectSale/DirectReturn using a real Production VAN custody record end-to-end.
- SupplierReturn end-to-end against a real supplier.
- Browser/runtime loading, permissions, error states, and PWA/service-worker behavior.

## Gate
`TASK-026 = SOURCE IMPLEMENTATION COMPLETE / NOT CLOSED`
`TASK-027 = REQUIRED FOR RUNTIME E2E + GOLD PRODUCTION GATE`
