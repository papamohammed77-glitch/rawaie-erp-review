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

The previous current implementation of `send-stock-voucher` moved the send path into `send_stock_voucher_atomic`, adding voucher locking, stock row locking, CAS-style checks, company context, and one transaction for the send operation.

It still had important gaps:

- source branch was not fully proven against company ownership;
- DirectSale still represented only the outbound deduction;
- movement semantics were not centralized for the complete voucher lifecycle;
- the existing atomic function was isolated to `send` and did not unify receive/direct return;
- authorization beyond authentication was not established by repository evidence;
- the old migration remained a separate movement engine.

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

The Edge layer owns:

- HTTP/CORS
- authentication
- server-side company context retrieval
- request validation
- voucher-domain movement planning
- API response contract

The database atomic primitive owns:

- voucher row lock
- endpoint consistency
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
| Company context | Hard-coded in create/receive; settings in send | Server-side settings in send | Server-side single context | IMPROVED |
| Voucher lock | Missing | Present for send | Required for every movement | IMPROVED |
| Source branch | `from_id` fallback to main | `from_id` used | Must be a real Branch endpoint | FIX |
| Branch/company ownership | Not proven | Not proven | Must be proven for true multi-company isolation | MISSING EVIDENCE |
| Item scope | Global item-code lookup | Company-scoped item lookup in send | Company-scoped authoritative item | IMPROVED |
| Available stock | `qty - allocated_qty` | Preserved | Required | PRESERVED |
| Multi-item atomicity | No | Send only | Whole voucher movement | IMPROVED |
| CAS | No | Present in send | Required inside atomic primitive | IMPROVED |
| Inventory log | Written separately | Written in send RPC | Same transaction as stock | IMPROVED |
| DirectSale | Source deduction only | Source deduction only | Source OUT + Van Branch IN atomically | FIX |
| DirectReturn | Destination addition only | Not unified | Van Branch OUT + Warehouse IN atomically | FIX |
| Transfer | Send OUT, receive IN | Send atomic only | Send OUT / receive IN | PRESERVED + HARDENED |
| Duplicate send | Vulnerable to race | State lock reduces race | Voucher lock + state gate | IMPROVED |
| Duplicate receive | Vulnerable | Not unified | Voucher lock + state gate | IMPROVED |
| Cancel after movement | Allowed historically | Not fixed | Draft-only; reversal requires compensating movement | FIX |
| Complete | Loose status transition | Loose | Type-aware expected status | FIX |
| API success shape | `{success,msg}` | `{success,msg}` | Preserve | PRESERVED |

### IMPORTANT DESIGN DECISION

The van is not a separate inventory universe. The Target uses the centrally created branch representing the van's custody. The operational application does not create that branch.

Therefore `DirectSale` is a custody transfer, not a customer sale.

### IMPLEMENTATION STATUS

Implemented on branch:

`rescue/manual-vouchers-inventory-core`

Production status:

`NOT APPROVED — READ-ONLY DATABASE VALIDATION REQUIRED`
