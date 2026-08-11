# CTO TASK HUSSEIN — PHASE 1 PRODUCTION CONTRACT

## Role
Lead Analyst. Work independently and in parallel with Morad.

## Objective
Close the current Manual Voucher blocker and establish the minimum Production Contract required before any patch.

## Read first
- `Architecture/CTO/INVENTORY_VOUCHERS_VANSALES_EXECUTION_STATUS.md`
- `Architecture/CTO/ASSISTANTS/HUSSEIN/OUTBOX/OPENING-RESPONSE.md`
- `Architecture/CTO/ASSISTANTS/MORAD/OUTBOX/OPENING-RESPONSE.md`
- `docs/Draft/رد المساعد حسين.md`
- `docs/Draft/رد المساعد مراد.md`
- `SQL_Evidence/diagnostics/EVIDENCE-MANUAL-VOUCHER-RPC-DEFINITIONS-V1.csv`
- relevant existing SQL Evidence in `SQL_Evidence/diagnostics/`
- `docs/00_REVIEW_START_HERE.md`
- `docs/06_SYSTEM_ARCHITECTURE.md`
- `docs/09_DATABASE_DOCUMENTATION.md`
- `docs/10_API_CATALOG.md`
- `docs/13_SECURITY_MODEL.md`
- `docs/17_ARCHITECTURAL_DECISIONS.md`

## Required analysis
1. Verify actual Production schema for every table/column used by the Manual Voucher RPCs. Do not rely on memory or migration names.
2. Verify the complete deployed definitions/signatures of the Manual Voucher RPCs.
3. Resolve `completed_by`: determine whether the correct fix is schema, RPC, or another existing audit mechanism. Do NOT add the column merely to silence the error.
4. Resolve the known `DirectSale`, `DirectReturn`, and `CANCEL` discrepancies across Production / Current / Original / Migration.
5. Identify only P0/P1 discrepancies that can affect data integrity, stock correctness, lifecycle correctness, or release safety.
6. Define the smallest safe corrective patch set. No SQL execution and no Production modification.
7. Define one self-cleaning validation sequence that proves the corrected Manual Voucher lifecycle.

## Evidence rule
If existing evidence proves a fact, reuse it. Request new evidence only when strictly necessary. For every required new query, specify:
- exact purpose
- exact query target
- expected output
- proposed Evidence filename

## Output
Write one report to:
`Architecture/CTO/ASSISTANTS/HUSSEIN/OUTBOX/PHASE-1-PRODUCTION-CONTRACT.md`

Required sections:
- CONFIRMED FACTS
- PRODUCTION CONTRACT
- DISCREPANCIES
- ROOT CAUSE
- MINIMUM SAFE PATCH
- P0/P1 BLOCKERS
- VALIDATION PLAN
- REQUIRED NEW EVIDENCE (only if necessary)
- CTO DECISION REQUEST

## Hard constraints
- No guessing.
- No Production changes.
- No test-harness workaround.
- No schema changes proposed without evidence.
- Do not redesign unrelated modules.
- Do not wait for Morad.
- Do not claim GO.

Your deliverable must be concise, evidence-linked, and directly actionable by the CTO.
