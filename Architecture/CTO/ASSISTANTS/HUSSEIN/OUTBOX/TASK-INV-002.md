# TASK-INV-002 — HUSSEIN EVIDENCE CLOSURE & RECONCILIATION

Branch: `rescue/manual-vouchers-inventory-core`
Role: Evidence Owner
Mode: Evidence-first / no patch

## 1. DEPLOYED MANUAL VOUCHER RPC DEFINITIONS & PRIVILEGES

### PROVEN
Persisted Production evidence `EVIDENCE-MANUAL-VOUCHER-RPC-DEFINITIONS-V1.csv` contains deployed definitions for at least CREATE, POST and COMPLETE. The deployed signatures/privileges are also recorded by `EVIDENCE-011-V1.csv`: all four Manual Voucher RPCs are `SECURITY DEFINER`, `public_execute=false`, `service_role_execute=true`:

- `create_manual_stock_voucher_atomic(uuid,text,text,text,uuid,text,uuid,text,text,jsonb)`
- `post_manual_stock_voucher_atomic(uuid,text,text,text,jsonb)`
- `complete_manual_stock_voucher_atomic(uuid,text,text)`
- `cancel_manual_stock_voucher_atomic(uuid,text,text)`

`EVIDENCE-012-V1.csv` independently confirms POST public execution is false and service-role execution is true.

The persisted COMPLETE definition proves:
- locks the voucher with `FOR UPDATE`;
- validates company context against `app_settings`;
- expects `Received` for `Transfer` / `DirectReturn`;
- expects `Sent` for `DirectSale` / `SupplierReturn`;
- updates status to `Completed` and `completed_at=now()`;
- also attempts `completed_by=p_user_email`.

Production schema evidence `EVIDENCE-001-V1.csv` lists the complete `stock_vouchers` columns and does not contain `completed_by`. This confirms the existing P0 Schema/RPC mismatch.

### UNKNOWN
The complete deployed SQL body of `cancel_manual_stock_voucher_atomic` is not present in the accessible persisted RPC-definition evidence in a form that can be independently verified here. Its signature and privileges are proven, but its exact status checks, stock effects, inventory-log effects, audit effects, failure behavior and replay behavior remain UNKNOWN.

### EVIDENCE STATUS
No new SQL evidence was created or requested because this task is evidence closure only and the currently available repository evidence is sufficient to prove the items above except CANCEL's exact body. The missing CANCEL body remains a documented evidence gap.

---

## 2. CANCEL BEHAVIOR

### PROVEN
Current Edge Function `cancel-stock-voucher` calls:
`cancel_manual_stock_voucher_atomic(companyId, voucherCode, user.email)`.

The RPC signature and security posture are proven by `EVIDENCE-011-V1.csv`.

### UNKNOWN
The deployed CANCEL function definition itself is not proven by the available persisted evidence. Therefore the following remain UNKNOWN:

- allowed prior statuses;
- resulting status;
- whether any stock mutation occurs;
- whether any `inventory_log` row is written;
- whether audit rows are written;
- exact failure behavior;
- exact replay/idempotency behavior.

No assumption is made from the function name or from Original code.

---

## 3. DIRECTSALE CUSTODY

### PROVEN
Current `create-stock-voucher/index.ts` establishes defaults as follows:

- `DirectSale`: if `fromId` is absent, source resolves to `MAIN`.
- `DirectSale`: if `toId` is absent, destination resolves to `VAN-<authenticated user email>`.

However, this is only a defaulting rule. The code first resolves a caller-supplied `toId`, and does not overwrite it. Therefore the statement "DirectSale always uses the authenticated user's VAN" is NOT proven.

Current Production/Current POST semantics prove DirectSale SEND is an OUT movement only from `voucher.from_id`; the deployed POST contract does not prove an IN movement to `to_id` during SEND.

### TARGET DECISION REQUIRED
The final custody contract must explicitly decide whether DirectSale Target means:

A. current Production model: `Warehouse/Branch → VAN custody` represented by the single OUT mutation at SEND; or
B. the unreleased migration model that also creates an IN mutation at the destination.

No Target decision is inferred from migration code.

### SAFETY OBSERVATION
If the Target requires authenticated-user VAN ownership regardless of caller-supplied endpoint, current CREATE code does not prove that invariant because supplied `toId` is retained. This is a proven static custody-boundary gap, not an empirical theft/duplication claim.

---

## 4. DIRECTRETURN CUSTODY

### PROVEN
Current `create-stock-voucher/index.ts` establishes defaults as follows:

- `DirectReturn`: if `fromId` is absent, source resolves to `VAN-<authenticated user email>`.
- `DirectReturn`: if `toId` is absent, destination resolves to `MAIN`.

Again, this is defaulting only. A caller-supplied `fromId` is resolved and retained, so the current code does not prove that DirectReturn must originate from the authenticated user's VAN branch.

Current Production/Current POST semantics prove DirectReturn RECEIVE is an IN movement only to `voucher.to_id`.

### TARGET DECISION REQUIRED
The final custody contract must explicitly decide whether DirectReturn Target means:

A. current Production model: RECEIVE creates IN at the destination only; or
B. the unreleased migration model that also creates OUT at the source.

No Target decision is inferred from migration code.

---

## 5. PARTIAL RECEIVE IDEMPOTENCY

### PROVEN
Current RECEIVE supports partial receipt:

- reads `received_qty` from `stock_voucher_details`;
- calculates remaining quantity as `qty - received_qty` when the client sends no explicit list;
- allows the voucher to remain `Sent` after a partial receipt;
- calls `post_manual_stock_voucher_atomic(..., 'RECEIVE', ...)`.

Persisted `EVIDENCE-013-V1.csv` states:
- `cumulative_receive_present=false`
- `partial_receive_status_guard_present=false`.

The deployed POST definition shown in the persisted RPC evidence uses the current `received_qty` and remaining-quantity checks and locks the voucher with `FOR UPDATE`.

### PROVEN STATIC GAP / NOT EMPIRICAL PASS
A successful partial RECEIVE leaves the voucher in `Sent` while remaining quantity exists. Therefore the normal status gate does not distinguish a retry of the same prior partial event from a new legitimate partial event.

No request/event idempotency key or operation identity is proven in the reviewed RECEIVE path. No uniqueness constraint tying an individual RECEIVE attempt to an inventory movement is proven by the available schema evidence.

Therefore partial RECEIVE replay protection is **NOT PROVEN**. This is a static evidence gap/risk, not a claim that duplicate stock has empirically occurred.

### REQUIRED VALIDATION
A self-cleaning validation must specifically test:
`SEND → partial RECEIVE → replay same RECEIVE request`.
The result must prove whether the second submission is rejected as duplicate or is treated as a new distinct event.

---

## 6. `inventory_log.branch_id` SCHEMA DISCREPANCY

### PROVEN
`EVIDENCE-001-V1.csv` is the detailed Production schema evidence for `inventory_log`. It lists:

`id, company_id, log_code, movement_date, voucher_id, item_id, item_code, item_name, movement_type, qty, reference, user_email, created_at`.

`branch_id` is not present.

The architecture/documentation material previously reviewed describes `inventory_log` as carrying branch identity. Therefore there is a proven documentation/Production-schema contract discrepancy.

### IMPORTANT LIMIT
The absence of `branch_id` in the Production schema evidence does NOT prove that branch identity cannot be determined from other context. No such inference is used here.

### CLASSIFICATION
**PROVEN schema/document discrepancy.**
No schema change is authorized or proposed by this report.

---

## 7. MINIMUM VAN SALES EVIDENCE REQUIRED

### PROVEN
The Phase-1/Adversarial material does not contain enough complete `van-sales.html` and related Van Sales implementation/evidence to prove the end-to-end paths:

`MAIN → VAN`
`VanSale`
`Return`
`Unload`

Therefore duplicate-deduction safety for Van Sales remains UNKNOWN.

### MINIMUM REQUIRED EVIDENCE SET
Before declaring Van Sales safe, the following repository evidence must be available and reviewed together:

1. Complete current `van-sales.html` (not a snippet).
2. Every current Edge Function directly called by `van-sales.html` for:
   - loading / MAIN→VAN;
   - VanSale;
   - Return;
   - Unload.
3. The deployed RPC definitions actually invoked by those Edge Functions, where applicable.
4. Production schema evidence for every table/column mutated by those paths, especially `stock_branches`, `inventory_log`, voucher/order/sales tables and any Van-specific stock table actually referenced by code.
5. Existing persisted inventory evidence covering each stock mutation path.
6. A self-cleaning validation path proving that one VanSale cannot deduct the same stock twice and that Return/Unload cannot replay the same movement.

No specific function names are invented here because the complete Van Sales function set has not been proven from the currently accessible evidence.

---

# RECONCILIATION MATRIX

| Question | Result | Evidence basis |
|---|---|---|
| Manual Voucher RPC signatures | PROVEN | EVIDENCE-011 |
| RPC SECURITY DEFINER | PROVEN | EVIDENCE-011 + RPC definitions |
| Public EXECUTE | PROVEN false | EVIDENCE-011 / EVIDENCE-012 |
| Service-role EXECUTE | PROVEN true | EVIDENCE-011 / EVIDENCE-012 |
| COMPLETE writes `completed_by` | PROVEN | deployed COMPLETE definition |
| Production `stock_vouchers.completed_by` | PROVEN absent | EVIDENCE-001 |
| CANCEL exact deployed behavior | UNKNOWN | exact deployed body unavailable |
| DirectSale default VAN | PROVEN | current CREATE |
| DirectSale mandatory VAN ownership | UNKNOWN / TARGET DECISION REQUIRED | caller-supplied `toId` retained |
| DirectSale SEND stock effect | PROVEN current Production: OUT only | deployed POST/current SEND |
| DirectSale Target OUT+IN | TARGET DECISION REQUIRED | migration conflicts with Production |
| DirectReturn default VAN source | PROVEN | current CREATE |
| DirectReturn mandatory VAN ownership | UNKNOWN / TARGET DECISION REQUIRED | caller-supplied `fromId` retained |
| DirectReturn RECEIVE stock effect | PROVEN current Production: IN only | deployed POST/current RECEIVE |
| DirectReturn Target OUT+IN | TARGET DECISION REQUIRED | migration conflicts with Production |
| Partial RECEIVE support | PROVEN | current RECEIVE |
| Partial RECEIVE replay idempotency | NOT PROVEN | EVIDENCE-013 + current path |
| `inventory_log.branch_id` in Production | PROVEN absent | EVIDENCE-001 |
| Documentation says `inventory_log.branch_id` | PROVEN from reviewed architecture | architecture evidence |
| Van Sales duplicate deduction | UNKNOWN | complete Van Sales evidence absent |

---

# REMAINING BLOCKERS

### P0
1. COMPLETE RPC / Production Schema mismatch on `completed_by`.
2. DirectSale Target semantics unresolved.
3. DirectReturn Target semantics unresolved.
4. Partial RECEIVE replay/idempotency not proven.

### P1
5. Exact deployed CANCEL behavior remains UNKNOWN.
6. DirectSale/DirectReturn custody ownership invariant is not proven when caller supplies endpoints.
7. `inventory_log.branch_id` documentation/schema discrepancy remains unresolved as a contract matter.
8. Van Sales end-to-end evidence is insufficient to prove duplicate-deduction safety.

---

# NO PATCH / NO GO

No schema change, migration, production patch, application patch, or test workaround was performed for TASK-INV-002.

This report does not declare GO. CTO reconciliation and target decisions remain required.
