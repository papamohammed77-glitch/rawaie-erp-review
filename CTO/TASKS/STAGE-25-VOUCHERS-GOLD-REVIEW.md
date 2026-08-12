# STAGE-25 — vouchers.html Gold Review

## Status
**OPEN — CANDIDATE QUARANTINED — NOT READY FOR PRODUCTION**

This report supersedes any prior implication that the modified `vouchers.html` was ready for Production.

## Sources reviewed
- Original/candidate `PWA/warehouse/vouchers.html`
- Candidate change commit `c093e2f79c81e3a03f5dbb04ce2f22ce7226e737`
- Gold reference `PWA/warehouse/returns.html`
- Gold reference `PWA/warehouse/picker.html`
- Production Voucher Core contracts already verified through TASK-017..024
- Existing Send-voucher rescue history, including original/current function separation and prior atomic Send work

## Original feature inventory
The original page provides:
- Authentication/login and logout
- Active warehouse-role enforcement for the voucher role
- Pending and completed tabs
- Voucher listing and search
- New voucher creation modal
- Transfer / DirectSale / DirectReturn / SupplierReturn selection
- Source branch / destination / supplier inputs
- Item search and cart management
- Quantity increment/decrement
- Voucher detail view
- Send action
- Receive action
- Complete action
- Account view
- Connection/status UI
- Existing `RW_Auth`, `RW_UI`, `RW_API`, service-worker integration

## Candidate improvements
The candidate correctly introduced:
- Production company context acquisition
- Direct RPC wrappers for Create/Send/Receive/Complete/Cancel
- Partial Receive UI with required/received/remaining quantities
- Cancel action for Draft
- Received → Complete action
- More explicit voucher status display
- Detail view based on voucher id
- Central-engine-oriented lifecycle instead of legacy Edge Function write paths

## Critical findings
### 1. DirectReturn branch semantics regression risk — BLOCKING
Original UI semantics explicitly treated DirectReturn source as optional and described it as being determined from the active operational context. The candidate changed the branch resolution path to default blank values through `_resolveBranch` and `typeSafeTarget()`. This changes a business semantic before the owner requirement and Production contract for DirectReturn custody/branch resolution have been fully reconciled.

### 2. SupplierReturn / branch-resolution semantics are not fully proven
The candidate mixes Branch and Supplier target handling in UI-level defaults. Production RPC semantics must remain authoritative; UI should not manufacture business meaning through Boolean helpers such as `typeSafeTarget()`.

### 3. UI read contract was not fully reconciled
The candidate reads `stock_vouchers`, `stock_voucher_details`, `items`, `branches`, and `app_settings` directly. Before Gold approval, the read model must be checked for company scoping, RLS behavior, missing-column drift, and feature coverage against the original and Gold references.

### 4. Gold-quality hardening was incomplete
`returns.html` and `picker.html` demonstrate stronger operational patterns around role verification, loading/error states, persistence/offline support, and defensive workflows. These are reference-quality patterns, not code to copy blindly. The candidate has not yet demonstrated equivalence in the portions relevant to vouchers.

### 5. Full original behavior has not yet been proven by runtime E2E
Static diff proves that the candidate preserved many functions, but does not prove that all original business-visible features still work after the RPC migration.

## Features not intentionally removed
No evidence was found that login/logout, tabs, search, item search, cart management, account view, or the general voucher lifecycle UI were intentionally deleted. However, preservation is **not certified** until runtime testing is completed.

## Architecture decision
The candidate source is retained as a **QUARANTINED CANDIDATE** and must not be published to Production yet.

The correct next design pass is:
1. Reconcile every original user-visible capability.
2. Reconcile each voucher type's branch/custody semantics against Production contracts.
3. Compare candidate behavior with the Gold UI patterns from `returns.html` and `picker.html` where relevant.
4. Produce a feature parity matrix with `PRESERVED / IMPROVED / CHANGED / MISSING / UNPROVEN`.
5. Correct the candidate only after the matrix is closed.
6. Run runtime E2E for Create → Draft → Send → Partial Receive → Full Receive → Complete / Cancel.
7. Only then publish and close STAGE-25.

## Production Gate
**NOT READY. No Production deployment authorized from this candidate.**
