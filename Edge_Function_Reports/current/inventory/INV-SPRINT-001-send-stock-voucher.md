# INV-SPRINT-001 — send-stock-voucher

## Original source
`Edge_Functions/original/08_inventory/send-stock-voucher.ts`

## Current source
`Edge_Functions/current/inventory/send-stock-voucher.ts`

## Target Design
The Edge Function is a thin authenticated business-service boundary. Atomic inventory mutation is delegated to a PostgreSQL transaction primitive. The original baseline remains immutable.

## Problem
The previous implementation could mutate multiple stock rows independently. A later failure could therefore leave partial stock/log mutations committed. CAS protected individual stock updates but did not provide whole-voucher atomicity.

## Decision
Use a database-side atomic operation for the complete voucher send. Preserve CAS semantics, resolve company context server-side, validate voucher state, process all details, write inventory logs, and transition the voucher only inside the same transaction.

## Files
- `Edge_Functions/current/inventory/send-stock-voucher.ts`
- `supabase/migrations/20260808_send_stock_voucher_atomic.sql`
- `Edge_Function_Reports/current/inventory/INV-SPRINT-001-send-stock-voucher.md`

## Migration
The migration is additive and creates the controlled PostgreSQL transaction primitive `send_stock_voucher_atomic`. It must be reviewed/applied in the controlled database environment; it was not executed against production.

## Tests
- Current TypeScript/static validation: PASS
- Migration/static SQL review: PASS
- Original baseline unchanged: PASS
- Single-item integration test: NOT RUN
- Multi-item integration test: NOT RUN
- Insufficient-stock rollback integration test: NOT RUN
- Mid-operation failure rollback integration test: NOT RUN
- Concurrent execution test: NOT RUN
- Company mismatch integration test: NOT RUN
- Inventory-log failure rollback integration test: NOT RUN
- Voucher-state failure rollback integration test: NOT RUN

## Results
The implementation is structurally prepared for atomic execution and review. Database integration and concurrency behavior require execution in a controlled Supabase environment.

## Remaining Risk
True database execution, rollback, and concurrent-request behavior have not yet been empirically validated because no controlled Supabase test database is connected in this execution environment.

## Next Action
Review and execute the migration in a controlled test database, then run the defined integration/concurrency cases before merging.
