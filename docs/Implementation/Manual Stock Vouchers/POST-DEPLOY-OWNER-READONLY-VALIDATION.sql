-- RAWAEA Manual Stock Voucher Core V1 — POST DEPLOY OWNER READ-ONLY VALIDATION
-- Run only AFTER Production deployment.
-- Read-only: SELECTs only. No INSERT/UPDATE/DELETE.

-- EVIDENCE-011: Target RPC exists and is SECURITY DEFINER.
select
  p.oid::regprocedure as function_name,
  p.prosecdef as security_definer,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'post_manual_stock_voucher_atomic';

-- EVIDENCE-012: EXECUTE is not granted to PUBLIC; service_role is present.
select
  p.oid::regprocedure as function_name,
  has_function_privilege('public', p.oid, 'EXECUTE') as public_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'post_manual_stock_voucher_atomic';

-- EVIDENCE-013: Return the deployed RPC definition for direct verification.
-- Do NOT infer correctness from brittle text-matching predicates.
-- The owner/CTO review will verify the actual deployed definition against the target contract.
select
  p.oid::regprocedure as function_name,
  pg_get_functiondef(p.oid) as deployed_function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'post_manual_stock_voucher_atomic';

-- EVIDENCE-014: Confirm the relevant stock/voucher columns exist.
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'stock_voucher_details' and column_name in ('voucher_id','item_id','item_code','qty','received_qty'))
    or
    (table_name = 'stock_vouchers' and column_name in ('company_id','voucher_code','status','sent_date','received_date','received_by'))
    or
    (table_name = 'stock_branches' and column_name in ('branch_id','item_id','qty','allocated_qty'))
  )
order by table_name, column_name;
