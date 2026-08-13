# TASK-026 — VAN Custody Production Evidence

## Status
PRODUCTION EVIDENCE — PASS

## Production Context
- company_id: da4ef704-88ac-4120-aa0e-65b92b2aa2bc
- main_branch_id: 151e5cd7-ac4a-4fc3-b703-d73a0dbb0dc6

## Vehicle Model
Production already contains `public.vehicles`; no new vehicle table is required.
The table has a unique vehicle code per company, license plate, optional current driver assignment, weight/volume capacity, status, notes, and timestamps.

## Selected Test Vehicle
- vehicle_id: 70e5d809-0505-4e60-b317-feff6e799127
- vehicle_code: VEH-92yrzb
- license_plate: أ ب ج 1234
- status: Active
- driver_id: NULL at initialization time

## Mobile Warehouse Created
- van_branch_id: dbdef0b7-0909-4f71-a367-30c61d021286
- van_branch_code: VAN-VEH-92yrzb
- van_branch_name: سيارة VEH-92yrzb
- active: true

## Owner-Correct Semantics
- Vehicle = mobile stock container / warehouse.
- Representative = custody and financial responsibility owner.
- Vehicle identity is independent from representative identity.
- Representative may move between vehicles through controlled inventory procedures.
- `DirectSale` remains the canonical system value and means stock issue to vehicle/representative custody, not final warehouse sale.
- `DirectReturn` represents vehicle/representative custody returning stock to MAIN.
- Do not derive vehicle identity from representative email.

## Cleanup Decision
Four duplicate experimental vehicles were found under a different company context. No blocking vehicle references were returned by the cleanup gate. They remain isolated until final cleanup; they are not part of the active Production test model.

## Gate
The first real Production Vehicle → Mobile Branch model is established. No vehicle table creation was performed.
