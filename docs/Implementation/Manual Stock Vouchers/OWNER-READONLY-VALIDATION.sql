-- RAWAEA — Manual Stock Voucher Core V1
-- READ-ONLY ONLY. Do not edit these queries into mutations.
-- Run each block separately and preserve the returned result as evidence.

-- EVIDENCE-001: exact schema for voucher + inventory tables
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_name in (
  'app_settings','companies','branches','items',
  'stock_vouchers','stock_voucher_details','stock_branches','inventory_log'
)
order by table_name, ordinal_position;

-- EVIDENCE-002: branch/company relationship actually present in the database
select table_name, column_name, constraint_name, constraint_type
from information_schema.key_column_usage k
join information_schema.table_constraints c using (constraint_name, table_schema, table_name)
where k.table_schema='public'
  and k.table_name in ('branches','stock_branches','items','stock_vouchers','inventory_log')
order by k.table_name, k.ordinal_position;

-- EVIDENCE-003: RLS state and policies for the affected tables
select schemaname, tablename, rowsecurity, forcerowsecurity
from pg_tables
where schemaname='public'
  and tablename in ('app_settings','companies','branches','items','stock_vouchers','stock_voucher_details','stock_branches','inventory_log')
order by tablename;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname='public'
  and tablename in ('app_settings','companies','branches','items','stock_vouchers','stock_voucher_details','stock_branches','inventory_log')
order by tablename, policyname;

-- EVIDENCE-004: app_settings company context cardinality
select company_id, main_branch_id, count(*) over () as settings_row_count
from app_settings;

-- EVIDENCE-005: relevant database functions and execution grants
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
order by p.proname;

-- EVIDENCE-006: uniqueness/index support relevant to duplicate execution and voucher lookup
select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname='public'
  and tablename in ('stock_vouchers','stock_voucher_details','stock_branches','inventory_log','items','branches')
order by tablename, indexname;
