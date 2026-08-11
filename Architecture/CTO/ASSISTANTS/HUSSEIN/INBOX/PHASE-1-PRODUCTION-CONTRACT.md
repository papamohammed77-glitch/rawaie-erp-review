# PHASE 1 — PRODUCTION CONTRACT

## CTO Correction
The previous task reference was incorrectly described as an OUTBOX path. OUTBOX is for your response; INBOX is where CTO tasks are received.

### Your task
Execute Phase 1 analysis now.

### Read first
- `Architecture/CTO/INVENTORY_VOUCHERS_VANSALES_EXECUTION_STATUS.md`
- `Architecture/RAWAEA — Architectural Constraints & Proven Lessons.md`
- `SQL_Evidence/diagnostics/EVIDENCE-MANUAL-VOUCHER-RPC-DEFINITIONS-V1.csv`
- all relevant existing Evidence in `SQL_Evidence/diagnostics/`
- `docs/Draft/مساعدة مساعد سابق.md`
- `docs/Draft/رد المساعد حسين.md`
- `docs/Draft/رد المساعد مراد.md`
- relevant current/original/migration files for Manual Voucher and Van Sales.

### Determine and document
1. Actual Production schema contract for all tables/columns used by Manual Voucher lifecycle.
2. Actual deployed RPC/function signatures and definitions.
3. Every confirmed discrepancy between Production, Current, Original, and Migration.
4. Resolve or explicitly mark `completed_by` as UNPROVEN; do not invent a column.
5. Resolve the `DirectSale`, `DirectReturn`, and `CANCEL` discrepancies.
6. Identify only P0/P1 blockers affecting safe completion of Inventory/Vouchers/Van Sales.
7. Produce the minimum corrective design required for CTO review.

### Output
Write the final analysis to:
`Architecture/CTO/ASSISTANTS/HUSSEIN/OUTBOX/PHASE-1-PRODUCTION-CONTRACT.md`

Do not modify Production. Do not write SQL for execution. Do not issue GO. Do not guess. Cite exact repository/Evidence paths for every material conclusion.
