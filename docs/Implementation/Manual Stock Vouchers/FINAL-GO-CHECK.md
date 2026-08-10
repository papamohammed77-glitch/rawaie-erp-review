# Manual Stock Vouchers — Final GO Check

## Current state

The Manual Stock Voucher target has completed the branch-level E2E reconciliation after the Production V1 release.

## Production already deployed

- `supabase/migrations/20260810_manual_voucher_core_v1_RELEASE.sql` — executed successfully in Production.
- Post-deploy Evidence 011, 012, 014 passed.
- EVIDENCE-013-V2 inspected the actual deployed RPC definition.

## Branch fixes completed after that deployment

1. `supabase/functions/create-stock-voucher/index.ts`
   - Branch references accept UUIDs or existing `branch_code` values.
   - Company-scoped branch resolution occurs before the central RPC.
   - DirectSale and DirectReturn vehicle holding branch resolution remains server-side.

2. `PWA/warehouse/vouchers.html`
   - Transfer/DirectReturn show Receive only.
   - DirectSale/SupplierReturn show Complete only after Send.
   - Transfer destination is required.
   - SupplierReturn requires an explicit supplier UUID.
   - DirectSale/DirectReturn may use server-derived vehicle branch context.

3. `docs/Implementation/Manual Stock Vouchers/E2E-RECONCILIATION-003.md`
   - Records the closed E2E reconciliation.

## Important accepted V1 constraint

The deployed database RPC still reads the single-company V1 `app_settings` context using a singleton-row assumption. The shared Edge Function authentication/context path uses `.single()`. This is intentionally not reopened as a redesign during the current target; multi-company architecture remains future scope. Any future hardening of the database singleton must be handled as a separate explicit migration, not mixed into this repair cycle.

## Deployment gate

The branch is now at the final GO gate for the current Manual Stock Voucher target.

Before publishing the branch changes, deploy these changed application/backend files together:

- `PWA/warehouse/vouchers.html`
- `supabase/functions/create-stock-voucher/index.ts`

The previously deployed Production SQL release is not to be rerun.

After application/Edge Function deployment, perform a smoke test on the four lifecycle paths without creating artificial business data unless the owner explicitly approves a controlled reversible test:

- Transfer: Draft → Sent → Received
- DirectSale: Draft → Sent → Completed
- DirectReturn: Draft → Sent → Received
- SupplierReturn: Draft → Sent → Completed

Then run the existing read-only post-deploy validation only if database changes were deployed. For this application-only/Edge Function deployment, no database migration is required.
