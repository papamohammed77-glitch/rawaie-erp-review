# TASK-INV-003 — INVENTORY FINALIZATION: EVIDENCE → SOLUTION → EXECUTION PLAN

Branch: `rescue/manual-vouchers-inventory-core`
Role: Hussein — Lead Analyst / Evidence Owner
Mode: Evidence-first / no patch / no production change

## 1. SCOPE AND EVIDENCE BASE

TASK-INV-003 requires the current Phase 1/2 findings to be converted into executable solutions without performing the patch.

Repository review confirms TASK-INV-002 is the latest accessible Hussein Inventory reconciliation report. No separate Phase-2 Hussein report was found in the branch during this task. Therefore this report treats TASK-INV-002 as the latest completed reconciliation evidence and does not invent a Phase-2 result.

The active architectural constraints require reconciliation across Architecture, security, authorization, source-of-truth, workflow, Production schema evidence, equivalent functions/applications and historical warnings before changing a finding. Inventory-changing business events must be atomic where the Target requires atomicity, and inventory mutations must converge toward one central controlled inventory engine. Evidence classifications are PROVEN, STATIC ONLY, KNOWN / ARCHITECTURAL REVIEW REQUIRED, UNKNOWN and TARGET DECISION REQUIRED.

## 2. BLOCKER STATUS

| Blocker | Current state | Class | Resolution path |
|---|---|---|---|
| COMPLETE writes `completed_by` absent from Production schema | Confirmed | P0 / PROVEN | Resolve Audit Contract first; then make COMPLETE RPC conform to the chosen existing audit contract. Do not add the column merely to satisfy the RPC. |
| DirectSale Target semantics | Unresolved | P0 / TARGET DECISION REQUIRED | CTO must choose the custody/movement contract. Current Production behavior is OUT-only at SEND; migration OUT+IN is not authoritative. |
| DirectReturn Target semantics | Unresolved | P0 / TARGET DECISION REQUIRED | CTO must choose the custody/movement contract. Current Production behavior is IN-only at RECEIVE; migration OUT+IN is not authoritative. |
| Partial RECEIVE replay/idempotency | Not proven | P0 / STATIC ONLY | Prove current behavior with self-cleaning validation, then add operation identity/idempotency only if Target requires it. |
| CANCEL exact deployed behavior | Unknown | P1 / UNKNOWN | Obtain exact deployed RPC body as SQL evidence. No behavioral assumption from function name or Original. |
| DirectSale/DirectReturn custody ownership when caller supplies endpoint IDs | Not proven | P1 / STATIC ONLY + TARGET DECISION REQUIRED | Target must define whether VAN ownership is mandatory. If mandatory, enforce the authenticated user's permitted VAN at the authoritative business boundary, not only as a CREATE default. |
| `inventory_log.branch_id` documentation vs Production schema | Confirmed discrepancy | P1 / PROVEN | Reconcile the documented contract with the actual Production audit representation. Do not add `branch_id` until an explicit Target/audit decision establishes that it is required. |
| Van Sales end-to-end duplicate deduction | Unknown | P1 / UNKNOWN | Complete Van Sales evidence review and validation before declaring Inventory release-safe. |

## 3. BLOCKER 1 — COMPLETE / `completed_by`

### Facts

Current COMPLETE Edge Function selects `id,type,status`, checks the expected status, then calls `complete_manual_stock_voucher_atomic(companyId,voucherCode,user.email)`. The deployed COMPLETE definition is proven to attempt `completed_by=p_user_email`, while Production `stock_vouchers` evidence does not contain `completed_by`.

### Root cause
The deployed database procedure and the deployed Production table contract are inconsistent on the COMPLETE audit field.

### Corrective solution
Do NOT add `completed_by` simply because the RPC writes it.

First reconcile the Audit Contract and identify the authoritative existing actor/audit representation for COMPLETE. The safe solution branches are:

A. If the established Audit Contract requires an actor field on `stock_vouchers`, the schema/RPC contract must be changed together under explicit CTO authorization.

B. If the established Audit Contract stores the actor elsewhere and `stock_vouchers` only owns lifecycle state/time, remove the `completed_by` write from the atomic COMPLETE primitive and preserve the actor through the authoritative audit mechanism.

The choice cannot be made from the current evidence alone. Therefore the exact evidence needed is:
- Production schema for all COMPLETE-related audit columns on `stock_vouchers`;
- deployed definition of `complete_manual_stock_voucher_atomic` in full;
- Audit Contract / audit-log schema and deployed write path used by COMPLETE;
- any current persisted evidence proving how `created_by`, `sent_by`, `received_by`, `completed_by` or equivalent actor identity is represented.

### Patch scope after CTO decision
Only the authoritative COMPLETE primitive and its directly required schema/audit contract should be changed. The Edge Function should remain an API/authentication/status-validation adapter unless reconciliation proves it also violates the Target.

## 4. BLOCKER 2 — DIRECTSALE TARGET

### Proven current behavior
`manual-voucher-rules.ts` classifies DirectSale as `OUTBOUND_ON_SEND`. `buildSendEffects` creates one OUT effect at `voucher.from_id`. Current CREATE defaults missing `fromId` to `MAIN` and missing `toId` to `VAN-<authenticated user email>`, but caller-supplied `toId` is retained.

TASK-INV-002 also proves current Production POST semantics perform DirectSale SEND as OUT-only; the unreleased migration model differs by including a destination IN effect.

### Corrective solution
Do not merge the two models implicitly.

The preferred reconciliation path is to define the Target explicitly as one of:

A. **Single authoritative physical movement:** Warehouse/Branch OUT at SEND, with the VAN custody represented by the destination/custody relationship rather than a second physical mutation in the same event.

B. **Two stock mutations:** OUT at source and IN at VAN at SEND, with both mutations owned by one atomic business operation.

The current Production contract proves A-like behavior, while migration code proves only that B was once contemplated. Migration is not sufficient evidence to select B.

### Decision gate
CTO must choose A or B before implementation. If A is selected, preserve the single OUT movement and make custody ownership explicit at the authoritative validation boundary. If B is selected, the atomic primitive must own both legs and the resulting inventory/audit semantics must be proven against stock truth and movement history before implementation.

## 5. BLOCKER 3 — DIRECTRETURN TARGET

### Proven current behavior
`manual-voucher-rules.ts` classifies DirectReturn as `INBOUND_ON_RECEIVE`. `buildReceiveEffects` creates one IN effect at `voucher.to_id`. Current CREATE defaults missing `fromId` to the authenticated user's VAN and missing `toId` to MAIN, but caller-supplied `fromId` is retained.

TASK-INV-002 proves current Production POST semantics perform DirectReturn RECEIVE as IN-only; the migration model differs by adding an OUT effect at source.

### Corrective solution
As with DirectSale, explicitly select one Target model:

A. **Single authoritative physical movement:** IN at warehouse on RECEIVE, with the VAN source represented by the voucher/custody relationship.

B. **Two stock mutations:** OUT at VAN and IN at warehouse as one atomic operation.

Current Production proves A-like behavior; migration alone does not justify B.

### Decision gate
CTO must select A or B. No code change should be made until the custody and stock truth semantics are explicit.

## 6. BLOCKER 4 — PARTIAL RECEIVE REPLAY / IDEMPOTENCY

### Proven behavior
Current RECEIVE supports partial receipt. It uses `received_qty`, calculates remaining quantity, and allows the voucher to remain `Sent` while remaining quantity exists. Persisted evidence does not prove cumulative event identity or an idempotency key.

### Root cause
The current lifecycle state is sufficient to permit another legitimate partial receive, but it does not by itself establish whether a repeated identical request is a replay or a new business event.

### Corrective solution
First perform the required self-cleaning validation:

`SEND → partial RECEIVE → replay the exact same RECEIVE request`

The validation must capture:
- response/status of first RECEIVE;
- response/status of replay;
- `stock_branches.qty` before/after;
- `stock_voucher_details.received_qty` before/after;
- `inventory_log` rows before/after;
- voucher status before/after;
- whether any unique operation/event identity exists.

If the replay is safely rejected or proven to be semantically a new distinct operation only when explicitly requested, no new idempotency mechanism is justified. If the exact same request can create a second movement, the Target solution is an operation identity/idempotency contract enforced inside the atomic inventory primitive, with a uniqueness constraint or equivalent authoritative database guard. Exact implementation should be selected only after evidence proves the current failure mode.

No test data may remain after validation.

## 7. BLOCKER 5 — CANCEL

### Proven
Current Edge Function calls `cancel_manual_stock_voucher_atomic(companyId,voucherCode,user.email)`. Signature and privileges are proven.

### Unknown
The exact deployed body is unavailable in the persisted evidence reviewed for TASK-INV-002. Therefore prior-status rules, resulting status, stock mutation, inventory log, audit, failure behavior and replay behavior remain UNKNOWN.

### Corrective solution
Do not infer behavior from the name, Original function or migration.

Required exact evidence: persisted full deployed SQL definition of `cancel_manual_stock_voucher_atomic(uuid,text,text)` plus its privileges. If the deployed body cannot be persisted, obtain a read-only definition query and save the output as a new evidence artifact before any patch design.

After evidence closure, the solution must preserve the central inventory rule: CANCEL must either be a lifecycle-only operation or perform a defined atomic reversal, but that choice is determined by the proven Target/production contract, not by the function name.

## 8. BLOCKER 6 — CUSTODY OWNERSHIP

### Proven static fact
CREATE defaults DirectSale destination and DirectReturn source to `VAN-<authenticated user email>`, but retains a caller-supplied endpoint ID.

### Corrective solution
If Target requires the VAN to belong to the authenticated user, enforce that invariant at the authoritative business boundary used for the voucher operation. A UI/default is insufficient as the sole control.

Exact patch design requires evidence of the existing authorization model for VAN/branch ownership and the authoritative relation between user and VAN branch. Required evidence if not already persisted:
- user/branch/VAN ownership schema;
- existing authorization helper used for warehouse/voucher operations;
- deployed RPC authorization context relevant to branch endpoints.

No hard-coded `VAN-<email>` rule should be treated as sufficient ownership proof without this evidence.

## 9. BLOCKER 7 — `inventory_log.branch_id`

### Proven discrepancy
Production schema evidence does not contain `branch_id` in `inventory_log`, while reviewed architecture/documentation describes branch identity as part of inventory history.

### Corrective solution
Do not add the column to make documentation match code.

First establish the intended audit representation from the Target Inventory/Audit Contract. If branch identity is already reconstructable from voucher/reference context and the Target accepts that representation, documentation should be reconciled to the actual model. If the Target explicitly requires branch_id as first-class immutable movement evidence, then a coordinated schema + central inventory-engine change is required under CTO authorization.

Exact evidence needed before either choice:
- complete Production `inventory_log` schema;
- deployed inventory movement RPC definition(s);
- representative persisted inventory evidence showing how branch identity is currently represented;
- Target audit requirement defining whether branch_id is mandatory.

## 10. BLOCKER 8 — VAN SALES

### Proven status
TASK-INV-002 does not contain enough complete current `van-sales.html`, its directly invoked Edge Functions, deployed RPC definitions, and Production schema/evidence to prove end-to-end safety.

### Corrective solution
Complete the minimum evidence set before patching:
1. full current `van-sales.html`;
2. every current Edge Function directly invoked for MAIN→VAN loading, VanSale, Return and Unload;
3. deployed RPC definitions for those functions where applicable;
4. Production schema evidence for every mutated stock/order/sales table;
5. existing inventory evidence for each mutation path;
6. self-cleaning tests for single sale, replayed sale, return and unload replay.

Only after this reconciliation can the final Van Sales patch scope be defined. No function names are invented here.

## 11. PROPOSED FINAL PATCH SCOPE — CONDITIONAL ON CTO DECISIONS

The final patch should be kept narrow and centralized:

### Manual Voucher core
- COMPLETE atomic primitive: resolve audit actor representation and remove the proven schema/RPC mismatch.
- CANCEL atomic primitive: only after deployed behavior is evidenced and Target semantics are confirmed.
- DirectSale/DirectReturn: implement only the CTO-selected movement/custody model inside the central atomic primitive.
- Custody authorization: enforce the selected VAN ownership invariant at the authoritative business boundary if required by Target.
- Partial RECEIVE: add only the proven idempotency protection required by validation.
- Inventory log: reconcile branch identity contract without speculative schema expansion.

### Edge Functions
Current Edge Functions should remain thin adapters/orchestrators. Do not duplicate inventory mutation in them. `complete-stock-voucher` currently performs a status read/check and invokes the atomic COMPLETE RPC; this shape is consistent with the architectural constraint that the Edge Function is not the complete business transaction. fileciteturn232file0

### Shared rules
`manual-voucher-rules.ts` is currently the central application-side rule set for the four lifecycle types and movement directions. Any Target change to DirectSale/DirectReturn must update the central rule representation and the authoritative database primitive together; changing only UI behavior is insufficient. fileciteturn234file0

## 12. VALIDATION PLAN

All validation must be read-only whenever possible and any explicitly approved experimental data must be self-cleaning. The Production Safety constraint prohibits mutation merely to discover what read-only evidence can establish.

### Manual Voucher validation matrix

| Scenario | Required proof |
|---|---|
| Transfer SEND | exactly one authoritative OUT movement; correct source stock; inventory history; atomic failure behavior |
| Transfer partial RECEIVE | correct cumulative received quantity; no over-receipt; replay behavior proven |
| Transfer final RECEIVE | correct IN movement; status transition; inventory history |
| DirectSale | exact CTO-selected custody/movement model; no duplicate mutation |
| DirectReturn | exact CTO-selected custody/movement model; no duplicate mutation |
| SupplierReturn | correct OUT movement and lifecycle completion semantics |
| Complete | exact expected prior status by type; actor/audit contract; no unintended stock mutation |
| Cancel | exact deployed/Target status rules; no unintended stock mutation or defined atomic reversal |
| Replay | repeated SEND/RECEIVE/COMPLETE/CANCEL behavior proven and idempotent where required |

### Van Sales validation matrix

`MAIN → VAN → VanSale → Return → Unload`

For every movement prove:
- source and destination stock;
- exactly one authoritative mutation per business event;
- exactly one required inventory-log trail;
- no replay duplication;
- failure leaves no partial business movement.

## 13. RELEASE BLOCKERS AFTER THIS REPORT

The following prevent an implementation-ready Patch package from being considered reconciled:

1. CTO decision on DirectSale movement semantics.
2. CTO decision on DirectReturn movement semantics.
3. Audit Contract evidence/decision for COMPLETE actor identity.
4. Exact deployed CANCEL body.
5. Partial RECEIVE replay validation.
6. Custody ownership evidence/Target decision if authenticated-user VAN ownership is mandatory.
7. Inventory-log branch identity contract.
8. Complete Van Sales evidence and mutation reconciliation.

These are not reasons to enter an endless BLOCKED loop: each has a concrete resolution path or exact evidence requirement above.

## 14. EXECUTION ORDER

1. Close exact evidence gaps that can be answered read-only.
2. CTO selects DirectSale/DirectReturn Target semantics.
3. Close COMPLETE audit contract.
4. Prove partial RECEIVE replay behavior.
5. Close CANCEL definition.
6. Close inventory-log branch contract.
7. Complete Van Sales evidence/reconciliation.
8. Produce one consolidated patch scope.
9. CTO reviews and authorizes implementation.
10. Implement and validate centrally.

## 15. FINAL STATUS

**NO PATCH EXECUTED.**

**NO PRODUCTION CHANGE EXECUTED.**

**NO SCHEMA CHANGE EXECUTED.**

**CTO DECISION REQUIRED before implementation.**

The blockers have executable resolution paths; unresolved Target decisions are explicitly separated from proven facts and from evidence gaps.
