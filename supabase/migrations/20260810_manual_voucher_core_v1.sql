-- RAWAEA Inventory Rescue — Manual Stock Voucher Core V1
-- NOT approved for production execution until owner validation.
-- Existing send_stock_voucher_atomic remains untouched.
-- Business-rule planning remains in the Edge/domain layer.
-- Database functions below provide the atomic state/mutation boundary.

create or replace function public.create_manual_stock_voucher_atomic(
  p_company_id uuid, p_type text, p_reference text,
  p_from_type text, p_from_id uuid, p_to_type text, p_to_id uuid,
  p_notes text, p_created_by text, p_items jsonb
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_voucher_id uuid; v_voucher_code text; v_item jsonb; v_item_id uuid;
  v_count integer; v_last_num bigint;
  v_settings_company uuid;
begin
  select company_id into v_settings_company from app_settings limit 1;
  if v_settings_company is null or v_settings_company <> p_company_id then
    raise exception 'سياق الشركة غير متسق مع إعدادات النظام';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then
    raise exception 'يجب إضافة صنف واحد على الأقل';
  end if;

  perform pg_advisory_xact_lock(hashtext('rawaea:stock-voucher-code'));
  select coalesce(max(substring(voucher_code from '[0-9]+$')::bigint),0)
    into v_last_num
  from stock_vouchers where company_id=p_company_id;
  v_voucher_code := 'IN-' || (v_last_num+1)::text;

  insert into stock_vouchers(
    voucher_code,voucher_date,type,status,reference,from_type,from_id,to_type,to_id,notes,created_by,source,company_id
  ) values(
    v_voucher_code,current_date,p_type,'Draft',coalesce(p_reference,''),p_from_type,p_from_id,p_to_type,p_to_id,coalesce(p_notes,''),p_created_by,'Manual',p_company_id
  ) returning id into v_voucher_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if coalesce(nullif(v_item->>'itemCode',''),'')='' then raise exception 'كود الصنف مطلوب'; end if;
    if coalesce((v_item->>'qty')::numeric,0)<=0 then raise exception 'كمية الصنف يجب أن تكون أكبر من صفر'; end if;

    select count(*) into v_count from items i
    where i.company_id=p_company_id and i.item_code=v_item->>'itemCode';
    if v_count=0 then raise exception 'الصنف غير موجود: %',v_item->>'itemCode'; end if;
    if v_count>1 then raise exception 'كود الصنف غير فريد داخل الشركة: %',v_item->>'itemCode'; end if;

    select i.id into v_item_id from items i
    where i.company_id=p_company_id and i.item_code=v_item->>'itemCode';

    insert into stock_voucher_details(voucher_id,item_id,item_code,item_name,unit,qty,unit_price,notes)
    values(
      v_voucher_id,v_item_id,v_item->>'itemCode',
      coalesce(nullif(v_item->>'itemName',''),v_item->>'itemCode'),
      coalesce(nullif(v_item->>'unit',''),'حبة'),
      (v_item->>'qty')::numeric,coalesce((v_item->>'unitPrice')::numeric,0),coalesce(v_item->>'notes','')
    );
  end loop;

  return jsonb_build_object('success',true,'voucher_id',v_voucher_id,'voucher_code',v_voucher_code);
end;
$$;

create or replace function public.post_manual_stock_voucher_atomic(
  p_company_id uuid, p_voucher_code text, p_operation text, p_user_email text, p_effects jsonb default '[]'::jsonb
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_voucher stock_vouchers%rowtype; v_effect record; v_stock stock_branches%rowtype; v_detail record;
  v_direction text; v_branch_id uuid; v_item_id uuid; v_qty numeric; v_available numeric;
  v_log_code text; v_expected_status text; v_new_status text; v_valid boolean;
  v_settings_company uuid;
begin
  select company_id into v_settings_company from app_settings limit 1;
  if v_settings_company is null or v_settings_company <> p_company_id then
    raise exception 'سياق الشركة غير متسق مع إعدادات النظام';
  end if;

  if p_operation not in ('SEND','RECEIVE') then raise exception 'عملية مخزنية غير مدعومة'; end if;
  if p_effects is null or jsonb_typeof(p_effects)<>'array' or jsonb_array_length(p_effects)=0 then raise exception 'لا توجد حركات مخزنية للتنفيذ'; end if;

  select * into v_voucher from stock_vouchers
  where company_id=p_company_id and voucher_code=p_voucher_code for update;
  if not found then raise exception 'الإذن غير موجود'; end if;

  v_expected_status := case when p_operation='SEND' then 'Draft' else 'Sent' end;
  v_new_status := case when p_operation='SEND' then 'Sent' else 'Received' end;
  if v_voucher.status<>v_expected_status then raise exception 'حالة الإذن لا تسمح بهذه العملية'; end if;

  for v_effect in
    select * from jsonb_to_recordset(p_effects) as e(direction text,branch_id uuid,item_id uuid,item_code text,qty numeric)
    order by e.branch_id,e.item_id,e.direction
  loop
    v_direction:=v_effect.direction; v_branch_id:=v_effect.branch_id; v_item_id:=v_effect.item_id; v_qty:=v_effect.qty;
    if v_direction not in ('OUT','IN') then raise exception 'اتجاه حركة غير صالح'; end if;
    if v_branch_id is null or v_item_id is null or v_qty is null or v_qty<=0 then raise exception 'بيانات حركة مخزنية غير صالحة'; end if;

    select exists(select 1 from branches where id=v_branch_id and company_id=p_company_id) into v_valid;
    if not v_valid then raise exception 'الفرع غير موجود أو لا يتبع الشركة الحالية'; end if;

    select exists(select 1 from items i where i.company_id=p_company_id and i.id=v_item_id and i.item_code=v_effect.item_code) into v_valid;
    if not v_valid then raise exception 'الصنف غير متسق مع سياق الشركة: %',v_effect.item_code; end if;

    if v_direction='OUT' then
      if v_voucher.from_type<>'Branch' or v_voucher.from_id<>v_branch_id then raise exception 'مصدر الحركة لا يطابق مصدر الإذن'; end if;
    else
      if v_voucher.to_type<>'Branch' or v_voucher.to_id<>v_branch_id then raise exception 'وجهة الحركة لا تطابق وجهة الإذن'; end if;
    end if;

    select * into v_stock from stock_branches
    where branch_id=v_branch_id and item_id=v_item_id for update;
    if not found then raise exception 'رصيد المخزون غير موجود للصنف %',v_effect.item_code; end if;

    if v_direction='OUT' then
      v_available:=coalesce(v_stock.qty,0)-coalesce(v_stock.allocated_qty,0);
      if v_available<v_qty then raise exception 'الرصيد المتاح غير كافٍ للصنف %',v_effect.item_code; end if;
      update stock_branches set qty=v_stock.qty-v_qty
      where id=v_stock.id and qty=v_stock.qty and allocated_qty=v_stock.allocated_qty and qty>=allocated_qty+v_qty;
      if not found then raise exception 'تغير رصيد المخزون أثناء العملية للصنف %',v_effect.item_code; end if;
      v_log_code:='OUT-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS')||'-'||substr(md5(random()::text),1,8);
    else
      update stock_branches set qty=v_stock.qty+v_qty
      where id=v_stock.id and qty=v_stock.qty and allocated_qty=v_stock.allocated_qty;
      if not found then raise exception 'تغير رصيد المخزون أثناء العملية للصنف %',v_effect.item_code; end if;
      v_log_code:='IN-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS')||'-'||substr(md5(random()::text),1,8);
    end if;

    insert into inventory_log(company_id,log_code,movement_date,voucher_id,item_id,item_code,item_name,movement_type,qty,reference,user_email)
    values(
      p_company_id,v_log_code,current_date,p_voucher_code,v_item_id,v_effect.item_code,
      coalesce((select d.item_name from stock_voucher_details d where d.voucher_id=v_voucher.id and d.item_id=v_item_id limit 1),v_effect.item_code),
      v_voucher.type,v_qty,p_voucher_code,p_user_email
    );

    if p_operation='RECEIVE' and v_direction='IN' then
      select d.item_id,d.item_code,d.qty into v_detail
      from stock_voucher_details d
      where d.voucher_id=v_voucher.id and d.item_id=v_item_id and d.item_code=v_effect.item_code;
      if not found then raise exception 'الصنف غير موجود في تفاصيل الإذن: %',v_effect.item_code; end if;
      if v_qty>v_detail.qty then raise exception 'الكمية المستلمة أكبر من كمية الإذن للصنف %',v_effect.item_code; end if;
      update stock_voucher_details set received_qty=v_qty
      where voucher_id=v_voucher.id and item_id=v_item_id and item_code=v_effect.item_code;
    end if;
  end loop;

  update stock_vouchers set
    status=v_new_status,
    sent_date=case when p_operation='SEND' then now() else sent_date end,
    received_date=case when p_operation='RECEIVE' then now() else received_date end,
    received_by=case when p_operation='RECEIVE' then p_user_email else received_by end
  where id=v_voucher.id and company_id=p_company_id and status=v_expected_status;
  if not found then raise exception 'فشل انتقال حالة الإذن'; end if;

  return jsonb_build_object('success',true,'voucher_code',p_voucher_code,'operation',p_operation);
end;
$$;

create or replace function public.complete_manual_stock_voucher_atomic(p_company_id uuid,p_voucher_code text,p_user_email text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_voucher stock_vouchers%rowtype; v_expected_status text; v_settings_company uuid;
begin
  select company_id into v_settings_company from app_settings limit 1;
  if v_settings_company is null or v_settings_company <> p_company_id then
    raise exception 'سياق الشركة غير متسق مع إعدادات النظام';
  end if;
  select * into v_voucher from stock_vouchers where company_id=p_company_id and voucher_code=p_voucher_code for update;
  if not found then raise exception 'الإذن غير موجود'; end if;
  v_expected_status:=case when v_voucher.type in ('Transfer','DirectReturn') then 'Received' when v_voucher.type in ('DirectSale','SupplierReturn') then 'Sent' else null end;
  if v_expected_status is null or v_voucher.status<>v_expected_status then raise exception 'حالة الإذن لا تسمح بالإكمال'; end if;
  update stock_vouchers set status='Completed',completed_at=now(),completed_by=p_user_email
  where id=v_voucher.id and company_id=p_company_id and status=v_expected_status;
  if not found then raise exception 'فشل إكمال الإذن'; end if;
  return jsonb_build_object('success',true,'voucher_code',p_voucher_code);
end;
$$;

create or replace function public.cancel_manual_stock_voucher_atomic(p_company_id uuid,p_voucher_code text,p_user_email text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_voucher stock_vouchers%rowtype; v_settings_company uuid;
begin
  select company_id into v_settings_company from app_settings limit 1;
  if v_settings_company is null or v_settings_company <> p_company_id then
    raise exception 'سياق الشركة غير متسق مع إعدادات النظام';
  end if;
  select * into v_voucher from stock_vouchers where company_id=p_company_id and voucher_code=p_voucher_code for update;
  if not found then raise exception 'الإذن غير موجود'; end if;
  if v_voucher.status<>'Draft' then raise exception 'لا يمكن إلغاء إذن بعد تنفيذ حركة مخزنية؛ استخدم حركة عكسية رسمية'; end if;
  update stock_vouchers set status='Cancelled' where id=v_voucher.id and company_id=p_company_id and status='Draft';
  if not found then raise exception 'فشل إلغاء الإذن'; end if;
  return jsonb_build_object('success',true,'voucher_code',p_voucher_code);
end;
$$;

revoke all on function public.create_manual_stock_voucher_atomic(uuid,text,text,text,uuid,text,uuid,text,text,jsonb) from public;
revoke all on function public.post_manual_stock_voucher_atomic(uuid,text,text,text,jsonb) from public;
revoke all on function public.complete_manual_stock_voucher_atomic(uuid,text,text) from public;
revoke all on function public.cancel_manual_stock_voucher_atomic(uuid,text,text) from public;
grant execute on function public.create_manual_stock_voucher_atomic(uuid,text,text,text,uuid,text,uuid,text,text,jsonb) to service_role;
grant execute on function public.post_manual_stock_voucher_atomic(uuid,text,text,text,jsonb) to service_role;
grant execute on function public.complete_manual_stock_voucher_atomic(uuid,text,text) to service_role;
grant execute on function public.cancel_manual_stock_voucher_atomic(uuid,text,text) to service_role;
