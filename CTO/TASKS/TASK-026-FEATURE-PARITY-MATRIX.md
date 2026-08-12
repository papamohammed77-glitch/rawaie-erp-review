# TASK-026 — vouchers.html Feature Parity Matrix

## Status
IMPLEMENTATION IN PROGRESS — candidate remains quarantined until static audit and runtime E2E.

| Capability | Original | Target / Owner Contract | Candidate Direction | Gate |
|---|---|---|---|---|
| Authentication / logout | Present | Preserve | Preserve `RW_Auth` flow | Runtime |
| Active warehouse-role enforcement | Present | Preserve | Preserve vouchers role gate | Runtime |
| Pending / Completed / Account tabs | Present | Preserve | Preserve | Runtime |
| Voucher listing / search | Present | Preserve | Preserve; read contract must remain company-safe | Static + Runtime |
| New voucher creation | Present | RPC-driven | `create_manual_stock_voucher_atomic` | Runtime |
| Transfer | Present | Branch → Branch; OUT at Send, IN at Receive | Central movement engine | Runtime |
| DirectSale | Present | MAIN/Branch → mobile VAN/Representative custody; NOT final warehouse sale | Central movement engine; keep canonical value `DirectSale` | Runtime |
| DirectReturn | Present | Vehicle/Representative → MAIN; OUT at Send, IN at Receive | Central movement engine | Runtime |
| SupplierReturn | Present | MAIN → Supplier; OUT at Send; no warehouse Receive | Central movement engine | Runtime |
| Item search / cart | Present | Preserve | Preserve | Runtime |
| Quantity increment / decrement | Present | Preserve | Preserve | Runtime |
| Voucher details | Present | Preserve | Use voucher ID/detail relation correctly | Static + Runtime |
| Send | Present | Must use central stock engine | `send_manual_stock_voucher_v2` | Production E2E |
| Partial Receive | Legacy behavior existed but was unsafe | Cumulative received_qty; remaining tracked; over-receive rejected | `receive_manual_stock_voucher_v2` | Production E2E |
| Full Receive | Present | Received only when received_qty = qty | RPC contract | Production E2E |
| Complete | Present | Lifecycle-only; no stock movement | `complete_manual_stock_voucher_atomic` | Production E2E |
| Cancel | Present in target lifecycle | Draft only; no stock/log mutation; post-Send rejected | `cancel_manual_stock_voucher_atomic` | Production E2E |
| Account view | Present | Preserve | Preserve | Runtime |
| Connection status | Present | Preserve | Preserve | Runtime |
| `RW_API` / legacy Edge Function use | Original architecture | Remove business-write dependency from voucher UI | Direct RPC for lifecycle; legacy functions remain only until migration gate | Static |
| Company context | Historical UI had implicit/fixed assumptions | Production company context must be explicit | `app_settings.company_id` reconciliation | Static + Runtime |
| Branch resolution | Present | Must reflect owner-approved custody semantics | No UI-level business invention | Static + Runtime |
| DirectIssue terminology | Historical/alternative term exists | Do not rename system value during TASK-026 | Keep `DirectSale` canonical | Static |
| Gold UI patterns | Reference benchmark | Preserve quality patterns where relevant | Apply defensive auth/loading/error/state practices from `returns.html` and `picker.html` | Static |

## Blocking rules
- No feature may be marked `PRESERVED` solely because a function name still exists.
- No feature may be marked `CLOSED` until runtime proof exists.
- No Production deployment from the quarantined candidate.
- Do not rename `DirectSale` to `DirectIssue` in TASK-026.

## TASK-026 implementation principle
Use the original `vouchers.html` as the functional baseline, preserve user-visible capability, and replace only the distributed voucher business-write paths with the already-verified Voucher Core RPCs. Avoid broad rewrites unrelated to the Voucher lifecycle.
