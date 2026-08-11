# MORAD — HUSSEIN PHASE 1 REVIEW

## ACCEPTED

### A-001 — COMPLETE RPC / Production Schema mismatch
**ACCEPTED.**

Hussein correctly identifies a live contract mismatch: the proven Production `stock_vouchers` columns do not include `completed_by`, while the deployed `complete_manual_stock_voucher_atomic(uuid,text,text)` writes `completed_by`. The Current COMPLETE Edge Function calls that RPC rather than writing the field itself. This is a genuine Schema/RPC discrepancy, not merely a test-harness issue.

### A-002 — Production SEND/RECEIVE atomic boundary
**ACCEPTED, within the proven scope.**

Hussein correctly records that the Current SEND and RECEIVE paths delegate the inventory mutation to `post_manual_stock_voucher_atomic`, and that the deployed POST contract locks the voucher/stock rows, mutates `stock_branches.qty`, writes `inventory_log`, and updates `received_qty` for RECEIVE. The claim should remain limited to the deployed behavior actually evidenced; it does not establish global Inventory idempotency.

### A-003 — DirectSale Target conflict
**ACCEPTED.**

The report correctly preserves the conflict between Current/Production SEND behavior and the unreleased migration rather than silently choosing the migration as Target. This is a genuine Target decision boundary.

### A-004 — DirectReturn Target conflict
**ACCEPTED.**

The report correctly identifies the conflict between Current/Production RECEIVE behavior and the unreleased migration. No unsupported Target conclusion is made.

### A-005 — No patch before reconciliation
**ACCEPTED.**

The report correctly keeps implementation blocked until the lifecycle, schema, RPC, audit, and Target contracts are reconciled.

### A-006 — CANCEL evidence gap
**ACCEPTED.**

The report is correct not to claim CANCEL behavior from the Current Edge Function alone. The deployed RPC definition is required before its state, stock, log, audit, failure, and replay behavior can be classified as proven.

---

## REJECTED

### R-001 — "Current CREATE resolves DirectSale to the user's VAN branch"
**REJECTED AS OVERBROAD.**

Hussein states that Current CREATE resolves DirectSale to `MAIN → VAN-<user.email>`. The Current implementation only applies that default when `toId` is omitted. A caller-supplied `toId` is resolved and retained. The same qualification applies symmetrically to DirectReturn when `fromId` is supplied.

This matters because a default endpoint is not equivalent to an authoritative custody rule.

### R-002 — "Normal duplicate RECEIVE is blocked by Sent/remaining-quantity rules"
**REJECTED AS AN IDEMPOTENCY CLAIM.**

The report labels duplicate/full RECEIVE as statically blocked, but this is not sufficient for partial RECEIVE. After a successful partial RECEIVE the voucher remains `Sent`, so another valid RECEIVE request remains admissible. The status gate therefore does not itself establish request/event idempotency.

No proven request/event identity or unique movement identity for RECEIVE is established in the report. This is a blocker, not a proven duplicate-movement incident.

### R-003 — "Every actual movement inserts inventory_log" as a complete lifecycle guarantee
**REJECTED AS TOO BROAD.**

The claim is supported for the evidenced POST movement path, but Hussein's Production Contract later uses lifecycle-wide language. CREATE/COMPLETE/CANCEL effects are not all proven by the same evidence. The claim must remain scoped to the deployed POST definition and not be generalized to the whole lifecycle.

---

## ADDITIONAL BLOCKERS

### B-001 — Partial RECEIVE replay/idempotency remains unresolved

**Evidence:** Current RECEIVE permits partial receipt and leaves the voucher in `Sent` until all quantities are received. The reviewed evidence does not establish a request/event idempotency key or equivalent unique movement identity.

**Why this blocks:** A status check alone cannot distinguish a retry of the same partial event from a legitimate subsequent partial event.

**Impact:** Duplicate stock movement and duplicate `inventory_log` entries remain unproven against retry/replay.

### B-002 — DirectSale custody authority remains unresolved

**Evidence:** Current CREATE applies the user's VAN as a default only when `toId` is omitted.

**Why this blocks:** If Target custody requires the authenticated user's VAN branch, the current endpoint contract is weaker than that rule.

**Impact:** A caller-supplied destination can potentially select another valid branch unless the authoritative Target explicitly permits that behavior.

### B-003 — DirectReturn custody authority remains unresolved

**Evidence:** Current CREATE applies the user's VAN as a default only when `fromId` is omitted.

**Why this blocks:** The same distinction exists between a default and an enforced custody owner.

**Impact:** A caller-supplied source can potentially select another valid branch unless Target explicitly permits it.

### B-004 — Manual Voucher type universe is not fully reconciled

**Evidence:** The Manual Voucher architecture document lists `Transfer, DirectSale, DirectReturn, SupplierReturn, Scrap, Adjustment`, while Current shared lifecycle rules support four types only.

**Why this blocks:** A complete lifecycle contract cannot be declared closed while the status of Scrap and Adjustment remains unresolved.

### B-005 — Production Audit contract remains incomplete

**Evidence:** The architecture documents `audit_log` as the general audit layer, but the reviewed Manual Voucher evidence does not prove that COMPLETE/CANCEL create authoritative audit rows or otherwise capture the actor in an authoritative location.

**Why this blocks:** The `completed_by` discrepancy cannot safely be resolved by adding a column merely to satisfy the deployed RPC.

### B-006 — Production schema contract is incomplete for the whole lifecycle

**Evidence:** The available schema evidence proves selected columns but does not prove the complete schema of every table referenced by all Manual Voucher RPCs.

**Why this blocks:** A Production Contract cannot be treated as complete while referenced tables/columns remain unproven.

### B-007 — Van Sales end-to-end remains unproven in this review

**Evidence:** The Phase-1 material requires review of `van-sales.html` and all related functions for MAIN → VAN, VanSale, Return, and Unload, but the complete code/evidence set was not established in the reviewed Hussein contract.

**Why this blocks:** No conclusion can safely be made about duplicate MAIN/VAN deduction from the current contract alone.

---

## REQUIRED EVIDENCE

### E-001 — Complete deployed `post_manual_stock_voucher_atomic` definition

**WHY:** The Production Contract relies on its detailed locking, validation, movement, received-quantity, status, and replay behavior.

**WHAT:** Exact deployed definition of `post_manual_stock_voucher_atomic`.

**EXPECTED OUTPUT:** Complete function definition and signature sufficient to verify every claimed behavior, including any replay/idempotency protection.

### E-002 — Complete deployed COMPLETE and CANCEL definitions

**WHY:** COMPLETE is the source of the proven `completed_by` mismatch, while CANCEL remains materially UNKNOWN.

**WHAT:** Exact deployed definitions of `complete_manual_stock_voucher_atomic` and `cancel_manual_stock_voucher_atomic`.

**EXPECTED OUTPUT:** Full definitions including status checks, locks, writes, transaction boundary, and audit behavior.

### E-003 — Production audit path

**WHY:** The correct resolution of `completed_by` depends on the authoritative Audit Contract, not on suppressing the immediate RPC/schema mismatch.

**WHAT:** Production triggers and trigger-function definitions affecting `stock_vouchers`, `stock_voucher_details`, and `audit_log`, plus any directly responsible deployed audit function.

**EXPECTED OUTPUT:** Evidence showing whether COMPLETE/CANCEL actor evidence is automatically captured and where the authoritative record resides.

### E-004 — Production RPC privilege contract

**WHY:** SECURITY DEFINER RPCs require verification of who can execute them and whether the Edge authorization boundary is the intended gate.

**WHAT:** Production execution privileges and SECURITY DEFINER status for the Manual Voucher RPC set.

**EXPECTED OUTPUT:** One authoritative record per RPC showing identity arguments, `prosecdef`, and EXECUTE privileges.

### E-005 — Complete Van Sales evidence set

**WHY:** The Phase-1 contract cannot close the MAIN → VAN / VanSale / Return / Unload question without the actual application and function paths.

**WHAT:** Complete `van-sales.html` plus every Edge Function actually invoked by its stock-affecting paths, together with the relevant deployed RPC definitions.

**EXPECTED OUTPUT:** Evidence sufficient to determine whether one Van Sale causes one and only one VAN stock deduction and whether Return/Unload produce their intended movements.

### E-006 — Production inventory-log schema contract

**WHY:** The architecture documentation describes `inventory_log` with a `branch_id`, while the reviewed Production schema evidence does not prove that column.

**WHAT:** Complete Production `inventory_log` column inventory.

**EXPECTED OUTPUT:** Authoritative column list sufficient to classify the documentation/schema discrepancy without inference.

---

**REVIEW POSITION:** The core Production findings in Hussein's report are accepted, but the report cannot be treated as a closed contract because the additional blockers above remain unresolved.

**No SQL, Patch, Migration, or Production change performed by this review.**
