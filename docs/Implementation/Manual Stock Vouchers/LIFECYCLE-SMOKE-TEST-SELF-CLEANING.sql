-- RAWAEA Manual Stock Voucher Core V1 — SELF-CLEANING LIFECYCLE SMOKE TEST
-- Target: rescue/manual-vouchers-inventory-core
-- Uses only fields proven by deployed validation evidence.
-- Execute entire batch in Production as one transaction; all test data is rolled back.

begin;
create temp table _rawaea_lifecycle_test_result (test_name text, result jsonb) on commit drop;

do $$
declare
  v_company_id uuid; v_from_branch uuid; v_to_branch uuid; v_item_id uuid; v_item_code text;
  v_before_from numeric; v_before_to numeric; v_voucher jsonb; v_send jsonb; v_receive jsonb; v_complete jsonb;
  v_voucher_code text; v_after_send_from numeric; v_after_receive_from numeric; v_after_receive_to numeric;
  v_status text; v_log_count_send integer; v_log_count_receive integer;
begin
  select company_id into v_company_id from app_settings order by company_id limit 1;
  if v_company_id is null then raise exception 'TEST BLOCKED: no company context exists in app_settings'; end if;

  select sb1.branch_id, sb2.branch_id, sb1.item_id, i.item_code, sb1.qty, sb2.qty
    into v_from_branch, v_to_branch, v_item_id, v_item_code, v_before_from, v_before_to
  from stock_branches sb1
  join stock_branches sb2 on sb2.item_id=sb1.item_id and sb2.branch_id<>sb1.branch_id
  join branches b1 on b1.id=sb1.branch_id and b1.company_id=v_company_id
  join branches b2 on b2.id=sb2.branch_id and b2.company_id=v_company_id
  join items i on i.id=sb1.item_id and i.id=sb2.item_id and i.company_id=v_company_id
  where coalesce(sb1.qty,0)-coalesce(sb1.allocated_qty,0)>=1
  order by sb1.branch_id,sb2.branch_id,sb1.item_id limit 1;
  if v_from_branch is null or v_to_branch is null or v_item_id is null then
    raise exception 'TEST BLOCKED: no item with source available stock and a second company branch';
  end if;

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
