# RAWAEA — Manual Stock Vouchers
## Three-Way Engineering Review — V1

### ORIGINAL

The historical cycle is:

```text
create → Draft
send   → stock deduction for Transfer / DirectSale / SupplierReturn
receive → stock addition for Transfer / DirectReturn
complete → status completion
cancel → status cancellation
```

The Original implementation performs stock reads and writes directly from the Edge Functions. It writes `inventory_log`, uses `stock_branches.qty - allocated_qty` for outbound availability, and changes voucher status independently of the stock writes. This creates partial-failure and concurrency risk.

For `DirectSale`, the historical implementation only deducted the source branch. It did not establish the van branch balance in the same operation. The historical van-sales report identifies the van as a temporary/operational branch and explicitly identifies the missing transfer of stock into that custody branch as a gap.

For `DirectReturn`, the historical receive function adds to the destination branch but does not deduct the vehicle/van branch in the same operation.

### CURRENT

The rescue branch now places the five voucher lifecycle functions behind a shared domain-rule layer and one atomic movement boundary.

The current implementation additionally:

- derives company context server-side from `app_settings`;
- validates voucher endpoint semantics in the Edge/domain layer;
- validates Branch endpoints against the current company context;
- enforces the documented warehouse authorization boundary (`active_warehouse_role = "أذونات"`) at the Edge layer, preserving the existing owner bypass;
- locks the voucher and all affected stock rows inside one database transaction;
- preserves `qty - allocated_qty` availability checks and CAS-style mutation guards;
- posts DirectSale as Warehouse OUT + Van Branch IN atomically;
- posts DirectReturn as Van Branch OUT + Warehouse IN atomically;
- keeps cancellation Draft-only and requires a compensating movement after stock movement;
- preserves the external `{success,msg}` response contract for send/receive/complete/cancel.

The implementation is still **not production-approved** because empirical database validation and concurrency/isolation tests have not yet been run.

### TARGET

The target is a single Manual Voucher movement boundary:

```text
Voucher Domain Rule Planner
          ↓
post_manual_stock_voucher_atomic
          ↓
locked stock state
          +
inventory_log
          +
voucher state
```

The Edge/domain layer owns:

- HTTP/CORS
- authentication
- documented operational authorization
- server-side company context retrieval
- request validation
- voucher-domain movement planning
- API response contract

The database atomic primitive owns only the atomic state/mutation boundary:

- voucher row lock
- endpoint consistency checks required for mutation safety
- stock row locks
- availability validation
- atomic stock mutation
- inventory log mutation
- received quantity mutation
- voucher state transition
- rollback through the database transaction boundary

### THREE-WAY MATRIX

| Rule | Original | Current | Target | Decision |
|---|---|---|---|---|
| Authentication | Present | Present | Preserve | PRESERVED |
| Operational authorization | UI active-role gate only | Edge enforces documented `أذونات` role; owner bypass preserved | Edge must enforce operational authorization | IMPROVED |
| Company context | Hard-coded in create/receive; settings in send | Server-side single context | Server-side single context | IMPROVED |
| Voucher lock | Missing | Present for send/receive/complete/cancel | Required for every state-changing operation | IMPROVED |
| Source branch | `from_id` fallback to main | Explicit Branch endpoint; no silent fallback | Authoritative Branch endpoint | FIX |
| Branch/company ownership | Not proven | Branch endpoint checked against current company | Must remain company-scoped | IMPROVED |
| Item scope | Global item-code lookup | Company-scoped item lookup | Company-scoped authoritative item | IMPROVED |
| Available stock | `qty - allocated_qty` | Preserved | Required | PRESERVED |
| Multi-item atomicity | No | Send/receive effects are one transaction | Whole voucher operation atomic | IMPROVED |
| CAS | No | Present inside atomic mutation | Required inside atomic primitive | IMPROVED |
| Inventory log | Written separately | Same transaction as stock | Same transaction as stock | IMPROVED |
| DirectSale | Source deduction only | Source OUT + Van Branch IN | Custody transfer atomically | FIX |
| DirectReturn | Destination addition only | Van Branch OUT + Warehouse IN | Reverse custody transfer atomically | FIX |
| Transfer | Send OUT, receive IN | Send OUT / receive IN under one movement boundary | Send OUT / receive IN | PRESERVED + HARDENED |
| SupplierReturn | Source deduction | Source deduction with Supplier endpoint semantics | Source branch OUT to Supplier | PRESERVED + HARDENED |
| Duplicate send | Race-prone | Voucher lock + state gate | Reject duplicate | IMPROVED |
| Duplicate receive | Race-prone | Voucher lock + state gate | Reject duplicate | IMPROVED |
| Cancel after movement | Allowed historically | Draft-only | Compensating movement required | FIX |
| Complete | Loose status transition | Type-aware expected status | Complete only from valid lifecycle state | FIX |
| API success shape | `{success,msg}` | `{success,msg}` | Preserve | PRESERVED |
| RLS | Permissive policies exist | Edge authorization + service-role boundary | Do not rely on permissive RLS as business authorization | IMPROVED |

### IMPORTANT DESIGN DECISION

The van is not a separate inventory universe. The Target uses the centrally created branch representing the van's custody. The operational application does not create that branch.

Therefore `DirectSale` is a custody transfer, not a customer sale.

### IMPLEMENTATION STATUS

Implemented on branch:

`rescue/manual-vouchers-inventory-core`

Static status:

`READY FOR OWNER VALIDATION`

Production status:

`NOT APPROVED — EMPIRICAL DATABASE VALIDATION REQUIRED`
