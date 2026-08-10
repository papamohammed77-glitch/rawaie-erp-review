-- RAWAEA Manual Stock Voucher Core V1 — Post-Deployment Owner Read-Only Validation
-- READ-ONLY ONLY. Run only after the approved deployment package succeeds.
-- No INSERT / UPDATE / DELETE / DDL.

-- EVIDENCE-011: Target RPC existence, security and execute grants
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  has_function_privilege('public', p.oid, 'EXECUTE') as public_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'create_manual_stock_voucher_atomic',
    'post_manual_stock_voucher_atomic',
    'complete_manual_stock_voucher_atomic',
    'cancel_manual_stock_voucher_atomic'
  )
order by p.proname;

-- EVIDENCE-012: Verify the reconciled posting definition contains cumulative receipt handling.
select
  p.proname as function_name,
  position('coalesce(d.received_qty,0)' in pg_get_functiondef(p.oid)) > 0 as cumulative_receive_guard_present,
  position('received_qty=coalesce(received_qty,0)+v_qty' in pg_get_functiondef(p.oid)) > 0 as cumulative_receive_update_present,
  position('v_new_status:=\'Received\'' in pg_get_functiondef(p.oid)) > 0 as final_receive_status_logic_present
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname='post_manual_stock_voucher_atomic';

-- EVIDENCE-013: Confirm the legacy RPC remains present and is not accidentally removed.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname='send_stock_voucher_atomic';

-- EVIDENCE-014: Confirm current branch/company relationships remain valid.
select
  b.id as branch_id,
  b.name as branch_name,
  b.company_id,
  c.id as company_id_exists
from branches b
left join companies c on c.id=b.company_id
where c.id is null
order by b.name;

-- EVIDENCE-015: Confirm there are no orphan voucher details.
select d.id, d.voucher_id, d.item_id, d.item_code
from stock_voucher_details d
left join stock_vouchers v on v.id=d.voucher_id
where v.id is null
order by d.id;
