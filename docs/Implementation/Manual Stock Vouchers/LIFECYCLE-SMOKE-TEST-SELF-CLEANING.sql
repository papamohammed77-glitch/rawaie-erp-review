-- RAWAEA Manual Stock Voucher Core V1 — SELF-CLEANING LIFECYCLE SMOKE TEST
-- Target: rescue/manual-vouchers-inventory-core
-- Production is currently a pre-operational build environment.
-- The test seeds only the minimum stock state required for the lifecycle test,
-- then rolls the entire transaction back. No manual cleanup is required.

begin;
create temp table _rawaea_lifecycle_test_result (test_name text, result jsonb) on commit drop;

do $$
declare
  v_company_id uuid; v_from_branch uuid; v_to_branch uuid; v_item_id uuid; v_item_code text;
  v_before_from numeric; v_before_to numeric; v_voucher jsonb; v_send jsonb; v_receive jsonb; v_complete jsonb;
  v_voucher_code text; v_after_send_from numeric; v_after_receive_from numeric; v_after_receive_to numeric;
  v_status text; v_log_count_send integer; v_log_count_receive integer;
begin
  -- Single-company context: fail closed if app_settings does not contain exactly one context.
  select company_id into strict v_company_id from app_settings;

  -- Choose two real branches and one real item belonging to the current company.
  select b1.id, b2.id
    into strict v_from_branch, v_to_branch
  from branches b1
  join branches b2 on b2.company_id=b1.company_id and b2.id<>b1.id
  where b1.company_id=v_company_id
  order by b1.id,b2.id
  limit 1;

  select i.id, i.item_code
    into strict v_item_id, v_item_code
  from items i
  where i.company_id=v_company_id
    and i.item_code is not null
  order by i.id
  limit 1;

  -- Seed the minimum stock state required by the test.
  -- These writes are inside the surrounding transaction and are rolled back at the end.
  insert into stock_branches (branch_id,item_id,qty,allocated_qty)
  values (v_from_branch,v_item_id,1,0)
  on conflict (branch_id,item_id)
  do update set qty=1, allocated_qty=0;

  insert into stock_branches (branch_id,item_id,qty,allocated_qty)
  values (v_to_branch,v_item_id,0,0)
  on conflict (branch_id,item_id)
  do update set qty=0, allocated_qty=0;

  select qty into v_before_from
  from stock_branches where branch_id=v_from_branch and item_id=v_item_id;
  select qty into v_before_to
  from stock_branches where branch_id=v_to_branch and item_id=v_item_id;

  select public.create_manual_stock_voucher_atomic(
    v_company_id,'Transfer','SELF-TEST-MANUAL-VOUCHER','Branch',v_from_branch,'Branch',v_to_branch,
    'SELF-CLEANING LIFECYCLE TEST','lifecycle-smoke-test@rawaea.local',
    jsonb_build_array(jsonb_build_object('itemCode',v_item_code,'qty',1,'unitPrice',0,'notes','SELF-CLEANING TEST'))
  ) into v_voucher;
  v_voucher_code:=v_voucher->>'voucher_code';
  if coalesce((v_voucher->>'success')::boolean,false) is not true or v_voucher_code is null then raise exception 'CREATE FAILED: %',v_voucher; end if;

  select public.post_manual_stock_voucher_atomic(
    v_company_id,v_voucher_code,'SEND','lifecycle-smoke-test@rawaea.local',
    jsonb_build_array(jsonb_build_object('direction','OUT','branch_id',v_from_branch,'item_id',v_item_id,'item_code',v_item_code,'qty',1))
  ) into v_send;
  select qty into v_after_send_from from stock_branches where branch_id=v_from_branch and item_id=v_item_id;
  if v_after_send_from<>v_before_from-1 then raise exception 'SEND STOCK FAILED: expected %, got %',v_before_from-1,v_after_send_from; end if;
  select count(*) into v_log_count_send from inventory_log where reference=v_voucher_code;
  if v_log_count_send<1 then raise exception 'SEND LOG FAILED: no inventory_log row for %',v_voucher_code; end if;

  select public.post_manual_stock_voucher_atomic(
    v_company_id,v_voucher_code,'RECEIVE','lifecycle-smoke-test@rawaea.local',
    jsonb_build_array(jsonb_build_object('direction','IN','branch_id',v_to_branch,'item_id',v_item_id,'item_code',v_item_code,'qty',1))
  ) into v_receive;
  select qty into v_after_receive_from from stock_branches where branch_id=v_from_branch and item_id=v_item_id;
  select qty into v_after_receive_to from stock_branches where branch_id=v_to_branch and item_id=v_item_id;
  if v_after_receive_from<>v_before_from-1 then raise exception 'RECEIVE SOURCE INTEGRITY FAILED: expected %, got %',v_before_from-1,v_after_receive_from; end if;
  if v_after_receive_to<>v_before_to+1 then raise exception 'RECEIVE TARGET STOCK FAILED: expected %, got %',v_before_to+1,v_after_receive_to; end if;
  select status into v_status from stock_vouchers where company_id=v_company_id and voucher_code=v_voucher_code;
  if v_status<>'Received' then raise exception 'RECEIVE STATUS FAILED: expected Received, got %',v_status; end if;
  select count(*) into v_log_count_receive from inventory_log where reference=v_voucher_code;
  if v_log_count_receive<2 then raise exception 'RECEIVE LOG FAILED: expected at least 2 inventory_log rows, got %',v_log_count_receive; end if;

  select public.complete_manual_stock_voucher_atomic(v_company_id,v_voucher_code,'lifecycle-smoke-test@rawaea.local') into v_complete;
  select status into v_status from stock_vouchers where company_id=v_company_id and voucher_code=v_voucher_code;
  if v_status<>'Completed' then raise exception 'COMPLETE STATUS FAILED: expected Completed, got %',v_status; end if;

  insert into _rawaea_lifecycle_test_result values ('MANUAL_VOUCHER_LIFECYCLE',jsonb_build_object(
    'passed',true,'voucher_code',v_voucher_code,'item_code',v_item_code,
    'source_qty_before',v_before_from,'source_qty_after_send',v_after_send_from,'source_qty_after_receive',v_after_receive_from,
    'target_qty_before',v_before_to,'target_qty_after_receive',v_after_receive_to,
    'inventory_log_rows_before_rollback',v_log_count_receive,'final_status_before_rollback',v_status,'cleanup','FULL TRANSACTION ROLLBACK'));
exception when others then
  insert into _rawaea_lifecycle_test_result values ('MANUAL_VOUCHER_LIFECYCLE',jsonb_build_object('passed',false,'error',sqlerrm));
end;
$$;
select * from _rawaea_lifecycle_test_result;
rollback;
