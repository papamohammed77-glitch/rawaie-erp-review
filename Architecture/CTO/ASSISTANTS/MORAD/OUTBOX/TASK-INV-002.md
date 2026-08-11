# TASK-INV-002 — MORAD ADVERSARIAL REVIEW

**Branch:** `rescue/manual-vouchers-inventory-core`
**Role:** Adversarial Reviewer
**Scope:** Evidence Closure & Reconciliation
**Decision authority:** CTO
**Status:** BLOCKED — evidence closure incomplete

---

## 1. ACCEPTED

### A-001 — Production COMPLETE mismatch is proven

**ACCEPTED.**

`EVIDENCE-014.csv` proves the reviewed Production `stock_vouchers` schema does not include `completed_by`. The persisted RPC evidence proves `complete_manual_stock_voucher_atomic(uuid,text,text)` attempts to write `completed_by`. The Current COMPLETE Edge Function delegates to that RPC.

Classification: **PROVEN**.

No conclusion is drawn that adding `completed_by` is the correct Target correction.

### A-002 — Central mutation boundary is proven for reviewed Current lifecycle functions

**ACCEPTED.**

Current SEND and RECEIVE delegate inventory mutation to `post_manual_stock_voucher_atomic`; COMPLETE and CANCEL delegate to their respective atomic RPCs. This supports the current implementation boundary. It does not, by itself, prove that every deployed RPC contract is correct or complete.

Classification: **PROVEN for delegation; not a Target approval**.

### A-003 — DirectSale / DirectReturn Target semantics remain unresolved

**ACCEPTED.**

The reviewed Production/RPC behavior differs from the unreleased migration model for DirectSale and DirectReturn. The migration is explicitly not Production evidence. Therefore the final Target behavior remains a CTO Target Decision.

Classification: **TARGET DECISION REQUIRED**.

### A-004 — No patch before reconciliation

**ACCEPTED.**

This remains consistent with the active architectural constraints and TASK-INV-002 gate.

---

## 2. REJECTED

### R-001 — Treating status gates as proof of partial RECEIVE idempotency

**REJECTED.**

The Current RECEIVE flow supports partial receipt and leaves the voucher in `Sent` while quantities remain. Therefore `Sent` is still a valid state for a later RECEIVE. A status gate that prevents a second operation after full receipt does not prove that replaying the same partial RECEIVE request is rejected as a duplicate.

The reviewed evidence does not establish a request/event identity, operation UUID, or equivalent unique replay key for a RECEIVE attempt.

**Impact:** Idempotency of partial RECEIVE remains unproven and is a safety blocker before claiming lifecycle closure.

Classification: **UNKNOWN / BLOCKING EVIDENCE GAP**.

### R-002 — Treating the DirectSale default VAN resolution as unconditional custody enforcement

**REJECTED.**

The Current CREATE behavior resolves the authenticated user's VAN branch when `toId` is omitted. The reviewed Current behavior does not prove that a caller-supplied `toId` is forcibly replaced with that VAN branch.

Therefore "DirectSale always targets the authenticated user's VAN" is not proven by the current implementation evidence.

Classification: **TARGET DECISION REQUIRED / CUSTODY ENFORCEMENT UNPROVEN**.

### R-003 — Treating the DirectReturn default VAN resolution as unconditional custody enforcement

**REJECTED.**

The symmetric issue exists for DirectReturn: the authenticated user's VAN branch is used when `fromId` is omitted, but the reviewed evidence does not prove that a caller-supplied `fromId` is forcibly replaced.

Classification: **TARGET DECISION REQUIRED / CUSTODY ENFORCEMENT UNPROVEN**.

---

## 3. ADDITIONAL BLOCKERS

### B-001 — CANCEL Production contract is still not closed

The persisted evidence reviewed for this task does not contain a complete deployed definition of `cancel_manual_stock_voucher_atomic(uuid,text,text)`.

Therefore the following remain unproven:

- allowed source statuses;
- final status transition;
- stock mutation behavior;
- inventory_log behavior;
- audit behavior;
- company/branch enforcement inside the deployed RPC;
- retry/replay behavior;
- atomic failure behavior.

Classification: **UNKNOWN**.

Priority: **P1**.

### B-002 — Complete Production schema contract is still incomplete

`EVIDENCE-014.csv` proves selected columns for `stock_vouchers`, `stock_voucher_details`, and `stock_branches`, but it is not a complete schema contract for all tables referenced by the Manual Voucher RPCs.

The reviewed evidence therefore does not close every schema dependency of CREATE/POST/COMPLETE/CANCEL.

Classification: **UNKNOWN**.

Priority: **P1**.

### B-003 — Audit path for COMPLETE/CANCEL remains unproven

The architecture/security material establishes `audit_log` as a general audit layer, but the reviewed Manual Voucher RPC evidence does not prove that COMPLETE and CANCEL generate authoritative audit records, nor where the completion/cancellation actor is stored.

This is material because the `completed_by` mismatch cannot safely be resolved by adding a column merely to satisfy the deployed function.

Classification: **UNKNOWN**.

Priority: **P1**.

### B-004 — `inventory_log.branch_id` discrepancy remains open

The reviewed architecture material describes `inventory_log` with branch identity, while the available Production schema evidence reviewed for this phase does not prove an `inventory_log.branch_id` column.

This is a schema/document contract discrepancy. It must not be silently resolved by inference.

Classification: **PROVEN DISCREPANCY; TARGET/CONTRACT CLOSURE REQUIRED**.

Priority: **P1**.

### B-005 — Van Sales evidence remains insufficient for the requested end-to-end safety conclusion

The Phase-1 materials identify the required path as:

`MAIN → VAN → VanSale → Return → Unload`

The evidence reviewed for TASK-INV-002 does not provide complete end-to-end proof for `van-sales.html` and every related Edge Function needed to establish exact stock-movement cardinality across that chain.

Therefore no conclusion is issued that Van Sales is safe or unsafe.

Classification: **UNKNOWN**.

Priority: **P1 before any Van Sales-related target decision or patch**.

---

## 4. EVIDENCE SUFFICIENT

The following questions are sufficiently supported for the limited conclusions stated here:

1. **Production `stock_vouchers` lacks proven `completed_by`:** sufficient from `EVIDENCE-014.csv`.
2. **Deployed COMPLETE RPC attempts `completed_by`:** sufficient from `EVIDENCE-MANUAL-VOUCHER-RPC-DEFINITIONS-V1.csv`.
3. **Current lifecycle delegates SEND/RECEIVE inventory mutation to the atomic POST RPC:** sufficient from Current Edge Function evidence.
4. **Production POST uses voucher locking and status gates:** sufficiently established by the reviewed deployed RPC evidence.
5. **DirectSale/DirectReturn migration behavior is not Production behavior:** sufficiently established by the migration's explicit unreleased status.
6. **Broad RLS policies exist in the reviewed diagnostics:** proven by `EVIDENCE-003-V1.csv`; however this is not independently classified as a confirmed RLS defect.

---

## 5. EVIDENCE STILL REQUIRED

Only the following evidence gaps remain material to this task:

### E-001 — Complete deployed CANCEL RPC definition

**Needed to close:** CANCEL behavior and replay/atomicity/audit questions.

**Required artifact:** complete deployed definition of `cancel_manual_stock_voucher_atomic(uuid,text,text)`.

### E-002 — Complete deployed Manual Voucher RPC privilege contract

**Needed to close:** SECURITY DEFINER / EXECUTE exposure for all Manual Voucher RPCs as deployed.

**Required artifact:** deployed privilege metadata for CREATE, POST, COMPLETE, and CANCEL RPCs.

### E-003 — Complete Production schema contract for all Manual Voucher RPC dependencies

**Needed to close:** schema mismatch questions beyond the already proven `completed_by` issue and the `inventory_log.branch_id` discrepancy.

**Required artifact:** complete relevant Production column inventory for the tables actually referenced by the deployed RPC definitions.

### E-004 — Authoritative audit path

**Needed to close:** whether COMPLETE/CANCEL actor evidence is already captured through triggers/functions/audit_log or another authoritative mechanism.

**Required artifact:** deployed trigger and audit-function evidence for the affected Manual Voucher tables.

### E-005 — Partial RECEIVE replay protection

**Needed to close:** whether the deployed POST RPC has an authoritative mechanism that distinguishes a retry of the same partial RECEIVE event from a legitimate second partial RECEIVE.

**Required artifact:** complete deployed POST RPC definition plus any relevant uniqueness/idempotency constraints or operation identity evidence.

### E-006 — Van Sales minimum evidence

**Needed to close:** exact MAIN→VAN, VanSale, Return, and Unload movement chain and whether one business event can produce more than one stock deduction.

**Required artifact:** complete `van-sales.html` plus every directly related Edge Function involved in MAIN→VAN, VanSale, Return, and Unload, or equivalent existing repository evidence that proves the complete chain.

---

## 6. P0 / P1 SAFETY GATE

### P0

**P0-1 — COMPLETE Schema/RPC contract mismatch**

Already proven. It remains a blocker because the deployed COMPLETE contract is not reconciled with the proven Production schema and Target audit contract.

**P0-2 — Partial RECEIVE idempotency not proven**

The current status gate is insufficient for partial RECEIVE replay safety. No empirical duplicate is claimed; the blocker is the absence of proof of replay protection.

**P0-3 — DirectSale / DirectReturn custody Target unresolved if custody is intended to be authenticated-user-bound**

The current implementation provides defaults, not proven unconditional ownership enforcement against caller-supplied endpoints.

### P1

- CANCEL deployed behavior incomplete in evidence.
- Complete schema contract incomplete.
- COMPLETE/CANCEL audit path unproven.
- `inventory_log.branch_id` documentation/schema discrepancy unresolved.
- Van Sales end-to-end evidence insufficient.

---

## 7. TARGET-DECISION SAFETY REVIEW

No proposed Target decision should be treated as final from the reviewed evidence alone for:

- DirectSale custody endpoint enforcement.
- DirectReturn custody endpoint enforcement.
- DirectSale OUT-only vs OUT+IN model.
- DirectReturn IN-only vs OUT+IN model.
- Audit actor storage for COMPLETE/CANCEL.
- Lifecycle support for any type beyond the four currently proven by the reviewed RPC path.

The reviewed evidence does not justify selecting a Target merely by choosing whichever implementation is newer or older.

---

## 8. CTO GATE

**DECISION: BLOCKED**

Reason: the remaining evidence gaps are material to stock safety, custody integrity, replay safety, audit integrity, and lifecycle correctness. No Patch, Migration, Schema change, SQL execution, or Production modification is authorized by this review.

This report does **not** declare GO and does not replace CTO Target decisions.
