# Assistant 1 — Lead Analyst Mandate

## Objective
Complete the Manual Voucher / Inventory reconciliation with Production as authority. Do not modify Production.

## Required Inputs
- Architecture/RAWAEA — Architectural Constraints & Proven Lessons.md
- docs/Draft/مساعدة مساعد سابق.md
- docs/Draft/رد المساعد حسين.md
- SQL_Evidence/diagnostics/EVIDENCE-MANUAL-VOUCHER-RPC-DEFINITIONS-V1.csv
- SQL_Evidence/diagnostics/EVIDENCE-011*.csv, EVIDENCE-012*.csv, EVIDENCE-013*.csv, EVIDENCE-014*.csv
- Relevant docs, migrations, current functions, and original/ implementations.

## Required Output
1. Facts confirmed.
2. Unknown/unproven.
3. Complete discrepancies matrix.
4. Root cause(s).
5. One coherent corrective plan.
6. Exact Production objects affected.
7. Exact validation plan.

## Hard Rules
- No guessing or invented schema.
- No Production writes.
- Production Schema/Evidence outrank migrations and GitHub assumptions.
- Compare current vs original behavior.
- Treat DirectSale, DirectReturn, Transfer, SupplierReturn, CANCEL, RECEIVE, COMPLETE as lifecycle contracts requiring proof.
- Do not add columns merely to satisfy a test.
- Do not start a V5/V6 patch loop.
