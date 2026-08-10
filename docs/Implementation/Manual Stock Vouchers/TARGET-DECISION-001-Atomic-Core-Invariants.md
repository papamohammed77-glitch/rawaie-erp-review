# TARGET DECISION 001 — Manual Voucher Atomic Core Invariants

**Branch:** `rescue/manual-vouchers-inventory-core`  
**Status:** IMPLEMENTED ON BRANCH / NOT YET DEPLOYED

## Decision

The Manual Stock Voucher Edge Functions may construct the movement effects required by the UI workflow, but the central database mutation boundary must independently validate the legality of those effects.

The atomic inventory core therefore enforces:

1. company context;
2. supported voucher type;
3. operation/type compatibility;
4. endpoint type and company ownership;
5. item existence and company ownership;
6. every effect must reference an actual voucher detail;
7. SEND quantities must equal the voucher detail quantity;
8. RECEIVE quantities may be partial but may not exceed the voucher detail quantity;
9. effect direction and branch must match the voucher type;
10. exact per-item effect cardinality for SEND;
11. Transfer RECEIVE is IN-only at destination;
12. DirectReturn RECEIVE is equal OUT-from-vehicle/holding-branch + IN-to-destination;
13. stock row locking before mutation;
14. available-stock protection (`qty - allocated_qty`) for OUT;
15. inventory_log creation in the same atomic transaction;
16. voucher lifecycle status transition under row lock.

## Why

This closes a specific P0 architectural gap discovered during reconciliation: the previous atomic function validated the effect endpoint and item identity but trusted too much of the effect payload supplied by its caller. That was inconsistent with the Target principle that the central inventory engine must protect its own invariants.

The correction is deliberately narrow. It does not redesign RLS, company architecture, owner control, or unrelated inventory flows.

## Idempotency

The lifecycle state transition remains the replay barrier:

- SEND requires `Draft` and changes it to `Sent`.
- RECEIVE requires `Sent` and changes it to `Received`.
- COMPLETE requires the type-specific post-send/post-receive state.
- CANCEL is limited to `Draft`.

A second SEND/RECEIVE therefore fails before a second inventory mutation can occur.

## Files Added

- `supabase/migrations/20260810_manual_voucher_core_v1_patch2.sql`
- `supabase/migrations/20260810_manual_voucher_core_v1_patch3.sql`

## Production Status

Nothing in this decision authorizes Production execution.

The branch remains the implementation candidate pending the agreed Owner Read-Only Validation and final deployment review.

## Evidence Classification

**PROVEN STATICALLY:** the invariant gap existed in the branch implementation reviewed.  
**IMPLEMENTED ON BRANCH:** the corrective database boundary patches were added.  
**RUNTIME:** not yet proven in Production; no claim of runtime PASS is made.
