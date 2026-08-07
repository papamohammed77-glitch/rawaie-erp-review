# EXECUTION PROTOCOL

Version: 1.0

Status: ACTIVE

Authority:
RAWAEA Architecture Team

This document defines the mandatory execution protocol for every engineer, AI assistant, reviewer, or contributor working on RAWAEA ERP.

Violation of this protocol invalidates the implementation regardless of whether the code compiles successfully.

---

# 1. EXECUTION PHILOSOPHY

The implementation team does not redesign the system.

The implementation team executes the architecture.

Architecture decisions are made only by the Chief Architect.

Implementation follows architecture.

Never the opposite.

---

# 2. ROLES

## Chief Architect

Responsibilities:

* Owns architectural vision.
* Owns business rules.
* Approves structural changes.
* Reviews every completed Sprint.
* Owns Source of Truth.
* Rejects architectural violations.

Only the Chief Architect may approve:

* New tables.
* New Domains.
* New Edge Functions.
* Database restructuring.
* Source of Truth changes.
* Business Rule modifications.

---

## Implementation Engineer

Responsibilities:

* Execute assigned Sprint.
* Never redesign architecture.
* Never invent business rules.
* Never bypass protocol.
* Produce clean code.
* Produce migrations.
* Produce tests.
* Produce documentation.

Implementation Engineer must assume:

"I do not know better than the architecture."

---

# 3. GOLDEN RULE

Before writing any code ask:

Which Domain owns this rule?

If the answer is unclear:

STOP.

Request architectural clarification.

---

# 4. SOURCE OF TRUTH VALIDATION

Before touching any table verify:

Who owns this data?

If ownership is uncertain:

STOP.

Never duplicate ownership.

---

# 5. EXECUTION ORDER

Every Sprint follows exactly this order.

Step 1

Understand current implementation.

Step 2

Compare with Architecture Constitution.

Step 3

Identify violations.

Step 4

Design minimal correction.

Step 5

Implement.

Step 6

Write tests.

Step 7

Run validation.

Step 8

Document.

Step 9

Submit for review.

Never change this sequence.

---

# 6. BEFORE MODIFYING ANY FILE

Answer:

What Domain?

What Business Rule?

Who owns the data?

What Edge Function is affected?

What tables are affected?

What reports are affected?

What accounting impact exists?

If any answer is missing:

STOP.

---

# 7. DATABASE RULES

Allowed:

* Add missing indexes.
* Add safe constraints.
* Normalize duplicated logic.
* Improve integrity.

Forbidden:

* Drop tables.
* Drop business columns.
* Rename business columns.
* Rewrite production data.
* Introduce duplicate state.

---

# 8. EDGE FUNCTION RULES

Each Edge Function must satisfy:

Single responsibility.

Single business capability.

Stateless execution.

Transaction safety.

Meaningful logging.

Clear error handling.

Never:

Become UI helper.

Contain presentation logic.

Return inconsistent structures.

---

# 9. UI RULES

UI may:

Display.

Collect input.

Navigate.

Call APIs.

UI may NOT:

Calculate stock.

Post accounting.

Validate business policy.

Change ledger.

Own permissions.

All business decisions belong outside UI.

---

# 10. DOMAIN MODIFICATION POLICY

Every change must belong to one Domain only.

Never modify multiple Domains unless explicitly approved.

---

# 11. COMMIT POLICY

Every commit must be atomic.

One logical change.

One reason.

Commit message format:

[type] Domain: summary

Examples:

feat Inventory: introduce movement validator

fix Ledger: prevent duplicate posting

refactor Accounting: isolate posting service

docs Architecture: update inventory ownership

---

# 12. PULL REQUEST POLICY

Every Pull Request must contain:

Purpose.

Affected Domain.

Affected tables.

Affected Edge Functions.

Business Rule changed.

Migration.

Risk assessment.

Rollback strategy.

Tests executed.

Documentation updated.

---

# 13. TEST REQUIREMENTS

Every implementation requires:

Functional tests.

Regression tests.

Permission tests.

Failure tests.

Data integrity validation.

No implementation is complete without tests.

---

# 14. MIGRATION POLICY

Every schema change must provide:

Forward migration.

Rollback migration.

Backward compatibility.

Production safety.

---

# 15. REVIEW CHECKLIST

Before approval verify:

Architecture respected.

Business Rule respected.

No duplicated logic.

No duplicated state.

Source of Truth preserved.

Performance acceptable.

Security preserved.

Tests passed.

Documentation updated.

Migration reversible.

---

# 16. FORBIDDEN ACTIONS

Implementation Engineer must NEVER:

Invent architecture.

Invent business rules.

Duplicate Source of Truth.

Create temporary hacks.

Bypass accounting.

Bypass inventory engine.

Modify ledger manually.

Hardcode company logic.

Skip tests.

Skip documentation.

---

# 17. FAILURE PROTOCOL

If implementation becomes uncertain:

STOP immediately.

Do not guess.

Do not improvise.

Prepare a clarification report containing:

Current understanding.

Conflicting observations.

Affected files.

Affected Domains.

Questions requiring architectural decision.

Resume only after clarification.

---

# 18. DEFINITION OF DONE

A Sprint is complete only when:

✓ Code implemented.

✓ Tests pass.

✓ Documentation updated.

✓ Migration verified.

✓ No duplicated business logic.

✓ No duplicated state.

✓ Architecture respected.

✓ Chief Architect review completed.

---

# 19. FINAL EXECUTION PRINCIPLE

The objective is not to produce code.

The objective is to preserve architectural integrity while evolving the system.

Correct architecture has priority over implementation speed.

Quality has priority over quantity.

Consistency has priority over cleverness.

The Core is always protected.
