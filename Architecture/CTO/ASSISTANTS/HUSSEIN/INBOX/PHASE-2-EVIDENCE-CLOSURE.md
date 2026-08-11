# CTO TASK — PHASE 2 EVIDENCE CLOSURE — HUSSEIN

Branch: `rescue/manual-vouchers-inventory-core`

## Objective
Close only the evidence gaps identified in Phase 1 and Morad's adversarial review. Do not redesign, patch, migrate, or modify Production.

## Read first
- `Architecture/CTO/ASSISTANTS/HUSSEIN/OUTBOX/PHASE-1-PRODUCTION-CONTRACT.md`
- `Architecture/CTO/ASSISTANTS/MORAD/OUTBOX/PHASE-1-ADVERSARIAL-REVIEW.md`
- `SQL_Evidence/diagnostics/EVIDENCE-MANUAL-VOUCHER-RPC-DEFINITIONS-V1.csv`
- relevant existing SQL evidence under `SQL_Evidence/diagnostics/`

## Required closures
1. Production definitions and privileges for the manual voucher lifecycle RPCs.
2. Exact Production behavior/definition for CANCEL.
3. DirectSale custody rule.
4. DirectReturn custody rule.
5. Partial RECEIVE idempotency / repeat-execution behavior.
6. Reconcile the `inventory_log.branch_id` architectural statement against actual Production schema.
7. Identify the minimum additional evidence needed for Van Sales end-to-end, without expanding scope unnecessarily.

## Rules
- NO GUESSING.
- NO Production changes.
- SQL execution only if explicitly necessary to obtain evidence; if executed, use self-cleaning/read-only diagnostics unless the task proves a temporary transactional test is required.
- Do not add schema columns.
- Do not write a Patch.
- Do not resolve Target Decisions by assumption.
- Every conclusion must be PROVEN, STATIC, UNKNOWN, or TARGET DECISION REQUIRED.

## Output
Write the complete result to:
`Architecture/CTO/ASSISTANTS/HUSSEIN/OUTBOX/PHASE-2-EVIDENCE-CLOSURE.md`

Include only:
FACTS CLOSED
EVIDENCE FILES CREATED
REMAINING UNKNOWN
TARGET DECISIONS REQUIRED
BLOCKERS (P0/P1 only)
RECOMMENDED NEXT STEP

After verifying the OUTBOX file exists on this branch, send only in chat:
`تم الرد — HUSSEIN — PHASE-2-EVIDENCE-CLOSURE.md`
