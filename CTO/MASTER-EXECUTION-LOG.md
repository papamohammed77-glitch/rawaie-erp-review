# RAWAEA ERP — CTO MASTER EXECUTION LOG

## Purpose
Central tracking record for the Inventory / Vouchers / Van Sales rescue plan.

## Approved Decomposition
- Phase A — Truth Baseline: TASK-001..004 — COMPLETE / GO
- Phase B — Movement Understanding: TASK-005..008 — COMPLETE / GO
- Phase C — Critical Risks: TASK-009..012 — COMPLETE / GO (TASK-010 FINDING carried forward)
- Phase D — Inventory Core: TASK-013..016 — CLOSED / GO
- Phase E — Manual Vouchers: TASK-017..024 — CLOSED / GO
- Phase F — vouchers.html:
  - TASK-025 Original / Owner / Gold Contract Reconciliation — OPEN
  - TASK-026 Implementation — NOT STARTED (candidate quarantined)
  - TASK-027 Runtime E2E / Gold Gate — NOT STARTED
- Phase G: STAGE-28 = TASK-028..032 — PENDING
- Phase H: STAGE-33 = TASK-033..038 — PENDING
- Phase I: STAGE-39 = TASK-039..044 — PENDING
- Phase J: STAGE-45 = TASK-045..049 — PENDING
- Phase K: STAGE-50 = TASK-050..052 — PENDING
- STAGE-53 = TASK-053 — PENDING
- STAGE-54 = TASK-054 — PENDING
- STAGE-55 = TASK-055 — PENDING

## CTO Working Method
- One Stage = one coherent execution unit → one comprehensive verification → one decision → next Stage.
- Do not subdivide simple stages artificially; split only for real safety, evidence, concurrency, or dependency isolation.
- No guessing; no repeating valid evidence; comprehensive queries whenever practical; comprehensive verification whenever practical.
- Documentation supports durable evidence and decisions; it is never a substitute for implementation or measurable progress.
- A task is not Production-implemented merely because a report, migration, or candidate file exists in GitHub. Implementation/test tasks require actual execution in the target system and direct verification.
- **Application Gold Rule:** no application file may be called Gold/Diamond/Production-ready before Original Feature Inventory + Owner Goals + Production Contract reconciliation + Gold Reference review + Feature Parity Matrix + Runtime verification are closed.
- **Application Delivery Rule:** Original → Owner Goals → Production Contracts → Gold References → Feature Parity Matrix → Corrected Candidate → Static Audit → Runtime E2E → Production Deploy → Post-Deploy Gate.
- **Merged Stage Rule:** merged tasks remain traceable by original IDs; split only when a real safety/evidence/dependency boundary exists.
- **STAGE-25 Exception:** vouchers.html crosses Contract, Implementation, and Runtime/Gold safety boundaries, so TASK-025 / TASK-026 / TASK-027 remain separate gates.

## Constitutional Principles
1. Diagnose critical findings in context.
2. Broad RLS is not automatically a defect.
3. Authentication ≠ authorization.
4. Target-required business operations are atomic.
5. One business fact has one authoritative source of truth and one authoritative movement history.
6. Inventory mutations converge on one central controlled business engine.
7. Applications are operational event sources, not autonomous business systems or databases.
8. Preserve V1 one-company/multi-branch architecture unless explicitly changed.
9. Repair the smallest coherent boundary; do not reopen unrelated domains.
10. No critical code change before Target reconciliation.
11. Evidence classifications remain explicit.
12. Production Schema + Persisted Evidence + Actual Deployed Definitions outrank assumptions, names, migrations, and historical code.
13. Important read-only Production evidence must be persisted.
14. Lifecycle responsibility for state, physical stock, history, audit, and closure must be explicit and non-duplicated.
15. Treat validation infrastructure as Production infrastructure; control test data.
16. Protect the business first, simplify operational work second.
17. Anti-loop: once sufficiently proven, move to execution.
18. **Production Reality Gate:** no task is implemented without actual target-system execution and direct evidence.

## Current Execution State
### TASK-010
**COMPLETE / FINDING / GO TO TASK-011.** Production test proved non-idempotent repeated logical partial RECEIVE; no patch applied at TASK-010.

### TASK-013 / TASK-014
**CLOSED / GO.** `public.post_stock_movement(...)` deployed in Production and passed implementation verification.

### TASK-015
**CLOSED / GO.** Comprehensive Production stock-engine tests passed; test data rolled back.

### TASK-016
**CLOSED / GO.** Production Gate PASS.

### TASK-017
**CLOSED / GO.** Voucher lifecycle contract established against Production RPCs.

### TASK-018
**CLOSED / GO.** Production PASS. SEND adapter and central movement path verified.

### TASK-019
**CLOSED / GO.** Production PASS. Transfer SEND → TransferOut; Transfer RECEIVE → TransferIn; DirectReturn RECEIVE → DirectReturn. `received_by` was rejected by actual schema; final implementation uses `received_date` only.

### TASK-020
**CLOSED / GO.** Production PASS: 100 → receive 60 → remaining 40 → over-receive rejected → receive 40 → Received.

### TASK-021
**CLOSED / GO.** Production PASS. DirectSale Sent → Completed; Transfer Received → Completed; `completed_by` and `completed_at` verified; Complete adds no stock movement.

### TASK-022
**CLOSED / GO.** Production PASS. Draft → Cancelled with no stock/log mutation; Cancel after Send rejected.

### TASK-023
**CLOSED / GO.** Production integration pass.

### TASK-024
**CLOSED / GO.** Production Voucher Gate PASS.

### TASK-025 — Original / Owner / Gold Contract Reconciliation
**OPEN — NEXT.**
Candidate commit `c093e2f79c81e3a03f5dbb04ce2f22ce7226e737` is quarantined and NOT Production-ready. Required: complete original feature inventory, Owner Goals, Production Voucher Core contracts, Gold comparison (`returns.html`, `picker.html`), and Feature Parity Matrix. Blocking findings include DirectReturn branch/custody semantics, SupplierReturn target semantics, read-contract/company scoping, and unproven runtime feature parity.

### TASK-026 — Implementation
**NOT STARTED — must follow TASK-025 Gate.**

### TASK-027 — Runtime E2E / Gold Gate
**NOT STARTED — must follow TASK-026 and runtime proof before Production deployment.**

## Next Execution Boundary
**TASK-025 — Original / Owner / Gold Contract Reconciliation.**
