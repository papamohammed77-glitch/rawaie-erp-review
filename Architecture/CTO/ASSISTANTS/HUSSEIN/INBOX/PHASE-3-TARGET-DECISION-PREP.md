# CTO TASK — PHASE 3 TARGET DECISION PREPARATION

Branch: `rescue/manual-vouchers-inventory-core`

Do NOT implement or modify Production.

Read the latest Hussein and Morad Phase 1/2 outputs that actually exist on this branch. If Phase 2 outputs are absent, do not guess; report BLOCKED in the required OUTBOX file.

Prepare only the minimum evidence-backed decision package for:
1. DirectSale custody.
2. DirectReturn custody.
3. CANCEL lifecycle semantics.
4. `completed_by` / audit handling.
5. Partial RECEIVE idempotency.
6. `inventory_log.branch_id` discrepancy.
7. Minimum Van Sales evidence required before patching.

For each item provide:
- PROVEN FACTS
- OPTIONS ONLY IF EVIDENCE SUPPORTS THEM
- RECOMMENDED TARGET DECISION
- BUSINESS/INVENTORY IMPACT
- SECURITY/ATOMICITY IMPACT
- EXACT EVIDENCE SUPPORT
- CTO DECISION REQUIRED

No SQL patch. No schema change. No migration.

Write result to:
`Architecture/CTO/ASSISTANTS/HUSSEIN/OUTBOX/PHASE-3-TARGET-DECISION-PREP.md`

After verifying the file exists, chat notification only:
`تم الرد — HUSSEIN — PHASE-3-TARGET-DECISION-PREP.md`
