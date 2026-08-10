# Manual Vouchers — Release Manifest

Branch: `rescue/manual-vouchers-inventory-core`

## Production-ready Edge Functions

| Function | Source path | Status |
|---|---|---|
| create-stock-voucher | `supabase/functions/create-stock-voucher/index.ts` | READY |
| send-stock-voucher | `supabase/functions/send-stock-voucher/index.ts` | READY |
| receive-stock-voucher | `supabase/functions/receive-stock-voucher/index.ts` | READY |
| complete-stock-voucher | `supabase/functions/complete-stock-voucher/index.ts` | READY |
| cancel-stock-voucher | `supabase/functions/cancel-stock-voucher/index.ts` | READY |

## Shared dependencies

- `supabase/functions/_shared/manual-voucher-rules.ts`
- `supabase/functions/_shared/rawaea-auth.ts`

## Deployment note

These are the source-of-truth paths. This manifest intentionally does not duplicate function source files, preventing the release folder from becoming a second source of truth.

The database release migration was already executed in Production and must NOT be re-run as part of this application/function deployment.
