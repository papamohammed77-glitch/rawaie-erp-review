-- SELF-CLEANING MANUAL VOUCHER LIFECYCLE SMOKE TEST V4
-- Pre-operational Production only.
-- Uses verified company/branches/item: company da4ef704-88ac-4120-aa0e-65b92b2aa2bc, BR-01 -> BR-2, item 1004.
-- All mutations occur inside one transaction and are rolled back at the end.

begin;

create temp table _rawaea_lifecycle_test_result (
  test_name text,
  result jsonb
) on commit drop;

do $$
declare
  v_company_id uuid := 'da4ef704-88ac-4120-aa0e-65b92b2aa2bc';
  v_from_branch uuid;
  v_to_branch uuid;
  v_item_id uuid;
  v_item_code text;
  v_before_from numeric;
  v_before_to numeric;
  v_voucher jsonb;
  v_send jsonb;
  v_receive jsonb;
  v_complete jsonb;
  v_voucher_code text;
  v_after_send_from numeric;
  v_after_receive_from numeric;
  v_after_receive_to numeric;
  v_status text;
  v_log_count integer;
begin
  select id into v_from_branch from public.branches
  where company_id = v_company_id and branch_code = 'BR-01' and is_active = true limit 1;

  select id into v_to_branch from public.branches
  where company_id = v_company_id and branch_code = 'BR-2' and is_active = true limit 1;

  if v_from_branch is null or v_to_branch is null then
    raise exception 'TEST BLOCKED: verified company does not contain active BR-01 and BR-2';
  end if;

  if v_from_branch = v_to_branch then
    raise exception 'TEST BLOCKED: source and target branches must differ';
  end if;

  select id, item_code into v_item_id, v_item_code
  from public.items
  where company_id = v_company_id and item_code = '1004' limit 1;

  if v_item_id is null then
    raise exception 'TEST BLOCKED: item 1004 does not exist for verified company';
  end if;

  insert into public.stock_branches(branch_id, item_id, qty, allocated_qty)
  values (v_from_branch, v_item_id, 1, 0)
  on conflict (branch_id, item_id) do update set qty = 1, allocated_qty = 0;

  insert into public.stock_branches(branch_id, item_id, qty, allocated_qty)
  values (v_to_branch, v_item_id, 0, 0)
  on conflict (branch_id, item_id) do update set qty = 0, allocated_qty = 0;

  select qty into v_before_from from public.stock_branches where branch_id=v_from_branch and item_id=v_item_id;
  select qty into v_before_to from public.stock_branches where branch_id=v_to_branch and item_id=v_item_id;

  select public.create_manual_stock_voucher_atomic(
    v_company_id,'Transfer','SELF-TEST-MANUAL-VOUCHER','Branch',v_from_branch,
    'Branch',v_to_branch,'SELF-CLEANING LIFECYCLE TEST','lifecycle-smoke-test@rawaea.local',
    jsonb_build_array(jsonb_build_object('itemCode',v_item_code,'qty',1,'unitPrice',0,'notes','SELF-CLEANING TEST'))
  ) into v_voucher;

  v_voucher_code := v_voucher->>'voucher_code';
  if coalesce((v_voucher->>'success')::boolean,false) is not true or v_voucher_code is null then
    raise exception 'CREATE FAILED: %',v_voucher;
  end if;

  select public.post_manual_stock_voucher_atomic(
    v_company_id,v_voucher_code,'SEND','lifecycle-smoke-test@rawaea.local',
    jsonb_build_array(jsonb_build_object('direction','OUT','branch_id',v_from_branch,'item_id',v_item_id,'item_code',v_item_code,'qty',1))
  ) into v_send;

  select qty into v_after_send_from from public.stock_branches where branch_id=v_from_branch and item_id=v_item_id;
  if v_after_send_from <> v_before_from - 1 then
    raise exception 'SEND STOCK FAILED: before=%, after=%',v_before_from,v_after_send_from;
  end if;

  select count(*) into v_log_count from public.inventory_log where reference=v_voucher_code;
  if v_log_count < 1 then raise exception 'SEND LOG FAILED'; end if;

  select public.post_manual_stock_voucher_atomic(
    v_company_id,v_voucher_code,'RECEIVE','lifecycle-smoke-test@rawaea.local',
    jsonb_build_array(jsonb_build_object('direction','IN','branch_id',v_to_branch,'item_id',v_item_id,'item_code',v_item_code,'qty',1))
  ) into v_receive;

  select qty into v_after_receive_from from public.stock_branches where branch_id=v_from_branch and item_id=v_item_id;
  select qty into v_after_receive_to from public.stock_branches where branch_id=v_to_branch and item_id=v_item_id;

  if v_after_receive_from <> v_before_from - 1 or v_after_receive_to <> v_before_to + 1 then
    raise exception 'RECEIVE STOCK FAILED: source before=% after=%; target before=% after=%',v_before_from,v_after_receive_from,v_before_to,v_after_receive_to;
  end if;

  select status into v_status from public.stock_vouchers where company_id=v_company_id and voucher_code=v_voucher_code;
  if v_status <> 'Received' then raise exception 'RECEIVE STATUS FAILED: %',v_status; end if;

  select count(*) into v_log_count from public.inventory_log where reference=v_voucher_code;
  if v_log_count < 2 then raise exception 'RECEIVE LOG FAILED'; end if;

  select public.complete_manual_stock_voucher_atomic(v_company_id,v_voucher_code,'lifecycle-smoke-test@rawaea.local') into v_complete;

  select status into v_status from public.stock_vouchers where company_id=v_company_id and voucher_code=v_voucher_code;
  if v_status <> 'Completed' then raise exception 'COMPLETE STATUS FAILED: %',v_status; end if;

  insert into _rawaea_lifecycle_test_result values (
    'MANUAL_VOUCHER_LIFECYCLE',
    jsonb_build_object('passed',true,'voucher_code',v_voucher_code,'company_id',v_company_id,
      'source_branch','BR-01','target_branch','BR-2','item_code',v_item_code,'qty',1,
      'source_qty_before',v_before_from,'source_qty_after',v_after_receive_from,
      'target_qty_before',v_before_to,'target_qty_after',v_after_receive_to,
      'inventory_log_rows',v_log_count,'final_status',v_status,'cleanup','FULL TRANSACTION ROLLBACK')
  );
exception when others then
  insert into _rawaea_lifecycle_test_result values ('MANUAL_VOUCHER_LIFECYCLE',jsonb_build_object('passed',false,'error',sqlerrm));
end;
$$;

select * from _rawaea_lifecycle_test_result;

rollback;
