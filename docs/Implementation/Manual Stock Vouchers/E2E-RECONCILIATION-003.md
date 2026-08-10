# Manual Stock Vouchers — E2E Reconciliation 003

## Scope

Final application-layer reconciliation after the Production RPC release. This round closes the mismatch between `vouchers.html` and the already-published manual-voucher lifecycle contract.

## Changes on rescue branch

### `PWA/warehouse/vouchers.html`

- `Transfer` and `DirectReturn` expose **Receive** only.
- `DirectSale` and `SupplierReturn` expose **Complete** only after `Sent`.
- The UI no longer treats every `Sent` voucher as receivable.
- `DirectSale` and `DirectReturn` may omit vehicle branch fields because the backend derives the authenticated user's vehicle holding branch.
- `Transfer` accepts a destination branch reference.
- `SupplierReturn` requires an explicit supplier UUID.
- The UI continues to send `receivedItems: []`; the already-deployed backend resolves the remaining quantity server-side.

### `supabase/functions/create-stock-voucher/index.ts`

- Branch references may now be UUIDs or existing `branch_code` values.
- Branch references are resolved and company-scoped before the RPC is called.
- `MAIN` remains a branch code, never a database UUID.
- Direct-sale and direct-return vehicle branches remain server-derived from the authenticated user.
- No database/RLS contract is weakened.

## Lifecycle contract verified against current shared rules

| Voucher Type | SEND | RECEIVE | COMPLETE |
|---|---|---|---|
| Transfer | OUT source | IN destination | no |
| DirectSale | OUT MAIN + IN vehicle holding branch | no | yes |
| DirectReturn | no | OUT vehicle + IN MAIN | no |
| SupplierReturn | OUT source | no | yes |

## Production safety

No Production SQL was executed in this round. The changes are confined to the rescue branch.

## Next gate

Perform one final branch-level code reconciliation of the five manual-voucher Edge Functions, shared rules/auth, migration release, and `vouchers.html`. If no contradiction is found, issue the single **GO** deployment instruction. No new architecture freeze or documentation cycle is required.
