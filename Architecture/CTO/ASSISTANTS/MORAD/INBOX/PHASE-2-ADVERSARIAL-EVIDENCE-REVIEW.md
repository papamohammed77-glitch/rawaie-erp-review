# CTO TASK — PHASE 2 ADVERSARIAL EVIDENCE REVIEW — MORAD

Branch: `rescue/manual-vouchers-inventory-core`

## Objective
Review the evidence-closure plan and Phase 1 findings only. Do not repeat Phase 1 and do not implement anything.

## Read first
- `Architecture/CTO/ASSISTANTS/HUSSEIN/OUTBOX/PHASE-1-PRODUCTION-CONTRACT.md`
- `Architecture/CTO/ASSISTANTS/MORAD/OUTBOX/PHASE-1-ADVERSARIAL-REVIEW.md`
- `Architecture/CTO/ASSISTANTS/HUSSEIN/INBOX/PHASE-2-EVIDENCE-CLOSURE.md`

## Review targets
Determine whether the proposed evidence closures are sufficient to safely reach a Patch decision for:
- completed_by / audit path
- CANCEL
- DirectSale custody
- DirectReturn custody
- Partial RECEIVE idempotency
- inventory_log.branch_id discrepancy
- minimum Van Sales end-to-end evidence

## Rules
- NO GUESSING.
- NO Production changes.
- NO Patch.
- Do not demand evidence that is not necessary to decide safety/correctness.
- Distinguish PROVEN / UNKNOWN / TARGET DECISION REQUIRED.
- Raise only P0/P1 blockers.

## Output
Write the complete result to:
`Architecture/CTO/ASSISTANTS/MORAD/OUTBOX/PHASE-2-ADVERSARIAL-EVIDENCE-REVIEW.md`

Use exactly:
ACCEPTED EVIDENCE PLAN
MISSING EVIDENCE
UNNECESSARY WORK
P0/P1 BLOCKERS
REQUIRED CORRECTIONS
NEXT GATE

After verifying the OUTBOX file exists on this branch, send only in chat:
`تم الرد — MORAD — PHASE-2-ADVERSARIAL-EVIDENCE-REVIEW.md`
