# RAWAEA — Manual Stock Voucher Inventory Core V1

## Branch
`rescue/manual-vouchers-inventory-core`

## Scope
First implementation slice of the Inventory rescue:

- create-stock-voucher
- send-stock-voucher
- receive-stock-voucher
- complete-stock-voucher
- cancel-stock-voucher

## Target flow

```text
Operational App
      ↓
Edge Function
      ↓
Manual Voucher Domain Rules
      ↓
post_manual_stock_voucher_atomic
      ↓
stock_branches
      +
inventory_log
      +
Voucher State
```

## DirectSale / DirectReturn

`DirectSale` is a custody transfer, not a customer sale:

```text
Warehouse Branch  OUT
Van Branch        IN
```

The two effects are posted atomically.

`DirectReturn` is the reverse custody movement at receive:

```text
Van Branch        OUT
Warehouse Branch  IN
```

This closes the historical gap where only one side of the custody movement was updated.

## Safety model

- Company context comes from `app_settings`, never from the client.
- Voucher is locked before movement processing.
- Stock rows are locked before mutation.
- All effects for one voucher operation are one database transaction.
- Any exception rolls back stock, logs, received quantities, and voucher state together.
- OUT movements enforce `qty - allocated_qty` availability.
- Duplicate send/receive is rejected by voucher state.
- Cancellation is Draft-only. Post-movement cancellation requires a compensating movement.
- Database functions are executable only by `service_role`.

## Final files

### Edge Functions

```text
supabase/functions/create-stock-voucher/index.ts
supabase/functions/send-stock-voucher/index.ts
supabase/functions/receive-stock-voucher/index.ts
supabase/functions/complete-stock-voucher/index.ts
supabase/functions/cancel-stock-voucher/index.ts
```

### Shared domain code

```text
supabase/functions/_shared/rawaea-auth.ts
supabase/functions/_shared/manual-voucher-rules.ts
```

### Database

Execute in this order only after the read-only gate passes:

```text
supabase/migrations/20260810_manual_voucher_core_v1.sql
supabase/migrations/20260810_manual_voucher_core_v1_patch.sql
```

The patch corrects the `DirectReturn: Received → Completed` transition.

## Owner validation

Read-only validation pack:

```text
docs/Implementation/Manual Stock Vouchers/OWNER-READONLY-VALIDATION.sql
```

## Three-way review

```text
docs/Implementation/Manual Stock Vouchers/TARGET-THREE-WAY-REVIEW.md
```

## Production gate

This branch is **not a production approval**.

The repository does not contain populated `SQL_Evidence/schema` or `SQL_Evidence/diagnostics` results for the current database. The code is therefore ready for owner validation, not for blind execution.

Do not modify:

```text
Edge_Functions/original/
```

Do not substitute the historical `20260808_send_stock_voucher_atomic.sql` for the new movement boundary.
