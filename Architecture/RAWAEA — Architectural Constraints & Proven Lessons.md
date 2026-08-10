# RAWAEA ERP — Architectural Constraints & Proven Lessons

**Status:** Active architectural constraints for ongoing rescue/refactoring work
**Scope:** Inventory repair and all subsequent application/Edge Function/database work
**Branch recorded on:** `rescue/manual-vouchers-inventory-core`

---

## 1. Purpose

This document records architectural principles and lessons that have been verified during the rescue work and must not be lost between assistants, phases, or refactors.

It is a companion to the Architecture Constitution and the Main Warning Register. It is not permission to redesign unrelated parts of the system.

---

## 2. Core Rule — Do Not Diagnose in Isolation

A finding in one table, Edge Function, RLS policy, application, or migration must not be interpreted in isolation.

Before changing it, reconcile it with:

- Architecture Constitution
- Security model
- execution/authorization model
- source-of-truth rules
- existing business workflow
- actual production schema evidence
- equivalent functions/applications
- historical warnings and previous failure modes

**Observed != defective.**

A technically unusual implementation is not automatically a defect. A defect must be demonstrated against the Target Design, an explicit security requirement, or an actual business/integrity violation.

---

## 3. RLS Principle — Do Not Equate Broad RLS With Automatic Failure

The project has previously adopted an architecture in which operational users may need to write to tables they are authorized to use, while business authorization and sensitive operation control can be enforced through the application/Edge Function layer and atomic database primitives.

Therefore:

- `RLS = broad` is an **observed architectural fact**, not by itself a defect.
- `Allow all for all` must not automatically trigger an RLS rewrite.
- RLS must be evaluated together with Authentication, Edge Authorization, RPC exposure, SECURITY DEFINER behavior, and the actual data path.
- No RLS policy may be tightened merely because it looks less restrictive than a generic security checklist.
- Any proposed RLS change requires proof that the current architecture fails to provide the intended isolation/security, or an explicit Target decision authorizing the change.

**Current classification of EVIDENCE-003:**

`KNOWN / ARCHITECTURAL REVIEW REQUIRED`

Not `FIX REQUIRED`.

---

## 4. Authentication Is Not Authorization

The system must distinguish:

1. authenticated identity;
2. application/operational authorization;
3. authorization to execute a specific business operation;
4. database integrity enforcement.

A valid authenticated user does not automatically have permission to perform every business operation.

Conversely, database RLS must not be used as a substitute for understanding the application's actual authorization model.

---

## 5. Atomic Business Operations

Inventory-changing business events must be executed atomically where the Target requires atomicity.

The Edge Function is not itself the complete business transaction. It is the controlled API boundary that authenticates/contextualizes/authorizes/validates the request and invokes the appropriate atomic primitive.

The database primitive owns the integrity-critical operation where the Target assigns that responsibility.

No partial success is acceptable for a transaction whose contract requires all-or-nothing behavior.

---

## 6. Source of Truth Principle

The system manages **Business Events**, not merely tables.

For every business fact, the architecture must identify:

- who creates it;
- who is allowed to change it;
- where its authoritative state lives;
- where its historical/audit evidence lives;
- which data is derived.

A derived or aggregated table must not silently become a competing source of truth.

---

## 7. Inventory Truth

`inventory_log` is the historical/audit trail of inventory movement.

`stock_branches` represents current stock state/snapshot.

These concepts must not be confused:

- current state != movement history;
- reservation != physical stock movement;
- operational event != accounting interpretation.

Inventory-changing events must leave the required audit trail and must not be independently implemented in multiple competing business engines.

---

## 8. One Central Inventory Engine

The rescue program is based on converging inventory mutations toward a central, controlled inventory engine/atomic primitive rather than patching each Edge Function independently.

Existing functions are adapters/orchestrators around the central business engine where appropriate.

The objective is:

`one business event → one authoritative inventory mutation → one audit trail`

This does **not** mean every inventory function must be rewritten. Only proven conflicts, unsafe duplication, or Target violations should be changed.

---

## 9. Applications Are Operational Event Sources, Not Isolated Islands

Operational PWA applications are execution interfaces.

They may initiate valid business events, but they are not independent business systems.

They must share one central business/inventory/accounting heart.

They must not independently create conflicting truths, bypass central business rules, or become autonomous databases.

The highest objective is to make the user's operational work easier **without compromising protection of the company and the business it operates**.

---

## 10. Central Authority for Material Decisions

Operational applications must not independently create or redefine material master/structural decisions such as:

- companies;
- branches;
- warehouses;
- customers;
- accounts;
- other decisions explicitly classified as central/master-data decisions.

Such decisions belong to the central system/authority model.

Operational apps are event sources and execution tools, not autonomous islands.

---

## 11. V1 Company Scope Constraint

The current product version is intended to operate as **one company with multiple branches and multiple users**.

`company_id` remains in the model because the architecture must remain extensible toward future multi-company editions.

Do not turn this current Inventory rescue into a multi-company redesign.

Do not remove `company_id` merely because V1 operates with one company.

Do not introduce a second-company workflow unless it is explicitly required by the current Target.

---

## 12. System Owner / Control Plane Constraint

The system owner/control authority already exists separately from ordinary operational users.

Do not create a new owner-control architecture as part of the current Inventory rescue.

Do not merge owner control, licensing/control-plane authority, and ordinary operational permissions merely for implementation convenience.

Preserve the existing separation unless a future explicit architecture decision changes it.

---

## 13. Evidence Classification

Every important conclusion must be classified as one of:

- **PROVEN** — directly supported by authoritative evidence.
- **STATIC ONLY** — established by source/schema/code inspection but not empirical execution.
- **KNOWN / ARCHITECTURAL REVIEW REQUIRED** — observed and important, but not yet proven to be a defect.
- **UNKNOWN** — evidence insufficient.
- **TARGET DECISION REQUIRED** — architecture cannot safely choose a behavior from current evidence.

Never convert `UNKNOWN` into a guess.
Never convert `STATIC ONLY` into empirical PASS.
Never convert an observed difference into a defect without reconciliation.

---

## 14. Production Safety Rule

The system is under construction and has no real operational production dataset that must be preserved as business history for this rescue work.

Nevertheless, the database being used for validation is the original Production environment and therefore must be treated as production infrastructure.

Validation must be read-only whenever possible.

Any experimental data, if ever explicitly approved, must be designed to leave no persistent business contamination or misleading operational evidence.

No migration, mutation, or deployment should be performed merely to discover what the current schema does when read-only evidence can answer the question.

---

## 15. No Global Redesign During Local Repair

The current rescue sequence is intentionally incremental:

1. Manual Stock Vouchers and their lifecycle.
2. Direct/Van Sales path that depends on them.
3. Other applications and their Edge Functions/database dependencies.
4. Broader inventory reconciliation only where evidence shows it is necessary.

A discovery in one subsystem must not automatically reopen the entire rescue plan.

Fix the smallest coherent boundary that establishes the Target correctly.

---

## 16. Competitor Principle

Do not reinvent proven ERP patterns without a reason.

Established ERP/WMS/accounting systems represent years and substantial investment in resolving concurrency, inventory integrity, auditability, authorization, and transaction design.

Their proven patterns should be studied and reused where appropriate.

RAWAEA's innovation should be in its fit, integration, usability, and business intelligence — not in unnecessarily reinventing foundational transaction mechanics.

---

## 17. No Code Before Target Reconciliation

Before changing a function that participates in a critical business flow:

- inspect the complete Original;
- inspect the complete Current;
- inspect relevant schema evidence;
- inspect Architecture and warning documents;
- inspect equivalent functions/apps;
- identify the Target behavior;
- classify uncertainties;
- only then implement.

Line count is never a measure of correctness.

Original is evidence of historical behavior, not automatically the Target.
Current is evidence of current behavior, not automatically the Target.

---

## 18. Current Inventory Rescue Interpretation

For the Manual Stock Voucher repair, the presence of broad RLS policies in EVIDENCE-003 must remain recorded as an architectural fact while the complete security path is reconciled.

The immediate objective is **not** to redesign RLS.

The immediate objective is to establish whether the complete path:

`Authentication → Edge Authorization → Business Rules → Atomic Primitive → Database Integrity`

provides the intended security and company/branch isolation for the Manual Voucher operations.

Only if evidence demonstrates a real gap should an RLS or authorization redesign be proposed.

---

## 19. Anti-Loop Rule

The rescue must produce working outcomes, not endless documentation cycles.

Documentation is required when it:

- records a durable architectural decision;
- prevents a known historical mistake;
- defines a Target contract needed for implementation;
- records evidence necessary for safe execution.

Documentation must not become a substitute for implementation, validation, or measurable progress.

Once a decision is sufficiently proven, proceed to the next executable step.

---

## 20. Governing Principle

**Protect the business first, simplify the user's work second, and never achieve one by sacrificing the other.**

The architecture exists to make operational work easy while ensuring that every material business event is controlled, traceable, auditable, and consistent with the company's truth.
