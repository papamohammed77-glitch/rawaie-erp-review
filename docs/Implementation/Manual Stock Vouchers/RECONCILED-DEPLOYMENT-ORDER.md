# Manual Stock Vouchers — Reconciled Deployment Order

## Production status

**NOT DEPLOYED.**

## Required order

1. Execute `supabase/migrations/20260810_manual_voucher_core_v1_FINAL.sql` once.
2. Execute `supabase/migrations/20260810_manual_voucher_core_v1_reconciled.sql` once.
3. Run `docs/Implementation/Manual Stock Vouchers/POST-DEPLOY-OWNER-READONLY-VALIDATION.sql`.
4. Save EVIDENCE-011 through EVIDENCE-014 under `SQL_Evidence/diagnostics/`.
5. Do not deploy any other manual-voucher migration unless explicitly approved as part of this package.

## Safety contract

- No test/business data is inserted by these migrations.
- The legacy `send_stock_voucher_atomic` is not dropped.
- No RLS policy is disabled or bypassed by these migrations.
- The current single-company deployment remains single-company; `company_id` remains available for future expansion.
- Owner Control Plane is outside this change.
- Partial RECEIVE remains `Sent`; only full receipt moves the voucher to `Received`.
- After deployment, validation is read-only.
