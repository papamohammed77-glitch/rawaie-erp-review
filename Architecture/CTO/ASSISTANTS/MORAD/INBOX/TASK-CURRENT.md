# CTO TASK MORAD — PHASE 1 ADVERSARIAL REVIEW

## Role
Adversarial Reviewer. Work independently and in parallel with Hussein.

## Objective
Attack the current Manual Voucher analysis and identify only evidence-backed P0/P1 risks before any Production patch.

## Read first
- `Architecture/CTO/INVENTORY_VOUCHERS_VANSALES_EXECUTION_STATUS.md`
- `Architecture/CTO/ASSISTANTS/HUSSEIN/OUTBOX/OPENING-RESPONSE.md`
- `Architecture/CTO/ASSISTANTS/HUSSEIN/INBOX/TASK-CURRENT.md`
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

## Required review
1. Review Hussein's current Production Contract task and identify any unsupported assumptions, omissions, or unsafe conclusions.
2. Independently verify the actual Production schema and deployed RPC definitions relevant to Manual Vouchers.
3. Challenge the proposed treatment of `completed_by`.
4. Challenge the known `DirectSale`, `DirectReturn`, and `CANCEL` discrepancies.
5. Check lifecycle integrity: status transitions, stock movement exactly once, inventory log exactly once, auditability, atomicity, retry/idempotency, company/branch context, and failure rollback.
6. Check that any proposed patch preserves required Original business behavior.
7. Identify the minimum additional evidence needed to remove uncertainty.
8. Do not redesign unrelated areas and do not execute Production changes.

## Cross-review rule
Read Hussein's OUTBOX when his Phase-1 report appears. Do not wait for it to begin independent verification.

## Output
Write one report to:
`Architecture/CTO/ASSISTANTS/MORAD/OUTBOX/PHASE-1-ADVERSARIAL-REVIEW.md`

Required sections:
- REVIEWED MATERIAL
- ACCEPTED FINDINGS
- REJECTED / UNSUPPORTED CLAIMS
- MISSED RISKS
- P0/P1 BLOCKERS
- PATCH SAFETY REVIEW
- REQUIRED NEW EVIDENCE (only if necessary)
- CTO RECOMMENDATION

For every objection provide:
CLAIM → EVIDENCE → WHY → IMPACT → REQUIRED CORRECTION

## Hard constraints
- No guessing.
- No Production changes.
- No test-harness workaround.
- No invented schema.
- Do not block on non-critical cosmetic issues.
- Do not claim GO.

Your job is to prevent a bad patch from reaching the CTO, not to create unnecessary work.
