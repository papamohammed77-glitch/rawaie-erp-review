# TASK-026 — vouchers.html Feature Parity Matrix

## Status
IMPLEMENTATION IN PROGRESS — candidate remains quarantined until static audit and runtime E2E.

| Capability | Original | Target / Owner Contract | Candidate Direction | Gate |
|---|---|---|---|---|
| Authentication / logout | Present | Preserve | Preserve `RW_Auth` flow | Runtime |
| Active warehouse-role enforcement | Present | Preserve | Preserve vouchers role gate | Runtime |
| Pending / Completed / Account tabs | Present | Preserve | Preserve | Runtime |
| Voucher listing / search | Present | Preserve | Preserve; company scope required | Static + Runtime |
| New voucher creation | Present | RPC-driven | `create_manual_stock_voucher_atomic` | Runtime |
| Transfer | Present | Branch → Branch; OUT at Send, IN at Receive | Central movement engine | Runtime |
| DirectSale | Present | MAIN/Branch → mobile VAN/Representative custody; NOT final warehouse sale | Central movement engine; keep canonical value `DirectSale` | Runtime |
| DirectReturn | Present | Vehicle/Representative → MAIN; OUT at Send, IN at Receive | Central movement engine | Runtime |
| SupplierReturn | Present | MAIN → Supplier; OUT at Send; no warehouse Receive | Central movement engine | Runtime |
| Item search / cart | Present | Preserve | Preserve | Runtime |
| Quantity increment / decrement | Present | Preserve | Preserve | Runtime |
| Voucher details | Present | Preserve | Use voucher ID/detail relation correctly | Static + Runtime |
| Send | Present | Must use central stock engine | `send_manual_stock_voucher_v2` | Production E2E |
| Partial Receive | Legacy behavior existed but was unsafe | Cumulative `received_qty`; remaining tracked; over-receive rejected | `receive_manual_stock_voucher_v2` | Production E2E |
| Full Receive | Present | Received only when `received_qty = qty` | RPC contract | Production E2E |
| Complete | Present | Lifecycle-only; no stock movement | `complete_manual_stock_voucher_atomic` | Production E2E |
| Cancel | Present in target lifecycle | Draft only; no stock/log mutation; post-Send rejected | `cancel_manual_stock_voucher_atomic` | Production E2E |
| Account view | Present | Preserve | Preserve | Runtime |
| Connection status | Present | Preserve | Preserve | Runtime |
| Legacy Edge Function writes | Original architecture | Remove voucher business-write dependency from UI | Direct RPC for lifecycle | Static |
| Company context | Historical UI had implicit assumptions | Explicit Production company context | `app_settings.company_id` | Static + Runtime |
| Branch resolution | Present | Must reflect owner-approved custody semantics | Resolve existing Production custody only | Static + Runtime |
| DirectIssue terminology | Historical alternative term | Do not rename system value in TASK-026 | Keep `DirectSale` canonical | Static |
| Gold UI patterns | Reference benchmark | Preserve relevant defensive patterns | Apply appropriate auth/loading/error/state handling | Static |

## Blocking rules
- No feature is certified by function-name presence alone.
- No feature is closed without runtime proof.
- No Production deployment from the candidate before TASK-027.
- No client-side creation of a VAN branch or direct mutation of inventory/lifecycle fields.
- No rename of `DirectSale` to `DirectIssue` in this task.

## Historical owner context
Historical architecture documentation explicitly described the VAN as a mobile branch/custody container and `vouchers.html` as the tool that establishes, transfers, and returns that custody. The owner's current DirectSale clarification is the authoritative semantic correction.
