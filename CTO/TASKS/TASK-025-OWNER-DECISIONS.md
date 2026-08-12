# TASK-025 — Owner Decisions & Final Voucher Semantics

## Status
CLOSED / GO — Contract Reconciliation

## Owner-confirmed decisions

### DirectReturn
- Business meaning: return from a direct-sales representative/vehicle back to the MAIN warehouse.
- Source: Vehicle / Representative custody.
- Target: MAIN branch.
- Movement sequence: source custody decreases at SEND; MAIN increases at RECEIVE.
- Partial receive is permitted; the sent quantity and received quantity can differ.
- The unresolved quantity remains outstanding until received; completion follows the established Voucher lifecycle.

### SupplierReturn
- Business meaning: return of goods from MAIN warehouse to the selected supplier.
- Source: MAIN branch.
- Target: Supplier.
- Movement occurs as an outbound stock operation at SEND.
- No warehouse RECEIVE step is required for the supplier side.

### DirectSale
- The owner explicitly clarified that DirectSale does NOT mean a final sale out of the warehouse.
- It means stock issue/supply to a direct-sales vehicle/representative.
- The vehicle is a mobile inventory container/custody location.
- Subsequent representative sales reduce the vehicle's stock, not MAIN warehouse stock.
- Keep `DirectSale` as the existing canonical system/database value for now.
- Do NOT rename it to `DirectIssue` inside the current implementation; any terminology rename must be a separate impact-tracked change across database values, RPCs, Edge Functions, UI, reports, and historical data.

## Historical reconciliation
The historical architecture explicitly described the VAN as a mobile branch/custody location and `vouchers.html` as the tool that establishes and returns that custody. The owner decisions above supersede any older inference that treated DirectSale as final warehouse sale.

## Evidence hierarchy applied
1. Owner decision
2. Production schema / deployed RPC definitions
3. Persisted historical evidence
4. Original application behavior
5. Gold reference applications

## Production reconciliation already completed
- Original feature inventory: PASS
- Production Voucher Core: PASS through TASK-017..024
- UI read schema: VERIFIED
- UI read RLS: VERIFIED / enabled on stock_vouchers, stock_voucher_details, items, branches, app_settings
- Production had no historical DirectReturn or SupplierReturn rows, so those semantics were NOT inferred from empty data; they were resolved by explicit owner decisions.

## Gold rule
The current `vouchers.html` candidate remains quarantined until TASK-026 static parity and TASK-027 runtime E2E are closed.
