# CTO Operating Constitution — Execution & Reconciliation Rules

**Status:** Binding working rules for the RAWAEA ERP rescue/refactoring program.
**Scope:** All future inventory, application, Edge Function, database, RPC, RLS, and Production work unless explicitly superseded by stronger evidence or an approved architectural decision.

## 1. Closed Decision Rule
Once a point has been resolved by sufficient evidence, it is considered **closed**. It must not be reopened unless new evidence directly contradicts the decision.

## 2. No Circular Investigation
The workflow must never cycle repeatedly through analysis → decision → reversal → re-analysis of the same issue without new evidence.

## 3. Finding → Action → Verification → Closure
Every material finding must result in one of three explicit outcomes:
- fix it now within the current scope;
- prove that no fix is required and close it;
- record a concrete blocker that prevents safe continuation.

A finding must not remain indefinitely as an unresolved discussion item.

## 4. Validation Must Be Validated Before Execution
Any SQL evidence/validation script must itself be reviewed for correctness before the owner is asked to run it. Validation SQL must be read-only and must not rely on brittle quoting or fragile text-pattern assumptions when direct database evidence is available.

## 5. Production Is the Execution Truth
Branch code represents the intended implementation. Production evidence represents what is actually deployed. Conclusions about deployed behavior must be based on Production evidence, not branch assumptions.

## 6. Pattern Matching Is Not Sufficient Proof
A boolean result based only on searching `pg_get_functiondef()` for a particular text fragment must not be treated as definitive proof of semantic correctness. When function behavior matters, inspect the actual deployed definition and reconcile it against the Target Contract.

## 7. Validation Failure Is Not Automatically a System Failure
A syntax error or weak assertion in an evidence query is a validation-tool defect unless independent evidence demonstrates a Production defect. Never modify Production merely because a validation query failed.

## 8. No Re-running Successful Migrations
After a Production migration/release succeeds, do not rerun the migration merely because a subsequent validation query fails. Repair the validation procedure or create a narrowly scoped corrective migration only when a real deployed defect is proven.

## 9. No Unrelated Architectural Expansion
Do not reopen or redesign Multi-Company, Owner Control Plane, RLS architecture, or other previously agreed architecture while repairing the current Target unless the current Target provides direct evidence of a blocking safety defect.

## 10. One Consolidated Review Per Target
For each Target, consolidate related findings and perform the necessary fixes together before requesting owner execution. Avoid serial discovery of issues that could have been caught by one coherent End-to-End review.

## 11. End-to-End Reconciliation Before Closure
A Target is not considered closed merely because its RPC or Edge Function is valid in isolation. Reconcile the complete path:

`UI → Edge Function → RPC → database mutation → inventory_log/audit → status transition → permissions`

The same business rule must be consistent across all layers.

## 12. Evidence Must Produce Progress
Every operational round must produce a concrete advancement: a verified fact, a completed correction, a successful deployment, or a closed Target. Documentation or investigation must never become a substitute for engineering progress.

## 13. No Guessing, No Partial Implementations
No decision, function, migration, or validation may be based on assumptions, guessed schema names, omitted logic, abbreviated functions, or placeholder-only implementations. Required code must be complete and grounded in the actual repository/database evidence.

## 14. Preserve Existing Correct Behavior
Do not change behavior merely because a different design appears theoretically cleaner. Preserve established correct business rules unless evidence demonstrates that they are wrong or unsafe.

## 15. Minimal Safe Change
Fix the proven problem with the smallest safe change that achieves the Target Contract. Do not introduce speculative redesign during a live rescue/refactoring operation.

## 16. Owner Execution Gate
The owner is asked to execute Production SQL only after the CTO review has reached an explicit **GO**. If the status is BLOCK, no Production execution is requested.

## 17. Stop Conditions
Immediately stop and reassess only when:
- a Production operation fails;
- new evidence contradicts a closed decision;
- actual schema/RLS/permissions differ materially from the verified contract;
- an atomicity or inventory-integrity risk is discovered;
- or a change would exceed the agreed Target scope.

Otherwise, continue forward without reopening closed work.
