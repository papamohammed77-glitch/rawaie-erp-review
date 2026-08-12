# TASK-026 — Implementation Notes

## Status
IMPLEMENTATION CANDIDATE — NOT Production-ready until TASK-027 runtime Gold Gate.

## Implementation contract
The new vouchers application must preserve the original user-visible capabilities while moving voucher lifecycle writes to the verified Production Voucher Core RPCs.

## Owner semantics now authoritative
- DirectSale = stock issue to direct-sales Vehicle/Representative custody. It is NOT a final warehouse sale.
- DirectReturn = Vehicle/Representative custody back to MAIN: OUT at SEND, IN at RECEIVE.
- SupplierReturn = MAIN to Supplier: OUT at SEND; no warehouse RECEIVE.
- Transfer = branch/warehouse custody transfer: OUT at SEND, IN at RECEIVE.
- Keep `DirectSale` as the canonical system/database value. `DirectIssue` is terminology only and is NOT a rename in this task.

## Safety boundary
The UI must never manufacture a VAN branch, stock mutation, received_qty update, inventory_log row, or lifecycle state transition. It may resolve existing Production custody records and invoke the authorized core RPCs.

If a required VAN branch/custody record does not exist, the UI must fail clearly and safely rather than create a business record client-side. VAN setup belongs to its dedicated infrastructure task.

## Required lifecycle RPC mapping
- create_manual_stock_voucher_atomic
- send_manual_stock_voucher_v2
- receive_manual_stock_voucher_v2
- complete_manual_stock_voucher_atomic
- cancel_manual_stock_voucher_atomic

## Required UI capabilities retained
Login/logout, warehouse-role gate, pending/completed/account views, listing/search, new-voucher modal, all four voucher types, source/target selection, item search/cart, quantity controls, detail view, send/receive/complete/cancel actions, loading/empty/error states, and connection awareness.

## Gold references
Apply relevant defensive/operational patterns demonstrated by returns.html and picker.html without copying unrelated business logic.

## Gate
TASK-026 is source implementation only. TASK-027 must prove runtime feature parity and the complete voucher lifecycle before production deployment.
