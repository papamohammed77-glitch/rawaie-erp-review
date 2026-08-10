-- RAWAEA Manual Stock Voucher Core V1 — SINGLE-COMPANY CONTEXT PATCH
-- Purpose: remove arbitrary LIMIT 1 company-context selection.
-- Current release is single-company; validate the requested company directly against app_settings.
-- No schema change and no business/test data.
-- Replaces ONLY post_manual_stock_voucher_atomic.
-- IMPORTANT: execute ONCE in Production only after explicit GO.

-- Source: 20260810_manual_voucher_core_v1_SCHEMA_COMPATIBILITY_PATCH.sql
-- Only the company-context block is changed:
--   OLD: select company_id into v_settings_company from app_settings limit 1;
--   NEW: require the requested p_company_id to exist in app_settings.
-- The remainder of the already validated RPC is intentionally unchanged.

create or replace function public.post_manual_stock_voucher_atomic(
  p_company_id uuid,
  p_voucher_code text,
  p_operation text,
  p_user_email text,
  p_effects jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voucher stock_vouchers%rowtype;
  v_effect record;
  v_detail record;
  v_stock stock_branches%rowtype;
  v_expected_status text;
  v_new_status text;
  v_valid boolean;
  v_qty numeric;
  v_available numeric;
  v_detail_qty numeric;
  v_received_before numeric;
  v_out_sum numeric;
  v_in_sum numeric;
  v_out_count integer;
  v_in_count integer;
  v_total_count integer;
  v_log_code text;
  v_remaining_details integer;
begin
  if not exists (
    select 1 from app_settings s where s.company_id = p_company_id
  ) then
    raise exception 'سياق الشركة غير متسق مع إعدادات النظام';
  end if;

  if p_operation not in ('SEND','RECEIVE') then
    raise exception 'عملية مخزنية غير مدعومة';
  end if;

  if p_effects is null or jsonb_typeof(p_effects) <> 'array' or jsonb_array_length(p_effects) = 0 then
    raise exception 'لا توجد حركات مخزنية للتنفيذ';
  end if;

  select * into v_voucher
  from stock_vouchers
  where company_id = p_company_id
    and voucher_code = p_voucher_code
  for update;

  if not found then
    raise exception 'الإذن غير موجود';
  end if;

  if p_operation = 'SEND' and v_voucher.type not in ('Transfer','DirectSale','SupplierReturn') then
    raise exception 'هذا النوع لا يخصم المخزون عند الإرسال';
  end if;

  if p_operation = 'RECEIVE' and v_voucher.type not in ('Transfer','DirectReturn') then
    raise exception 'هذا النوع لا يضيف المخزون عند الاستلام';
  end if;

  if v_voucher.type in ('Transfer','DirectSale','DirectReturn') then
    if v_voucher.from_type <> 'Branch' or v_voucher.from_id is null then
      raise exception 'مصدر الإذن يجب أن يكون فرعًا محددًا';
    end if;
    if v_voucher.to_type <> 'Branch' or v_voucher.to_id is null then
      raise exception 'وجهة الإذن يجب أن تكون فرعًا محددًا';
    end if;
  elsif v_voucher.type = 'SupplierReturn' then
    if v_voucher.from_type <> 'Branch' or v_voucher.from_id is null then
      raise exception 'مصدر مرتجع المورد يجب أن يكون فرعًا محددًا';
    end if;
    if v_voucher.to_type <> 'Supplier' or v_voucher.to_id is null then
      raise exception 'وجهة مرتجع المورد يجب أن تكون موردًا محددًا';
    end if;
  end if;

  v_expected_status := case when p_operation = 'SEND' then 'Draft' else 'Sent' end;
  if v_voucher.status <> v_expected_status then
    raise exception 'حالة الإذن لا تسمح بهذه العملية';
  end if;

  for v_effect in
    select * from jsonb_to_recordset(p_effects) as e(direction text, branch_id uuid, item_id uuid, item_code text, qty numeric)
    order by e.branch_id, e.item_id, e.direction
  loop
    if v_effect.direction not in ('OUT','IN') or v_effect.branch_id is null or v_effect.item_id is null
       or v_effect.item_code is null or v_effect.qty is null or v_effect.qty <= 0 then
      raise exception 'بيانات حركة مخزنية غير صالحة';
    end if;

    select d.qty, coalesce(d.received_qty,0) into v_detail_qty, v_received_before
    from stock_voucher_details d
    where d.voucher_id = v_voucher.id and d.item_id = v_effect.item_id and d.item_code = v_effect.item_code;

    if not found then
      raise exception 'الحركة تحتوي صنفًا غير موجود في الإذن: %', v_effect.item_code;
    end if;

    select exists(select 1 from branches b where b.id = v_effect.branch_id and b.company_id = p_company_id) into v_valid;
    if not v_valid then raise exception 'الفرع غير موجود أو لا يتبع الشركة الحالية'; end if;

    select exists(select 1 from items i where i.id = v_effect.item_id and i.company_id = p_company_id and i.item_code = v_effect.item_code) into v_valid;
    if not v_valid then raise exception 'الصنف غير متسق مع سياق الشركة: %', v_effect.item_code; end if;

    if p_operation = 'SEND' then
      if v_effect.direction = 'OUT' and v_effect.branch_id = v_voucher.from_id and v_voucher.type in ('Transfer','DirectSale','SupplierReturn') then null;
      else raise exception 'اتجاه/فرع الحركة لا يطابق نوع الإذن'; end if;
      if v_effect.qty <> v_detail_qty then raise exception 'كمية الإرسال لا تطابق كمية الإذن للصنف %', v_effect.item_code; end if;
    else
      if v_effect.qty > (v_detail_qty - v_received_before) then raise exception 'الكمية المستلمة أكبر من الكمية المتبقية للصنف %', v_effect.item_code; end if;
      if v_effect.direction = 'IN' and v_effect.branch_id = v_voucher.to_id and v_voucher.type in ('Transfer','DirectReturn') then null;
      else raise exception 'اتجاه/فرع الاستلام لا يطابق نوع الإذن'; end if;
    end if;
  end loop;

  for v_detail in select d.item_id,d.item_code,d.qty,coalesce(d.received_qty,0) as received_qty from stock_voucher_details d where d.voucher_id=v_voucher.id loop
    select coalesce(sum(case when e.direction='OUT' then e.qty else 0 end),0),coalesce(sum(case when e.direction='IN' then e.qty else 0 end),0),count(*) filter(where e.direction='OUT'),count(*) filter(where e.direction='IN'),count(*)
    into v_out_sum,v_in_sum,v_out_count,v_in_count,v_total_count
    from jsonb_to_recordset(p_effects) as e(direction text,branch_id uuid,item_id uuid,item_code text,qty numeric)
    where e.item_id=v_detail.item_id and e.item_code=v_detail.item_code;

    if p_operation='SEND' then
      if v_out_count<>1 or v_in_count<>0 or v_out_sum<>v_detail.qty then raise exception 'حركات الإرسال لا تطابق تفاصيل الإذن للصنف %',v_detail.item_code; end if;
    else
      if v_total_count=0 then continue; end if;
      if v_in_count<>1 or v_out_count<>0 or v_in_sum<=0 or v_in_sum>(v_detail.qty-v_detail.received_qty) then raise exception 'حركات الاستلام غير صالحة للصنف %',v_detail.item_code; end if;
    end if;
  end loop;

  for v_effect in select * from jsonb_to_recordset(p_effects) as e(direction text,branch_id uuid,item_id uuid,item_code text,qty numeric) order by e.branch_id,e.item_id,e.direction loop
    select * into v_stock from stock_branches where branch_id=v_effect.branch_id and item_id=v_effect.item_id for update;
    if not found then raise exception 'رصيد المخزون غير موجود للصنف %',v_effect.item_code; end if;
    v_qty:=v_effect.qty;

    if v_effect.direction='OUT' then
      v_available:=coalesce(v_stock.qty,0)-coalesce(v_stock.allocated_qty,0);
      if v_available<v_qty then raise exception 'الرصيد المتاح غير كافٍ للصنف %',v_effect.item_code; end if;
      update stock_branches set qty=v_stock.qty-v_qty where id=v_stock.id and qty=v_stock.qty and allocated_qty=v_stock.allocated_qty and qty>=allocated_qty+v_qty;
      if not found then raise exception 'تغير رصيد المخزون أثناء العملية للصنف %',v_effect.item_code; end if;
      v_log_code:='OUT-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS')||'-'||substr(md5(random()::text),1,8);
    else
      update stock_branches set qty=v_stock.qty+v_qty where id=v_stock.id and qty=v_stock.qty and allocated_qty=v_stock.allocated_qty;
      if not found then raise exception 'تغير رصيد المخزون أثناء العملية للصنف %',v_effect.item_code; end if;
      v_log_code:='IN-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS')||'-'||substr(md5(random()::text),1,8);
    end if;

    insert into inventory_log(company_id,log_code,movement_date,voucher_id,item_id,item_code,item_name,movement_type,qty,reference,user_email)
    values(p_company_id,v_log_code,current_date,p_voucher_code,v_effect.item_id,v_effect.item_code,coalesce((select d.item_name from stock_voucher_details d where d.voucher_id=v_voucher.id and d.item_id=v_effect.item_id limit 1),v_effect.item_code),v_voucher.type,v_qty,p_voucher_code,p_user_email);

    if p_operation='RECEIVE' and v_effect.direction='IN' then
      update stock_voucher_details set received_qty=coalesce(received_qty,0)+v_qty where voucher_id=v_voucher.id and item_id=v_effect.item_id and item_code=v_effect.item_code;
      if not found then raise exception 'تعذر تحديث الكمية المستلمة للصنف %',v_effect.item_code; end if;
    end if;
  end loop;

  if p_operation='SEND' then v_new_status:='Sent';
  else
    select count(*) into v_remaining_details from stock_voucher_details d where d.voucher_id=v_voucher.id and coalesce(d.received_qty,0)<d.qty;
    v_new_status:=case when v_remaining_details=0 then 'Received' else 'Sent' end;
  end if;

  update stock_vouchers set status=v_new_status,sent_date=case when p_operation='SEND' then now() else sent_date end,received_date=case when p_operation='RECEIVE' and v_new_status='Received' then now() else received_date end where id=v_voucher.id and company_id=p_company_id and status=v_expected_status;
  if not found then raise exception 'فشل انتقال حالة الإذن'; end if;

  return jsonb_build_object('success',true,'voucher_code',p_voucher_code,'operation',p_operation,'status',v_new_status);
end;
$$;
