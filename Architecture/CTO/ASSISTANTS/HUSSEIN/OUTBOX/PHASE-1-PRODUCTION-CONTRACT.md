# HUSSEIN — PHASE 1 PRODUCTION CONTRACT

## CONFIRMED FACTS

### Production schema evidence
`EVIDENCE-014.csv` proves these Production columns: `stock_vouchers(company_id, received_date, sent_date, status, voucher_code)`, `stock_voucher_details(item_code,item_id,qty,received_qty,voucher_id)`, and `stock_branches(allocated_qty,branch_id,item_id,qty)`. It does not prove the complete schema of every object referenced by all Manual Voucher RPCs. fileciteturn182file0

The project execution status records the already-proven fact that Production `stock_vouchers` does not contain `completed_by`. fileciteturn172file0

### Deployed COMPLETE
`complete_manual_stock_voucher_atomic(uuid,text,text)` is deployed as `SECURITY DEFINER`; it locks the voucher, expects `Received` for `Transfer/DirectReturn` and `Sent` for `DirectSale/SupplierReturn`, then executes `status='Completed', completed_at=now(), completed_by=p_user_email`. fileciteturn176file0

Current `complete-stock-voucher` validates the expected status and calls this RPC; it does not write `completed_by` itself. fileciteturn185file0

### Deployed POST
`post_manual_stock_voucher_atomic(uuid,text,text,text,jsonb)` is `SECURITY DEFINER`; public execute is false and service-role execute is true. fileciteturn178file0turn180file0

Production POST proves:
- `SEND` requires `Draft` and permits `Transfer`, `DirectSale`, `SupplierReturn`.
- `RECEIVE` requires `Sent` and permits `Transfer`, `DirectReturn`.
- Voucher and stock rows are locked with `FOR UPDATE`.
- OUT uses `qty - allocated_qty` availability and mutates `stock_branches.qty` only.
- IN mutates `stock_branches.qty` only.
- Every actual movement inserts `inventory_log`.
- RECEIVE updates `stock_voucher_details.received_qty`.
- SEND ends in `Sent`; RECEIVE ends in `Received` only when all quantities are received. fileciteturn181file0

### Current SEND / RECEIVE
Current SEND builds only OUT effects from `voucher.from_id` and calls the atomic POST RPC. fileciteturn188file0turn186file0

Current RECEIVE builds IN effects to `voucher.to_id`, supports partial receipt, and when no received items are supplied derives all remaining quantities server-side. fileciteturn189file0turn186file0

### Current types and endpoint semantics
Current shared rules define exactly four lifecycle types: `Transfer`, `DirectSale`, `DirectReturn`, `SupplierReturn`. OUT-on-SEND: `Transfer`, `DirectSale`, `SupplierReturn`. IN-on-RECEIVE: `Transfer`, `DirectReturn`. Completion expected state: `Transfer/DirectReturn → Received`, `DirectSale/SupplierReturn → Sent`. fileciteturn186file0

Current CREATE resolves DirectSale to `MAIN → VAN-<user.email>` and DirectReturn to `VAN-<user.email> → MAIN` when endpoints are omitted, then calls the atomic CREATE RPC. fileciteturn187file0

### Architecture / audit
The active architectural constraints make Production evidence authoritative over migrations, define `stock_branches` as current stock state and `inventory_log` as movement history, require central atomic inventory mutation, and prohibit code before Target reconciliation. They also require audit fields to be treated as architectural data. fileciteturn191file0

The security model documents `audit_log` as the general audit layer and lists `user_email, action, table_name, record_id, old_data, new_data, ip_address, user_agent`; however, the reviewed Manual Voucher RPCs do not prove that COMPLETE/CANCEL automatically create audit-log rows. fileciteturn195file0

---

## PRODUCTION CONTRACT

| Stage | Proven Production behavior | Stock | Inventory log | Status |
|---|---|---|---|---|
| CREATE | Atomic CREATE creates voucher/details; no proven stock mutation | None proven | None proven | Draft |
| SEND | Atomic POST, OUT only; Transfer/DirectSale/SupplierReturn | `qty ↓` at `from_id` | Yes | Sent |
| RECEIVE | Atomic POST, IN only; Transfer/DirectReturn; partial receipt | `qty ↑` at `to_id` | Yes | Sent / Received when complete |
| COMPLETE | Atomic COMPLETE; no stock mutation in deployed definition | None | None proven | Completed |
| CANCEL | Current Edge calls atomic CANCEL | UNKNOWN | UNKNOWN | UNKNOWN |

SEND/RECEIVE are directly supported by deployed RPC evidence. fileciteturn181file0

### Static integrity behavior
Normal duplicate SEND is blocked by the `Draft` status requirement; duplicate COMPLETE is blocked by its expected-state check; duplicate/full RECEIVE is blocked by the `Sent`/remaining-quantity rules. These are `STATIC ONLY`, not empirical PASS. fileciteturn176file0turn181file0

---

## DISCREPANCIES

### P0 — COMPLETE RPC / Production Schema mismatch
Production has no proven `stock_vouchers.completed_by`, while deployed COMPLETE writes it. Current Edge calls that RPC. This is a live Production RPC/Schema contract defect. fileciteturn172file0turn176file0turn185file0

### P0 — DirectSale Target conflict
Current/Production: SEND = OUT from source only. fileciteturn186file0turn181file0

Unreleased `20260810_manual_voucher_core_v1_RELEASE.sql` contains another model: DirectSale SEND = OUT source + IN destination, while explicitly stating `NOT EXECUTED IN PRODUCTION`. fileciteturn193file0

Production behavior is known; final Target behavior is `TARGET DECISION REQUIRED`.

### P0 — DirectReturn Target conflict
Current/Production: RECEIVE = IN to destination only. fileciteturn186file0turn181file0

The unreleased release migration contains another model: DirectReturn RECEIVE = OUT source + IN destination. fileciteturn193file0

Final Target behavior is `TARGET DECISION REQUIRED`.

### P1 — CANCEL deployed definition not yet proven
Current `cancel-stock-voucher` calls `cancel_manual_stock_voucher_atomic(uuid,text,text)`, but the reviewed persisted Production evidence does not contain the complete deployed CANCEL definition. Therefore CANCEL state, stock, log, audit, failure and replay behavior are `UNKNOWN`. fileciteturn190file0

### P1 — Full schema contract incomplete
EVIDENCE-014 is not sufficient to prove every table/column referenced by CREATE/POST/COMPLETE/CANCEL. fileciteturn182file0turn176file0turn181file0

### P1 — Audit path incomplete
General `audit_log` architecture is documented, but explicit Manual Voucher COMPLETE/CANCEL audit generation is not proven. fileciteturn195file0

---

## ROOT CAUSE

1. **Schema/RPC divergence:** deployed COMPLETE writes a column absent from the proven Production schema. fileciteturn176file0turn182file0
2. **Competing lifecycle definitions:** Architecture/current rules, deployed Production, Current code, Original, and unreleased migrations do not fully agree, demonstrated by DirectSale and DirectReturn. The execution status explicitly requires this reconciliation before patching. fileciteturn172file0
3. **Audit contract not frozen:** the system documents a general audit layer, but the evidence does not prove where completion/cancellation actor evidence is authoritatively stored. Adding `completed_by` merely to silence the RPC is therefore unsafe. fileciteturn191file0turn195file0

---

## MINIMUM SAFE PATCH

**No implementation patch is authorized by this report.** The smallest safe boundary is limited to:

1. Resolve `complete_manual_stock_voucher_atomic` against the finalized audit contract; do not add `completed_by` merely to remove the error.
2. Reconcile/patch `cancel_manual_stock_voucher_atomic` only after its deployed definition is proven and compared with Target.
3. Modify `post_manual_stock_voucher_atomic` and `manual-voucher-rules.ts` only if CTO selects DirectSale/DirectReturn Target semantics different from current Production.
4. Touch the corresponding Edge Functions only when required to preserve the selected atomic contract.

No unrelated Inventory/RLS/Van Sales redesign belongs in this patch.

---

## P0/P1 BLOCKERS

| Priority | Blocker | Classification |
|---|---|---|
| P0 | COMPLETE writes missing `completed_by` | PROVEN |
| P0 | DirectSale Target unresolved | TARGET DECISION REQUIRED |
| P0 | DirectReturn Target unresolved | TARGET DECISION REQUIRED |
| P1 | CANCEL deployed definition unavailable in persisted reviewed evidence | UNKNOWN |
| P1 | Full Production schema contract incomplete | UNKNOWN |
| P1 | COMPLETE/CANCEL audit effects unproven | UNKNOWN |

Current phase remains `NO GO`; GO is CTO-only. fileciteturn172file0

---

## VALIDATION PLAN

After Target decisions and the approved patch:

1. Static preflight: Production schema, all deployed RPC definitions, Current Edge vs RPC, Original preservation analysis, DirectSale, DirectReturn, CANCEL, audit, company isolation.
2. One self-cleaning lifecycle test: CREATE → SEND → RECEIVE (including partial/full where Target requires) → COMPLETE, plus a separate valid CANCEL scenario.
3. After every movement assert exact stock mutation count, `inventory_log` count, `allocated_qty` unchanged unless explicitly Targeted, voucher state, actor/audit evidence, and no duplicate movement.
4. Negative-path tests must prove no partial stock/log/status mutation remains.
5. Do not proceed to `vouchers.html` until the Manual Voucher contract is internally consistent across Architecture → Target → Production schema → deployed RPC → Current Edge → Original preservation analysis → validation evidence.

---

## REQUIRED NEW EVIDENCE

### EVIDENCE-015 — Complete Production Manual Voucher Schema Contract
**Purpose:** prove every table/column referenced by deployed Manual Voucher RPCs.

**Exact query target:** `information_schema.columns` for `public.stock_vouchers`, `public.stock_voucher_details`, `public.stock_branches`, `public.inventory_log`, `public.branches`, `public.items`, `public.app_settings`, `public.audit_log`.

**Return:** `table_name, ordinal_position, column_name, data_type, is_nullable, column_default`.

**Expected output:** complete column inventory for all listed tables.

**Proposed filename:** `SQL_Evidence/diagnostics/EVIDENCE-015-MANUAL-VOUCHER-PRODUCTION-SCHEMA.csv`

### EVIDENCE-016 — Complete deployed Manual Voucher RPC Contract
**Purpose:** close missing deployed CANCEL evidence and preserve exact deployed signatures/definitions for the complete lifecycle.

**Exact query target:** `pg_proc` + `pg_get_functiondef()` for `create_manual_stock_voucher_atomic`, `post_manual_stock_voucher_atomic`, `complete_manual_stock_voucher_atomic`, `cancel_manual_stock_voucher_atomic`.

**Return:** `function_name, identity_arguments, security_definer, function_definition`.

**Expected output:** one complete deployed definition for every function, including exact CANCEL body.

**Proposed filename:** `SQL_Evidence/diagnostics/EVIDENCE-016-MANUAL-VOUCHER-DEPLOYED-RPCS.csv`

### EVIDENCE-017 — Manual Voucher Audit Path
**Purpose:** prove whether COMPLETE/CANCEL actor evidence is already captured by triggers/functions/audit_log.

**Exact query target:** database triggers and trigger functions for `stock_vouchers`, `stock_voucher_details`, `audit_log`, plus any deployed function directly responsible for audit capture.

**Return:** `event_object_table, trigger_name, event_manipulation, action_timing, action_statement` plus complete trigger-function definitions where applicable.

**Expected output:** proof of the authoritative audit path for completion/cancellation.

**Proposed filename:** `SQL_Evidence/diagnostics/EVIDENCE-017-MANUAL-VOUCHER-AUDIT-PATH.csv`

No other new evidence is requested at this phase.

---

## CTO DECISION REQUEST

### Decision 1 — Completion actor contract
After EVIDENCE-017, select the existing authoritative audit mechanism if it already satisfies the Target, or explicitly authorize a schema change only if evidence proves it necessary. Do not add `completed_by` merely to silence the RPC.

### Decision 2 — DirectSale Target
Choose explicitly:
- **A — current Production:** SEND = OUT source only.
- **B — unreleased migration:** SEND = OUT source + IN destination.

Production currently proves A; final Target intent is not proven by Production evidence alone. fileciteturn181file0turn193file0

### Decision 3 — DirectReturn Target
Choose explicitly:
- **A — current Production:** RECEIVE = IN destination only.
- **B — unreleased migration:** RECEIVE = OUT source + IN destination.

Production currently proves A; final Target intent remains a CTO Target decision. fileciteturn181file0turn193file0

### Gate
`NO GO — PHASE 1 RECONCILIATION NOT YET CLOSED`

No Production change, SQL execution, schema change, or patch was performed by this analysis.