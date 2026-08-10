# RAWAEA ARCHITECTURE CONSTITUTION
Version: 1.1

Status: ACTIVE

Authority:
Chief Architecture Document

Last Updated:
2026-08-10

------------------------------------------------------------

MISSION
------------------------------------------------------------

Rawaea ERP is not a traditional ERP.

Rawaea is a Business Operating System.

Its purpose is not only recording transactions.

Its purpose is to organize the company itself.

Every architectural decision must move the system closer to this vision.

------------------------------------------------------------

CORE PHILOSOPHY
------------------------------------------------------------

The system is built around ONE BUSINESS CORE.

Not around applications.

Applications are only interfaces.

Business logic belongs ONLY to the Core.

------------------------------------------------------------

ARCHITECTURAL LAW #1

Single Source Of Truth

Every business entity MUST have exactly ONE source of truth.

Never duplicate business truth.

------------------------------------------------------------

ARCHITECTURAL LAW #2

Business Rules Never Live Inside UI

No business rule is allowed inside:

PWA

HTML

React

Vue

JavaScript UI

Business Rules belong ONLY inside:

Core

Edge Functions

Domain Services

------------------------------------------------------------

ARCHITECTURAL LAW #3

Database Is A State Storage

Database stores state.

Database does NOT own business logic.

------------------------------------------------------------

ARCHITECTURAL LAW #4

Inventory Is A Business Engine

Inventory is NOT quantities.

Inventory is an Engine.

Stock movement is always event-driven.

------------------------------------------------------------

ARCHITECTURAL LAW #5

Accounting Never Calculates Inventory

Accounting consumes inventory events.

Inventory never consumes accounting.

------------------------------------------------------------

ARCHITECTURAL LAW #6

Ledger Never Recalculates Accounting

Ledger is generated.

Never manually edited.

------------------------------------------------------------

ARCHITECTURAL LAW #7

Applications Are Replaceable

PWA

POS

Van Sales

Office

Dashboard

can all be rewritten.

Business Core must never depend on them.

------------------------------------------------------------

ARCHITECTURAL LAW #8

Edge Functions Are Business Services

Edge Functions represent business capabilities.

Never UI helpers.

Never SQL wrappers.

------------------------------------------------------------

ARCHITECTURAL LAW #9

No Duplicate Logic

Every business rule exists once.

If duplicated:

It is a bug.

------------------------------------------------------------

ARCHITECTURAL LAW #10

Backward Compatibility

Every migration must preserve production data.

Never sacrifice data integrity.

------------------------------------------------------------

CURRENT DEPLOYMENT MODEL
------------------------------------------------------------

The current RAWAEA ERP edition is intentionally deployed as:

Single Company
+
Multi Branch
+
Multi User

The current edition does NOT introduce full Multi-Company / Multi-Tenant
operational complexity.

company_id remains part of the data model where required to preserve
forward compatibility with a future Multi-Company edition.

In the current edition, company context represents the single operating
company and must not be treated as a client-selectable tenant context.

Future Multi-Company capability may expand this model without requiring
business applications to become independent sources of business truth.

------------------------------------------------------------

PLATFORM AUTHORITY BOUNDARY
------------------------------------------------------------

The System Owner / Platform Authority is a distinct authority domain from
ordinary operational users.

This authority already exists in the system and is NOT to be recreated as
part of domain or inventory repair work.

Operational roles and permissions govern execution of company business
operations.

Platform authority governs the system itself, including platform-level
control and licensing authority where applicable.

Inventory, Sales, Warehouse, Van Sales, and other operational repairs must
not collapse Platform Authority into the ordinary operational user model.

No inventory repair may modify, replace, or weaken the existing Platform
Authority boundary unless a separate architectural decision explicitly
requires it.

------------------------------------------------------------

DOMAIN HIERARCHY

Level 1

Core Engine

↓

Inventory

↓

Accounting

↓

Ledger

↓

Sales

↓

Purchasing

↓

Delivery

↓

Runsheet

↓

Reporting

↓

AI

------------------------------------------------------------

PROHIBITED ACTIONS

❌ Create tables without architectural approval.

❌ Duplicate business logic.

❌ Mix UI with business logic.

❌ Write SQL directly inside UI.

❌ Recalculate ledger manually.

❌ Recalculate inventory from reports.

❌ Create hidden dependencies.

❌ Bypass Source Of Truth.

------------------------------------------------------------

SOURCE OF TRUTH PRINCIPLE

Every domain owns its own truth.

Inventory owns stock.

Accounting owns journal.

Ledger owns balances.

Sales owns orders.

Purchasing owns purchasing.

Delivery owns delivery execution.

Runsheet owns field execution.

AI owns recommendations only.

------------------------------------------------------------

REFACTORING POLICY

Never rewrite because code is ugly.

Rewrite ONLY when:

Business Rule is wrong.

Source Of Truth is wrong.

Architecture is violated.

Performance is unacceptable.

------------------------------------------------------------

SUCCESS CRITERIA

The project is successful when:

Business Rules exist once.

Every Domain has one owner.

Applications become thin.

Business Engine becomes powerful.

AI can reason over trusted data.

------------------------------------------------------------

FINAL PRINCIPLE

Protect the Core.

Everything else can be replaced.

Never replace the Core.
