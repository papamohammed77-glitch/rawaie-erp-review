# RAWAEA — Manual Stock Voucher Inventory Core V1

## Branch
`rescue/manual-vouchers-inventory-core`

## Scope
This package is the first implementation slice of the Inventory rescue:

- create-stock-voucher
- send-stock-voucher
- receive-stock-voucher
- complete-stock-voucher
- cancel-stock-voucher

It establishes a single atomic movement boundary for this voucher lifecycle without modifying the immutable Original functions or the existing `send_stock_voucher_atomic` function.

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

## Important DirectSale rule
`DirectSale` is not a customer sale. It is a custody transfer from a warehouse branch to the van's branch. Therefore the target send operation posts both:

```text
Warehouse Branch  OUT
Van Branch        IN
```

in the same atomic transaction.

`DirectReturn` is the reverse custody movement and is posted at receive:

```text
Van Branch        OUT
Warehouse Branch  IN
```

This corrects the historical behavior where only one side of the custody movement was updated.

## Safety model

- Company context comes from `app_settings`, never from the client.
- Voucher is locked before movement processing.
- All item stock rows are locked before mutation.
- Multi-item movement is one database transaction.
- Any exception rolls back stock, logs, received quantities, and voucher state together.
- OUT movements enforce `qty - allocated_qty` availability.
- CAS-style state checks remain in the locked update.
- Duplicate send/receive is rejected by voucher state.
- Cancellation is Draft-only. A post-movement cancellation must be represented by a compensating inventory event, not a status flip.
- Database functions are executable only by `service_role`.

## Known gate before production
The repository currently lacks populated `SQL_Evidence/schema` and `SQL_Evidence/diagnostics` evidence. Therefore the package is **implemented on the documented schema baseline but not production-approved** until the owner runs the read-only validation pack and confirms the required schema/security invariants.

The main remaining structural point is branch/company ownership. The current V1 design treats the server-side company context as authoritative and requires movement endpoints to be actual `branches`; a future multi-company deployment must additionally prove branch ownership against the company relation before enabling cross-company isolation.

## Deployment layout

Deploy the functions from:

```text
supabase/functions/create-stock-voucher/index.ts
supabase/functions/send-stock-voucher/index.ts
supabase/functions/receive-stock-voucher/index.ts
supabase/functions/complete-stock-voucher/index.ts
supabase/functions/cancel-stock-voucher/index.ts
supabase/functions/_shared/rawaea-auth.ts
supabase/functions/_shared/manual-voucher-rules.ts
```

Apply only after validation:

```text
supabase/migrations/20260810_manual_voucher_core_v1.sql
```

## Do not deploy

Do not replace the immutable files under:

```text
Edge_Functions/original/
```

Do not execute the old:

```text
20260808_send_stock_voucher_atomic.sql
```

as a substitute for the new package.
