-- RAWAEA Manual Stock Voucher Core V1 — RELEASE
-- Target: rescue/manual-vouchers-inventory-core
-- STATUS: NOT EXECUTED IN PRODUCTION
-- Execute ONCE only after explicit CTO/Owner GO.
-- No test/business data is inserted.
-- This is the single consolidated deployment script for the current target.

create or replace function public.create_manual_stock_voucher_atomic(
  p_company_id uuid,
  p_type text,
  p_reference text,
  p_from_type text,
  p_from_id uuid,
  p_to_type text,
  p_to_id uuid,
  p_notes text,
  p_created_by text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voucher_id uuid;
  v_voucher_code text;
  v_item jsonb;
  v_item_id uuid;
  v_count integer;
  v_last_num bigint;
  v_settings_company uuid;
  v_valid boolean;
begin
  select company_id into v_settings_company from app_settings limit 1;
  if v_settings_company is null or v_settings_company <> p_company_id then
    raise exception 'سياق الشركة غير متسق مع إعدادات النظام';
  end if;
  if p_type not in ('Transfer','DirectSale','DirectReturn','SupplierReturn') then
    raise exception 'نوع الإذن غير مدعوم في دورة الأذونات الحالية';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'يجب إضافة صنف واحد على الأقل';
  end if;
  if p_type in ('Transfer','DirectSale','DirectReturn') then
    if p_from_type <> 'Branch' or p_from_id is null then raise exception 'مصدر الإذن يجب أن يكون فرعًا محددًا'; end if;
    if p_to_type <> 'Branch' or p_to_id is null then raise exception 'وجهة الإذن يجب أن تكون فرعًا محددًا'; end if;
  elsif p_type = 'SupplierReturn' then
    if p_from_type <> 'Branch' or p_from_id is null then raise exception 'مصدر مرتجع المورد يجب أن يكون فرعًا محددًا'; end if;
    if p_to_type <> 'Supplier' or p_to_id is null then raise exception 'وجهة مرتجع المورد يجب أن تكون موردًا محددًا'; end if;
  end if;
  if p_from_type = 'Branch' then
    select exists(select 1 from branches b where b.id=p_from_id and b.company_id=p_company_id) into v_valid;
    if not v_valid then raise exception 'فرع المصدر غير موجود أو لا يتبع الشركة الحالية'; end if;
  end if;
  if p_to_type = 'Branch' then
    select exists(select 1 from branches b where b.id=p_to_id and b.company_id=p_company_id) into v_valid;
    if not v_valid then raise exception 'فرع الوجهة غير موجود أو لا يتبع الشركة الحالية'; end if;
  end if;
  perform pg_advisory_xact_lock(hashtext('rawaea:stock-voucher-code'));
  select coalesce(max(substring(voucher_code from '[0-9]+$')::bigint),0) into v_last_num
  from stock_vouchers where company_id=p_company_id;
  v_voucher_code := 'IN-' || (v_last_num + 1)::text;
  insert into stock_vouchers(voucher_code,voucher_date,type,status,reference,from_type,from_id,to_type,to_id,notes,created_by,source,company_id)
  values(v_voucher_code,current_date,p_type,'Draft',coalesce(p_reference,''),p_from_type,p_from_id,p_to_type,p_to_id,coalesce(p_notes,''),p_created_by,'Manual',p_company_id)
  returning id into v_voucher_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if coalesce(nullif(v_item->>'itemCode',''),'')='' then raise exception 'كود الصنف مطلوب'; end if;
    if coalesce((v_item->>'qty')::numeric,0)<=0 then raise exception 'كمية الصنف يجب أن تكون أكبر من صفر'; end if;
    select count(*) into v_count from items i where i.company_id=p_company_id and i.item_code=v_item->>'itemCode';
    if v_count=0 then raise exception 'الصنف غير موجود: %',v_item->>'itemCode'; end if;
    if v_count>1 then raise exception 'كود الصنف غير فريد داخل الشركة: %',v_item->>'itemCode'; end if;
    select i.id into v_item_id from items i where i.company_id=p_company_id and i.item_code=v_item->>'itemCode';
    if exists(select 1 from stock_voucher_details d where d.voucher_id=v_voucher_id and d.item_id=v_item_id) then
      raise exception 'لا يمكن تكرار الصنف داخل نفس الإذن: %',v_item->>'itemCode';
    end if;
    insert into stock_voucher_details(voucher_id,item_id,item_code,item_name,unit,qty,unit_price,notes)
    values(v_voucher_id,v_item_id,v_item->>'itemCode',coalesce(nullif(v_item->>'itemName',''),v_item->>'itemCode'),coalesce(nullif(v_item->>'unit',''),'حبة'),(v_item->>'qty')::numeric,coalesce((v_item->>'unitPrice')::numeric,0),coalesce(v_item->>'notes',''));
  end loop;
  return jsonb_build_object('success',true,'voucher_id',v_voucher_id,'voucher_code',v_voucher_code);
end;
$$;

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
  v_settings_company uuid;
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
  select company_id into v_settings_company from app_settings limit 1;
  if v_settings_company is null or v_settings_company <> p_company_id then raise exception 'سياق الشركة غير متسق مع إعدادات النظام'; end if;
  if p_operation not in ('SEND','RECEIVE') then raise exception 'عملية مخزنية غير مدعومة'; end if;
  if p_effects is null or jsonb_typeof(p_effects)<>'array' or jsonb_array_length(p_effects)=0 then raise exception 'لا توجد حركات مخزنية للتنفيذ'; end if;

  select * into v_voucher from stock_vouchers where company_id=p_company_id and voucher_code=p_voucher_code for update;
  if not found then raise exception 'الإذن غير موجود'; end if;
  if p_operation='SEND' and v_voucher.type not in ('Transfer','DirectSale','SupplierReturn') then raise exception 'هذا النوع لا يخصم المخزون عند الإرسال'; end if;
  if p_operation='RECEIVE' and v_voucher.type not in ('Transfer','DirectReturn') then raise exception 'هذا النوع لا يضيف المخزون عند الاستلام'; end if;

  if v_voucher.type in ('Transfer','DirectSale','DirectReturn') then
    if v_voucher.from_type<>'Branch' or v_voucher.from_id is null then raise exception 'مصدر الإذن يجب أن يكون فرعًا محددًا'; end if;
    if v_voucher.to_type<>'Branch' or v_voucher.to_id is null then raise exception 'وجهة الإذن يجب أن تكون فرعًا محددًا'; end if;
  elsif v_voucher.type='SupplierReturn' then
    if v_voucher.from_type<>'Branch' or v_voucher.from_id is null then raise exception 'مصدر مرتجع المورد يجب أن يكون فرعًا محددًا'; end if;
    if v_voucher.to_type<>'Supplier' or v_voucher.to_id is null then raise exception 'وجهة مرتجع المورد يجب أن تكون موردًا محددًا'; end if;
  end if;

  v_expected_status:=case when p_operation='SEND' then 'Draft' else 'Sent' end;
  if v_voucher.status<>v_expected_status then raise exception 'حالة الإذن لا تسمح بهذه العملية'; end if;

  for v_effect in select * from jsonb_to_recordset(p_effects) as e(direction text,branch_id uuid,item_id uuid,item_code text,qty numeric) order by e.branch_id,e.item_id,e.direction loop
    if v_effect.direction not in ('OUT','IN') or v_effect.branch_id is null or v_effect.item_id is null or v_effect.item_code is null or v_effect.qty is null or v_effect.qty<=0 then raise exception 'بيانات حركة مخزنية غير صالحة'; end if;
    select d.qty,coalesce(d.received_qty,0) into v_detail_qty,v_received_before from stock_voucher_details d where d.voucher_id=v_voucher.id and d.item_id=v_effect.item_id and d.item_code=v_effect.item_code;
    if not found then raise exception 'الحركة تحتوي صنفًا غير موجود في الإذن: %',v_effect.item_code; end if;
    select exists(select 1 from branches b where b.id=v_effect.branch_id and b.company_id=p_company_id) into v_valid;
    if not v_valid then raise exception 'الفرع غير موجود أو لا يتبع الشركة الحالية'; end if;
    select exists(select 1 from items i where i.id=v_effect.item_id and i.company_id=p_company_id and i.item_code=v_effect.item_code) into v_valid;
    if not v_valid then raise exception 'الصنف غير متسق مع سياق الشركة: %',v_effect.item_code; end if;

    if p_operation='SEND' then
      if v_effect.direction='OUT' and v_effect.branch_id=v_voucher.from_id and v_voucher.type in ('Transfer','DirectSale','SupplierReturn') then null;
      elsif v_effect.direction='IN' and v_effect.branch_id=v_voucher.to_id and v_voucher.type='DirectSale' then null;
      else raise exception 'اتجاه/فرع الحركة لا يطابق نوع الإذن'; end if;
      if v_effect.qty<>v_detail_qty then raise exception 'كمية الإرسال لا تطابق كمية الإذن للصنف %',v_effect.item_code; end if;
    else
      if v_effect.qty>(v_detail_qty-v_received_before) then raise exception 'الكمية المستلمة أكبر من الكمية المتبقية للصنف %',v_effect.item_code; end if;
      if v_effect.direction='IN' and v_effect.branch_id=v_voucher.to_id and v_voucher.type='Transfer' then null;
      elsif v_effect.direction='OUT' and v_effect.branch_id=v_voucher.from_id and v_voucher.type='DirectReturn' then null;
      elsif v_effect.direction='IN' and v_effect.branch_id=v_voucher.to_id and v_voucher.type='DirectReturn' then null;
      else raise exception 'اتجاه/فرع الاستلام لا يطابق نوع الإذن'; end if;
    end if;
  end loop;

  for v_detail in select d.item_id,d.item_code,d.qty,coalesce(d.received_qty,0) as received_qty from stock_voucher_details d where d.voucher_id=v_voucher.id loop
    select coalesce(sum(case when e.direction='OUT' then e.qty else 0 end),0),coalesce(sum(case when e.direction='IN' then e.qty else 0 end),0),count(*) filter(where e.direction='OUT'),count(*) filter(where e.direction='IN'),count(*) into v_out_sum,v_in_sum,v_out_count,v_in_count,v_total_count from jsonb_to_recordset(p_effects) as e(direction text,branch_id uuid,item_id uuid,item_code text,qty numeric) where e.item_id=v_detail.item_id and e.item_code=v_detail.item_code;
    if p_operation='SEND' then
      if v_voucher.type in ('Transfer','SupplierReturn') then
        if v_out_count<>1 or v_in_count<>0 or v_out_sum<>v_detail.qty then raise exception 'حركات الإرسال لا تطابق تفاصيل الإذن للصنف %',v_detail.item_code; end if;
      elsif v_voucher.type='DirectSale' then
        if v_out_count<>1 or v_in_count<>1 or v_out_sum<>v_detail.qty or v_in_sum<>v_detail.qty then raise exception 'حركات صرف السيارة لا تطابق تفاصيل الإذن للصنف %',v_detail.item_code; end if;
      end if;
    else
      if v_total_count=0 then continue; end if;
      if v_voucher.type='Transfer' then
        if v_out_count<>0 or v_in_count<>1 or v_in_sum<=0 or v_in_sum>(v_detail.qty-v_detail.received_qty) then raise exception 'حركات استلام التحويل غير صالحة للصنف %',v_detail.item_code; end if;
      elsif v_voucher.type='DirectReturn' then
        if v_out_count<>1 or v_in_count<>1 or v_out_sum<=0 or v_out_sum<>v_in_sum or v_in_sum>(v_detail.qty-v_detail.received_qty) then raise exception 'حركات المرتجع المباشر غير صالحة للصنف %',v_detail.item_code; end if;
      end if;
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

  if p_operation='SEND' then
    v_new_status:='Sent';
  else
    select count(*) into v_remaining_details from stock_voucher_details d where d.voucher_id=v_voucher.id and coalesce(d.received_qty,0)<d.qty;
    v_new_status:=case when v_remaining_details=0 then 'Received' else 'Sent' end;
  end if;

  update stock_vouchers set status=v_new_status,sent_date=case when p_operation='SEND' then now() else sent_date end,received_date=case when p_operation='RECEIVE' and v_new_status='Received' then now() else received_date end,received_by=case when p_operation='RECEIVE' and v_new_status='Received' then p_user_email else received_by end where id=v_voucher.id and company_id=p_company_id and status=v_expected_status;
  if not found then raise exception 'فشل انتقال حالة الإذن'; end if;
  return jsonb_build_object('success',true,'voucher_code',p_voucher_code,'operation',p_operation,'status',v_new_status);
end;
$$;

create or replace function public.complete_manual_stock_voucher_atomic(p_company_id uuid,p_voucher_code text,p_user_email text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_voucher stock_vouchers%rowtype; v_expected_status text; v_settings_company uuid;
begin
  select company_id into v_settings_company from app_settings limit 1;
  if v_settings_company is null or v_settings_company <> p_company_id then raise exception 'سياق الشركة غير متسق مع إعدادات النظام'; end if;
  select * into v_voucher from stock_vouchers where company_id=p_company_id and voucher_code=p_voucher_code for update;
  if not found then raise exception 'الإذن غير موجود'; end if;
  v_expected_status:=case when v_voucher.type in ('Transfer','DirectReturn') then 'Received' when v_voucher.type in ('DirectSale','SupplierReturn') then 'Sent' else null end;
  if v_expected_status is null or v_voucher.status<>v_expected_status then raise exception 'حالة الإذن لا تسمح بالإكمال'; end if;
  update stock_vouchers set status='Completed',completed_at=now(),completed_by=p_user_email where id=v_voucher.id and company_id=p_company_id and status=v_expected_status;
  if not found then raise exception 'فشل إكمال الإذن'; end if;
  return jsonb_build_object('success',true,'voucher_code',p_voucher_code);
end;
$$;

create or replace function public.cancel_manual_stock_voucher_atomic(p_company_id uuid,p_voucher_code text,p_user_email text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_voucher stock_vouchers%rowtype; v_settings_company uuid;
begin
  select company_id into v_settings_company from app_settings limit 1;
  if v_settings_company is null or v_settings_company <> p_company_id then raise exception 'سياق الشركة غير متسق مع إعدادات النظام'; end if;
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
