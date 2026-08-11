# RAWAEA ERP — MORAD
# PHASE 1 ADVERSARIAL REVIEW
## Inventory / Manual Vouchers / Van Sales

**Reviewer:** MORAD — Adversarial Reviewer
**Branch:** `rescue/manual-vouchers-inventory-core`
**Decision authority:** CTO
**Review mode:** Evidence-first / Read-only

---

# 1. REVIEWED MATERIAL

Reviewed against the material currently accessible on the rescue branch:

- `Architecture/RAWAEA — Architectural Constraints & Proven Lessons.md`
- `Architecture/الأذونات المخزنية اليدوية.md`
- `docs/Draft/رد المساعد حسين.md`
- `docs/Draft/رد المساعد مراد.md`
- `SQL_Evidence/diagnostics/EVIDENCE-001-V1.csv`
- `SQL_Evidence/diagnostics/EVIDENCE-002-V1.csv`
- `SQL_Evidence/diagnostics/EVIDENCE-003-V1.csv`
- `SQL_Evidence/diagnostics/EVIDENCE-005-V1.csv`
- `SQL_Evidence/diagnostics/EVIDENCE-006-V1.csv`
- `supabase/functions/create-stock-voucher/index.ts`
- `supabase/functions/send-stock-voucher/index.ts`
- `supabase/functions/receive-stock-voucher/index.ts`
- `supabase/functions/complete-stock-voucher/index.ts`
- `supabase/functions/cancel-stock-voucher/index.ts`
- `supabase/functions/_shared/manual-voucher-rules.ts`
- `Edge_Functions/original/08_inventory/send-stock-voucher.ts`
- `Edge_Functions/original/08_inventory/complete-stock-voucher.ts`
- `Edge_Functions/original/08_inventory/cancel-stock-voucher.ts`
- `supabase/migrations/20260810_manual_voucher_core_v1_RELEASE.sql`

The Architecture Constraints explicitly require that observations be reconciled against schema, production evidence, workflow, equivalent functions and architecture, and classify conclusions as PROVEN / STATIC ONLY / KNOWN-ARCHITECTURAL REVIEW REQUIRED / UNKNOWN / TARGET DECISION REQUIRED. fileciteturn232file0

---

# 2. CONFIRMED FINDINGS

## F-001 — COMPLETE RPC / Production Schema mismatch

**Status:** CONFIRMED
**Severity:** P0

Production schema evidence lists `stock_vouchers` without `completed_by`. fileciteturn241file0

The current COMPLETE Edge Function invokes `complete_manual_stock_voucher_atomic` with `p_user_email`; it does not itself write `completed_by`. fileciteturn233file0

The original COMPLETE function historically attempted to write `completed_by`. fileciteturn256file0

This confirms Hussein's central finding that the `completed_by` issue is a real Schema/RPC contract problem, not merely a test harness issue.

**Impact:** COMPLETE cannot be treated as production-safe until the Target audit contract and the deployed RPC/schema contract are reconciled.

**Required correction:** Target decision and evidence reconciliation first. No automatic `ADD completed_by` assumption.

---

## F-002 — Partial RECEIVE is not demonstrably idempotent

**Status:** CONFIRMED STATIC RISK / BLOCKING EVIDENCE GAP
**Severity:** P0 until disproven

The current RECEIVE function explicitly supports partial receipt. It reads `received_qty`, calculates remaining quantity, builds an `IN` effect, and calls `post_manual_stock_voucher_atomic`. fileciteturn236file0

The same function allows the voucher to remain in `Sent` after a partial receipt because completion depends on the remaining quantity. This is part of the current lifecycle behavior described by the function.

The available implementation evidence contains no request/event idempotency key, no operation UUID, and no unique movement identity tied to a RECEIVE attempt. The schema evidence also shows only the primary key on `inventory_log`; no idempotency constraint is shown. fileciteturn241file0 fileciteturn249file0

Therefore, after a successful partial RECEIVE, replaying the same request while the voucher remains `Sent` is not proven to be rejected as a duplicate. The status gate alone cannot provide idempotency for partial RECEIVE because `Sent` remains a valid state for another partial RECEIVE.

**Impact:** A network retry or client replay can potentially post the same partial receipt more than once and create repeated inventory effects before the remaining quantity is exhausted.

**Required correction:** Evidence must prove a unique RECEIVE event identity or equivalent replay protection before the lifecycle can be declared idempotent.

**Important:** This is not a claim that duplication has empirically occurred. It is a static, code/schema-proven idempotency gap that requires validation.

---

## F-003 — DirectSale custody endpoint can be supplied by caller

**Status:** CONFIRMED STATIC BUSINESS-RULE GAP
**Severity:** P1 / potentially P0 depending on Target custody contract

The current CREATE function automatically resolves the user's `VAN-<email>` branch only when `toId` is absent for `DirectSale`. If the caller supplies `toId`, the function resolves that supplied branch and does not overwrite it with the user's VAN branch. fileciteturn251file0

The shared validation requires only `Branch → Branch` for DirectSale. fileciteturn234file0

The architecture document defines DirectSale as:

`Branch (warehouse) → Representative/Vehicle`

and the rescue materials describe the vehicle/representative custody concept. fileciteturn252file0

Therefore Hussein's statement that CREATE "automatically" converts the DirectSale destination to the user's VAN branch is too broad. It is true only when the caller does not provide `toId`.

**Impact:** If the Target rule is that DirectSale must always load the authenticated user's VAN custody branch, the current boundary permits the caller to select another branch as destination.

**Required correction:** Prove the Target ownership rule and prove that the server enforces it regardless of caller-supplied endpoint values.

---

## F-004 — DirectReturn has the symmetrical endpoint issue

**Status:** CONFIRMED STATIC BUSINESS-RULE GAP
**Severity:** P1 / potentially P0 depending on Target custody contract

The current CREATE function resolves the user's VAN branch for DirectReturn only when `fromId` is absent. A caller-supplied `fromId` is accepted after normal branch resolution. fileciteturn251file0

The shared validation requires `Branch → Branch`, but does not assert that `from_id` equals the authenticated user's VAN branch. fileciteturn234file0

The architecture document defines DirectReturn as movement from representative/vehicle custody to warehouse. fileciteturn252file0

**Impact:** The current server-side rule is weaker than a strict "return only from this user's vehicle custody" model.

**Required correction:** Prove the Target custody ownership rule and enforce it at the authoritative boundary if that is the Target.

---

## F-005 — Architecture documents and current lifecycle disagree on supported voucher types

**Status:** CONFIRMED
**Severity:** P1 — Target decision required

The manual-voucher architecture document explicitly lists six types:

`Transfer, DirectSale, DirectReturn, SupplierReturn, Scrap, Adjustment`. fileciteturn252file0

The current shared rules support only four lifecycle types:

`Transfer, DirectSale, DirectReturn, SupplierReturn`. fileciteturn234file0

Hussein correctly identified this as unresolved, but the discrepancy must remain a formal Target decision and must not be silently treated as a completed refactor.

**Impact:** Any claim that the Manual Voucher lifecycle is fully reconciled is premature until the status of Scrap and Adjustment is explicitly established.

**Required correction:** Target decision required; no implementation inference.

---

# 3. HUSSEIN CLAIMS ACCEPTED

## A-001 — `completed_by` mismatch is real

**ACCEPTED.**

Production schema evidence excludes `completed_by`, while the COMPLETE path depends on an RPC that is reported to write it. The current Edge Function invokes that RPC. fileciteturn241file0 fileciteturn233file0

## A-002 — Current Edge Functions delegate inventory mutation to the atomic RPC boundary

**ACCEPTED for the current functions reviewed.**

SEND calls `post_manual_stock_voucher_atomic`; RECEIVE calls the same RPC; COMPLETE and CANCEL call their respective atomic RPCs. fileciteturn235file0 fileciteturn236file0 fileciteturn233file0 fileciteturn254file0

This is consistent with the architectural rule that the Edge Function is the controlled API boundary and the database primitive owns the integrity-critical operation where Target assigns that responsibility. fileciteturn232file0

## A-003 — DirectSale Target conflict requires reconciliation

**ACCEPTED.**

The RELEASE migration contains DirectSale SEND logic requiring both OUT and IN effects, while the current shared SEND builder creates OUT only. fileciteturn247file0 fileciteturn234file0

The original SEND function also deducted OUT only for DirectSale. fileciteturn253file0

Therefore the migration's OUT+IN behavior cannot be accepted as historical behavior merely because it exists in a migration.

## A-004 — No patch before reconciliation

**ACCEPTED.**

This is directly consistent with the active architectural constraint: Original and Current are evidence, not automatically Target, and critical changes require complete reconciliation before implementation. fileciteturn232file0

---

# 4. HUSSEIN CLAIMS REJECTED / CORRECTED

## R-001 — "Current CREATE automatically converts DirectSale to VAN"

**REJECTED AS OVERSTATED.**

It does so only if `toId` is absent. A supplied `toId` is resolved and retained. fileciteturn251file0

This distinction matters because the stated custody model is materially stronger than merely having a default destination.

---

## R-002 — "Current lifecycle is reconciled enough to proceed after deciding DirectSale/DirectReturn"

**REJECTED.**

The partial RECEIVE replay/idempotency property has not been demonstrated. A lifecycle can have correct status transitions and atomic transactions while still being vulnerable to duplicate event submission.

The available schema evidence does not show an idempotency identity for RECEIVE. fileciteturn241file0 fileciteturn249file0

---

# 5. MISSING EVIDENCE

## M-001 — Production definition of `post_manual_stock_voucher_atomic`

**Why:** The report relies on claims about the deployed Production V4 behavior, but the currently accessible diagnostics include only limited function metadata, not the complete deployed definition of this specific RPC. The available function metadata example shows `send_stock_voucher_atomic`, not the complete `post_manual_stock_voucher_atomic` definition. fileciteturn250file0

**What:** Complete deployed definition of `public.post_manual_stock_voucher_atomic`.

**Expected output:** Exact Production SQL definition, including locking, effect validation, state transition, inventory_log insert, received_qty update, and any replay protection.

**File name:** `SQL_Evidence/diagnostics/post_manual_stock_voucher_atomic_definition.csv`

---

## M-002 — Production definitions of COMPLETE and CANCEL RPCs

**Why:** The `completed_by` defect is known, but the complete deployed behavior and audit semantics of COMPLETE/CANCEL must be proven before Target Audit conclusions are made.

**What:** Complete definitions of:
- `complete_manual_stock_voucher_atomic`
- `cancel_manual_stock_voucher_atomic`

**Expected output:** Exact function body, status checks, row locks, writes, audit behavior, and transaction boundary.

**File name:** `SQL_Evidence/diagnostics/manual_voucher_complete_cancel_rpc_definitions.csv`

---

## M-003 — Production RPC privilege matrix for Manual Voucher functions

**Why:** Broad table RLS is recorded, but security must be evaluated across Authentication → Edge Authorization → RPC exposure → SECURITY DEFINER. The architecture explicitly forbids treating broad RLS as automatic failure. fileciteturn232file0

**What:** Execute/read-only evidence of `prosecdef`, `proacl`, and public/service_role execution for all five Manual Voucher RPCs.

**Expected output:** One row per RPC showing SECURITY DEFINER and EXECUTE privileges.

**File name:** `SQL_Evidence/diagnostics/manual_voucher_rpc_privileges.csv`

---

# 6. ADDITIONAL SCHEMA / DOCUMENT DISCREPANCY

## D-001 — `inventory_log` branch identity is documented but not present in Production schema evidence

The manual-voucher architecture document describes `inventory_log` as containing `branch_id`. fileciteturn252file0

Production schema evidence lists the columns of `inventory_log` and does not include `branch_id`. fileciteturn241file0

**Classification:** PROVEN schema/document mismatch.

This is not automatically a database defect. It is a documentation/contract discrepancy that must not disappear inside a Patch.

**Impact:** The audit/movement model cannot claim a direct `branch_id` field in Production until evidence proves otherwise. Branch identity may be inferable through voucher context, but that inference must not replace the missing field without an explicit Target decision.

---

# 7. RLS — DO NOT FALSE-POSITIVE THIS

EVIDENCE-003 shows broad `Allow all for all` policies on the relevant tables. fileciteturn243file0

This is **not classified as a confirmed security defect** by this review.

The active architecture explicitly states that broad RLS is an observed fact and cannot automatically trigger an RLS rewrite; the complete path must be evaluated first. fileciteturn232file0

Therefore:

**Status:** KNOWN / ARCHITECTURAL REVIEW REQUIRED.

No blocker is issued from RLS alone.

---

# 8. VAN SALES

The Phase-1 brief requires an adversarial review of `van-sales.html` and all related Edge Functions, especially:

`MAIN → VAN`
`VanSale`
`Return`
`Unload`

The currently accessible rescue-branch material reviewed in this pass did not provide the complete `van-sales.html` and complete related Van Sales function set required to prove those paths end-to-end.

Therefore:

**Van Sales duplicate-deduction status: UNKNOWN.**

I will not claim that MAIN→VAN or VanSale is safe or unsafe without the complete code/evidence.

No assumption is made.

---

# 9. TEST RISKS

## T-001 — Partial RECEIVE retry test is mandatory before declaring idempotency

A test that only performs full RECEIVE is insufficient because full RECEIVE changes the voucher status and can hide replay behavior.

The critical case is:

```text
SEND
↓
Partial RECEIVE
↓
same RECEIVE request again
```

Expected output must prove whether the second request is rejected as a duplicate or legitimately represents a second distinct event.

No empirical PASS is claimed here.

## T-002 — Endpoint custody test

DirectSale must be tested with:

- omitted `toId`;
- authenticated user's VAN branch explicitly supplied;
- a different valid branch explicitly supplied.

DirectReturn must be tested symmetrically for `fromId`.

The purpose is to prove the authoritative Target custody rule rather than rely on defaults.

## T-003 — Test data integrity

Tests must use generated controlled identifiers and clean up all test state. No UUID may be assumed to exist, and no test may bypass validation merely to reach the mutation stage.

These requirements follow the production-safety and evidence-first constraints. fileciteturn232file0

---

# 10. P0 / P1 BLOCKERS

## P0-1 — COMPLETE Schema/RPC contract mismatch

**Evidence:** Production schema lacks `completed_by`; COMPLETE path invokes the RPC that attempts to write it. fileciteturn241file0 fileciteturn233file0

**Impact:** COMPLETE contract is not proven executable against the Production Schema.

**Required correction:** Reconcile Target Audit Contract with deployed schema/RPC before patch.

---

## P0-2 — Partial RECEIVE idempotency not proven

**Evidence:** Partial RECEIVE is supported while status can remain `Sent`; no idempotency identity is present in the reviewed schema/function boundary. fileciteturn236file0 fileciteturn241file0

**Impact:** A retry may be capable of creating another valid-looking partial movement.

**Required correction:** Obtain the complete Production RPC definition and prove replay protection or explicitly define the Target event identity.

---

## P1-1 — DirectSale/DirectReturn custody ownership is not enforced against supplied endpoints

**Evidence:** CREATE uses VAN as a default only when endpoint is absent. Supplied endpoint IDs are accepted after branch resolution. fileciteturn251file0

**Impact:** If the Target requires authenticated-user vehicle custody, caller-controlled endpoints can violate the intended ownership boundary.

**Required correction:** Target custody contract must be proven and then validated at the authoritative boundary.

---

# 11. PATCH RISKS

A patch based only on Hussein's current reconciliation could still miss:

1. partial RECEIVE replay/idempotency;
2. DirectSale endpoint ownership enforcement;
3. DirectReturn endpoint ownership enforcement;
4. inventory_log branch identity mismatch;
5. Production RPC privilege exposure;
6. complete deployed COMPLETE/CANCEL semantics;
7. the unresolved six-type vs four-type lifecycle scope;
8. Van Sales MAIN→VAN/VanSale/Return/Unload behavior.

Therefore a patch that fixes only `completed_by`, DirectSale semantics, and DirectReturn semantics would not yet constitute a complete adversarially cleared lifecycle.

---

# 12. RECOMMENDATION

**Do not patch yet.**

This is not a redesign recommendation. It is the review gate result.

The smallest next evidence set is:

1. complete Production definition of `post_manual_stock_voucher_atomic`;
2. complete Production definitions of COMPLETE and CANCEL RPCs;
3. Manual Voucher RPC privilege matrix;
4. complete Van Sales application/functions/evidence needed for MAIN→VAN → VanSale → Return → Unload.

No SQL mutation is required to obtain these items.

---

# 13. CTO GATE

## **BLOCKED**

Not because every Hussein conclusion is wrong.

The review confirms several of his findings, but identifies additional material risks and evidence gaps that prevent an adversarial clearance.

### Confirmed accepted

- `completed_by` Schema/RPC mismatch.
- Current Edge → atomic RPC boundary.
- DirectSale Target conflict.
- No Patch Before Reconciliation.

### Newly identified

- Partial RECEIVE replay/idempotency is not proven.
- DirectSale endpoint ownership is not enforced when caller supplies `toId`.
- DirectReturn endpoint ownership is not enforced when caller supplies `fromId`.
- `inventory_log.branch_id` documented vs absent in Production schema evidence.

### Unresolved

- Complete Production definitions of the critical RPCs.
- RPC privilege matrix.
- Van Sales end-to-end behavior.
- Final lifecycle scope for Scrap/Adjustment.

**CTO decision:** `BLOCKED`

**Reviewer decision authority:** None. Final GO/NO-GO remains with CTO.

---

# SELF-AUDIT

**Did I trust Hussein without verification?** No.

**Did I reject a claim without evidence?** No. Rejections are tied to current source code/evidence.

**Did I classify unknowns instead of guessing?** Yes.

**Did I modify Production?** No.

**Did I execute SQL?** No.

**Did I create a patch?** No.

**Did I alter schema or Edge Functions?** No.

**Confidence:**
- Confirmed schema/function discrepancies: **100% static confidence**.
- Partial RECEIVE idempotency risk: **95% static risk confidence; empirical behavior UNKNOWN until deployed RPC definition/test evidence is available**.
- DirectSale/DirectReturn endpoint ownership gap: **100% static code confidence; Target severity depends on custody contract**.
- Van Sales: **UNKNOWN** due incomplete accessible evidence.
