# Manual Stock Vouchers — Reconciled Deployment Order

## Production status

**NOT DEPLOYED.**

## Single deployment artifact

Execute **only**:

`supabase/migrations/20260810_manual_voucher_core_v1_RELEASE.sql`

Do **not** execute `v1_FINAL.sql` or `v1_reconciled.sql` separately. They remain historical implementation artifacts on the branch and are not part of the release execution path.

## Required order

1. Confirm the current Production evidence (EVIDENCE-007 → EVIDENCE-010) has been reviewed and reconciled with this branch.
2. Execute `supabase/migrations/20260810_manual_voucher_core_v1_RELEASE.sql` **once** in the original Production database.
3. Run `docs/Implementation/Manual Stock Vouchers/POST-DEPLOY-OWNER-READONLY-VALIDATION.sql` block-by-block.
4. Save EVIDENCE-011 through EVIDENCE-014 under `SQL_Evidence/diagnostics/`.
5. Stop and review the evidence before any further manual-voucher or Van Sales deployment.

## Safety contract

- The release migration contains no INSERT/UPDATE/DELETE of business/test data; it only creates/replaces functions and grants.
- The legacy `send_stock_voucher_atomic` is not dropped.
- No RLS policy is disabled or bypassed by the release migration.
- The current deployment remains single-company; `company_id` remains present for future expansion.
- Owner Control Plane is outside this change.
- Partial RECEIVE remains `Sent`; only full receipt moves the voucher to `Received`.
- RECEIVE accumulates `received_qty` and cannot exceed the remaining quantity.
- After deployment, validation is read-only.
