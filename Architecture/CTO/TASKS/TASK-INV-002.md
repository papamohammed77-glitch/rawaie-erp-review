# TASK-INV-002 — Evidence Closure & Reconciliation

Branch: `rescue/manual-vouchers-inventory-core`

## Communication
The user will send only this TASK ID to each assistant. The assistant must open this file from GitHub, execute the role assigned below, write the result to the specified OUTBOX, verify the file exists on this branch, then reply in chat only:

`تم — TASK-INV-002`

No substantive report in chat.

## Shared objective
Close the remaining evidence blockers from Phase 1 before any Patch, Schema change, Migration, or Production modification.

## Hussein role — Evidence Owner
Read:
- `Architecture/CTO/ASSISTANTS/HUSSEIN/OUTBOX/PHASE-1-PRODUCTION-CONTRACT.md`
- `Architecture/CTO/ASSISTANTS/MORAD/OUTBOX/PHASE-1-ADVERSARIAL-REVIEW.md`
- `SQL_Evidence/diagnostics/EVIDENCE-MANUAL-VOUCHER-RPC-DEFINITIONS-V1.csv`
- relevant current SQL evidence and actual Production schema/RPC definitions.

Close only these facts:
1. deployed manual voucher RPC definitions and privileges;
2. CANCEL behavior;
3. DirectSale custody;
4. DirectReturn custody;
5. partial RECEIVE idempotency;
6. `inventory_log.branch_id` schema discrepancy;
7. minimum Van Sales evidence required.

Every conclusion must be PROVEN / UNKNOWN / TARGET DECISION REQUIRED.
Create only the minimum necessary evidence artifacts. No patch.

Hussein output:
`Architecture/CTO/ASSISTANTS/HUSSEIN/OUTBOX/TASK-INV-002.md`

## Morad role — Adversarial Reviewer
Read the same Phase 1 reports and the evidence artifacts already present in the repository. Review the evidence questions independently.

Do not repeat Phase 1. Do not create speculative requirements. Identify only:
- evidence that is still missing;
- evidence that is sufficient;
- P0/P1 safety blockers;
- whether any proposed target decision would risk stock duplication/loss, custody ambiguity, partial writes, retry duplication, audit gaps, or security/RLS issues.

Morad output:
`Architecture/CTO/ASSISTANTS/MORAD/OUTBOX/TASK-INV-002.md`

## Hard rules
- NO GUESSING.
- NO schema alteration.
- NO migration.
- NO production patch.
- No adding `completed_by` merely to satisfy a failing RPC.
- Do not start the next phase.
- Do not declare GO.
- Use actual table/column/function names verified from Production evidence.
- Testing, if absolutely required for evidence, must be self-cleaning and leave no persistent test data.

## Completion gate
CTO will reconcile both OUTBOX reports. Only CTO can authorize the next task.
