# Manual Stock Voucher Core V1 — Reconciled Deployment Order

## Status

**NOT YET APPROVED FOR PRODUCTION EXECUTION.**

The implementation is on:

`rescue/manual-vouchers-inventory-core`

## Final deployment package

The package currently consists of:

1. `supabase/migrations/20260810_manual_voucher_core_v1_FINAL.sql`
2. `supabase/migrations/20260810_manual_voucher_core_v1_reconciled.sql`

The second file is not test data and does not create business/test records. It replaces the atomic posting RPC with the reconciled lifecycle implementation.

## Why the reconciled patch exists

The final review identified one genuine lifecycle gap: a `RECEIVE` operation could accept a partial quantity but then immediately move the voucher to `Received`, while `received_qty` was overwritten rather than accumulated.

The reconciled implementation now:

- accumulates `received_qty`;
- calculates the remaining quantity per voucher detail;
- rejects receipt above the remaining quantity;
- permits legitimate partial receipts while the voucher remains `Sent`;
- changes the voucher to `Received` only when every detail is fully received;
- prevents replay after a detail is fully received;
- keeps the stock mutation and inventory log atomic;
- preserves the existing DirectSale and DirectReturn movement contracts.

## Production execution order

Do **not** execute either file until the Owner receives an explicit `GO` from the CTO review.

When approved, execute in this exact order in Production:

```text
1. 20260810_manual_voucher_core_v1_FINAL.sql
2. 20260810_manual_voucher_core_v1_reconciled.sql
```

No test rows or synthetic business data are inserted by these migrations.

## Post-deployment validation

Immediately after both scripts succeed, execute the designated read-only validation package against Production and save its results under:

`SQL_Evidence/diagnostics/`

Do not delete the pre-deployment evidence. The post-deployment evidence must be a new version.

## Rollout boundary

This package changes only the Manual Stock Voucher core. It does not redesign RLS, multi-company architecture, owner control, Van Sales, or unrelated Inventory applications.

The legacy `send_stock_voucher_atomic` is intentionally preserved until the replacement is validated in the real environment.
