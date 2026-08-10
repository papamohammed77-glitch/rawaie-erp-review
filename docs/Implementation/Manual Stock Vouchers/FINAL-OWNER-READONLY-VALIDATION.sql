-- RAWAEA — Manual Stock Voucher Core V1 — FINAL OWNER READ-ONLY VALIDATION
-- READ-ONLY ONLY. Execute each block separately in the ORIGINAL Production database.
-- Do not insert/update/delete. Preserve each result as evidence.
-- Purpose: validate the final deployment contract BEFORE any migration is executed.

-- EVIDENCE-007: final target RPCs exist in the CURRENT database and expose expected security/grants.
select n.nspname as schema_name,
       p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       has_function_privilege('public', p.oid, 'EXECUTE') as public_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'send_stock_voucher_atomic',
    'create_manual_stock_voucher_atomic',
    'post_manual_stock_voucher_atomic',
    'complete_manual_stock_voucher_atomic',
    'cancel_manual_stock_voucher_atomic'
  )
order by p.proname, pg_get_function_identity_arguments(p.oid);

-- EVIDENCE-008: exact function definitions currently installed.
-- This is read-only and proves the database implementation, not merely the GitHub files.
select p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_functiondef(p.oid) as installed_definition
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'create_manual_stock_voucher_atomic',
    'post_manual_stock_voucher_atomic',
    'complete_manual_stock_voucher_atomic',
    'cancel_manual_stock_voucher_atomic'
  )
order by p.proname, pg_get_function_identity_arguments(p.oid);

-- EVIDENCE-009: current Production must NOT yet contain the Target-only RPC unless it was intentionally deployed already.
select proname,
       pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and proname='post_manual_stock_voucher_atomic';

-- EVIDENCE-010: current company/branch context and relevant structural ownership.
select b.id as branch_id,
       b.company_id,
       c.id as company_exists
from branches b
left join companies c on c.id=b.company_id
order by b.company_id, b.id;

-- FINAL INTERPRETATION:
-- 1) These queries are evidence only; they do not create test data.
-- 2) A missing Target RPC in EVIDENCE-007/008 is expected if the final migration has not been deployed.
-- 3) Do NOT execute the final migration merely because this validation passes.
-- 4) Deployment requires explicit owner approval after reconciling these results with the Git branch.
