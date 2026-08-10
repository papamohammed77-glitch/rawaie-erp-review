# Manual Vouchers — Release Manifest

Branch: `rescue/manual-vouchers-inventory-core`

## Production-ready Edge Functions

| Function | Source path | Status |
|---|---|---|
| create-stock-voucher | `supabase/functions/create-stock-voucher/index.ts` | READY AFTER PATCH |
| send-stock-voucher | `supabase/functions/send-stock-voucher/index.ts` | READY AFTER PATCH |
| receive-stock-voucher | `supabase/functions/receive-stock-voucher/index.ts` | READY AFTER PATCH |
| complete-stock-voucher | `supabase/functions/complete-stock-voucher/index.ts` | READY AFTER PATCH |
| cancel-stock-voucher | `supabase/functions/cancel-stock-voucher/index.ts` | READY AFTER PATCH |

## Shared dependencies

- `supabase/functions/_shared/manual-voucher-rules.ts`
- `supabase/functions/_shared/rawaea-auth.ts`

## Required corrective database patch

The baseline comparison found a real semantic regression in the deployed `post_manual_stock_voucher_atomic` definition: the branch version had introduced an `IN` movement for `DirectSale` on SEND and an `OUT` movement for `DirectReturn` on RECEIVE. The original functions perform only the outbound deduction for `DirectSale` on SEND and only the inbound addition for `DirectReturn` on RECEIVE. This must be corrected before application deployment.

Required SQL, execute ONCE in Production:

`supabase/migrations/20260810_manual_voucher_core_v1_CORRECTIVE_SEMANTICS_PATCH.sql`

This patch replaces only `post_manual_stock_voucher_atomic`; it inserts no business/test data.

## Deployment order

1. Execute the corrective semantics patch once in Production.
2. Verify the deployed RPC definition read-only.
3. Deploy the five Edge Functions with their shared dependencies.
4. Deploy `PWA/warehouse/vouchers.html`.
5. Run the four lifecycle smoke tests.

The original V1 release migration must NOT be re-run.
