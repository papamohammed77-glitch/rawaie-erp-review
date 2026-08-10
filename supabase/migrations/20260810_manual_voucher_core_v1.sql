-- RAWAEA Inventory Rescue — Manual Stock Voucher Core V1
-- Branch: rescue/manual-vouchers-inventory-core
-- This migration is NOT approved for production execution until owner validation.
-- It intentionally leaves the existing send_stock_voucher_atomic function untouched.

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
  v_last_code text;
  v_last_num bigint;
begin
  if p_type not in ('Transfer','DirectSale','DirectReturn','SupplierReturn') then
    raise exception 'نوع الإذن غير مدعوم في دورة الأذونات الحالية';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'يجب إضافة صنف واحد على الأقل';
  end if;

  perform pg_advisory_xact_lock(hashtext('rawaea:stock-voucher-code'));

  select voucher_code into v_last_code
  from stock_vouchers
  where company_id = p_company_id
  order by id desc
  limit 1;

  v_last_num := coalesce(substring(v_last_code from '[0-9]+$')::bigint, 0);
  v_voucher_code := 'IN-' || (v_last_num + 1)::text;

  insert into stock_vouchers (
    voucher_code, voucher_date, type, status, reference,
    from_type, from_id, to_type, to_id, notes,
    created_by, source, company_id
  ) values (
    v_voucher_code, current_date, p_type, 'Draft', coalesce(p_reference, ''),
    p_from_type, p_from_id, p_to_type, p_to_id, coalesce(p_notes, ''),
    p_created_by, 'Manual', p_company_id
  )
  returning id into v_voucher_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(nullif(v_item->>'itemCode',''), '') = '' then
      raise exception 'كود الصنف مطلوب';
    end if;

    if coalesce((v_item->>'qty')::numeric, 0) <= 0 then
      raise exception 'كمية الصنف يجب أن تكون أكبر من صفر';
    end if;

    select count(*) into v_count
    from items i
    where i.company_id = p_company_id
      and i.item_code = v_item->>'itemCode';

    if v_count = 0 then
      raise exception 'الصنف غير موجود: %', v_item->>'itemCode';
    elsif v_count > 1 then
      raise exception 'كود الصنف غير فريد داخل الشركة: %', v_item->>'itemCode';
    end if;

    select i.id into v_item_id
    from items i
    where i.company_id = p_company_id
      and i.item_code = v_item->>'itemCode';

    insert into stock_voucher_details (
      voucher_id, item_id, item_code, item_name, unit,
      qty, unit_price, notes
    ) values (
      v_voucher_id,
      v_item_id,
      v_item->>'itemCode',
      coalesce(nullif(v_item->>'itemName',''), v_item->>'itemCode'),
      coalesce(nullif(v_item->>'unit',''), 'حبة'),
      (v_item->>'qty')::numeric,
      coalesce((v_item->>'unitPrice')::numeric, 0),
      coalesce(v_item->>'notes', '')
    );
  end loop;

  return jsonb_build_object(
    'success', true,
    'voucher_id', v_voucher_id,
    'voucher_code', v_voucher_code
  );
end;
$$;

create or replace function public.post_manual_stock_voucher_atomic(
  p_company_id uuid,
  p_voucher_code text,
  p_operation text,
  p_user_email text,
  p_received_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voucher stock_vouchers%rowtype;
  v_detail record;
  v_received jsonb;
  v_received_qty numeric;
  v_item_id uuid;
  v_stock stock_branches%rowtype;
  v_branch_id uuid;
  v_available numeric;
  v_log_code text;
  v_found boolean;
begin
  if p_operation not in ('SEND','RECEIVE') then
    raise exception 'عملية مخزنية غير مدعومة';
  end if;

  select * into v_voucher
  from stock_vouchers
  where company_id = p_company_id
    and voucher_code = p_voucher_code
  for update;

  if not found then
    raise exception 'الإذن غير موجود';
  end if;

  if p_operation = 'SEND' then
    if v_voucher.status <> 'Draft' then
      raise exception 'يمكن إرسال المسودات فقط';
    end if;

    if v_voucher.type not in ('Transfer','DirectSale','SupplierReturn') then
      raise exception 'هذا النوع لا يخصم المخزون عند الإرسال';
    end if;

    if v_voucher.from_type <> 'Branch' or v_voucher.from_id is null then
      raise exception 'مصدر المخزون يجب أن يكون فرعًا محددًا';
    end if;

    select id into v_branch_id from branches where id = v_voucher.from_id;
    if v_branch_id is null then
      raise exception 'الفرع المصدر غير موجود';
    end if;

    for v_detail in
      select d.item_id, d.item_code, d.item_name, d.qty
      from stock_voucher_details d
      where d.voucher_id = v_voucher.id
      order by d.id
    loop
      if coalesce(v_detail.qty, 0) <= 0 then
        raise exception 'كمية غير صالحة للصنف %', v_detail.item_code;
      end if;

      select count(*) > 0 into v_found
      from items i
      where i.company_id = p_company_id
        and i.id = v_detail.item_id
        and i.item_code = v_detail.item_code;
      if not v_found then
        raise exception 'الصنف غير متسق مع سياق الشركة: %', v_detail.item_code;
      end if;

      select * into v_stock
      from stock_branches
      where branch_id = v_branch_id
        and item_id = v_detail.item_id
      for update;

      if not found then
        raise exception 'رصيد المخزون غير موجود للصنف %', v_detail.item_code;
      end if;

      v_available := coalesce(v_stock.qty, 0) - coalesce(v_stock.allocated_qty, 0);
      if v_available < v_detail.qty then
        raise exception 'الرصيد المتاح غير كافٍ للصنف %', v_detail.item_code;
      end if;

      update stock_branches
      set qty = v_stock.qty - v_detail.qty
      where id = v_stock.id
        and qty = v_stock.qty
        and allocated_qty = v_stock.allocated_qty
        and qty >= allocated_qty + v_detail.qty;

      if not found then
        raise exception 'تغير رصيد المخزون أثناء العملية للصنف %', v_detail.item_code;
      end if;

      v_log_code := 'OUT-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || substr(md5(random()::text), 1, 8);
      insert into inventory_log (
        company_id, log_code, movement_date, voucher_id,
        item_id, item_code, item_name, movement_type,
        qty, reference, user_email
      ) values (
        p_company_id, v_log_code, current_date, p_voucher_code,
        v_detail.item_id, v_detail.item_code,
        coalesce(v_detail.item_name, v_detail.item_code),
        v_voucher.type, v_detail.qty, p_voucher_code, p_user_email
      );
    end loop;

    update stock_vouchers
    set status = 'Sent', sent_date = now()
    where id = v_voucher.id
      and company_id = p_company_id
      and status = 'Draft';

    if not found then
      raise exception 'فشل انتقال حالة الإذن إلى Sent';
    end if;

  else
    if v_voucher.status <> 'Sent' then
      raise exception 'يمكن استلام الأذونات المرسلة فقط';
    end if;

    if v_voucher.type not in ('Transfer','DirectReturn') then
      raise exception 'هذا النوع لا يضيف المخزون عند الاستلام';
    end if;

    if v_voucher.to_type <> 'Branch' or v_voucher.to_id is null then
      raise exception 'وجهة المخزون يجب أن تكون فرعًا محددًا';
    end if;

    select id into v_branch_id from branches where id = v_voucher.to_id;
    if v_branch_id is null then
      raise exception 'الفرع المستلم غير موجود';
    end if;

    if p_received_items is null or jsonb_typeof(p_received_items) <> 'array' or jsonb_array_length(p_received_items) = 0 then
      raise exception 'كميات الاستلام مطلوبة';
    end if;

    for v_received in select value from jsonb_array_elements(p_received_items)
    loop
      v_received_qty := coalesce((v_received->>'receivedQty')::numeric, 0);
      if v_received_qty <= 0 then
        raise exception 'كمية الاستلام يجب أن تكون أكبر من صفر';
      end if;

      select d.item_id, d.item_code, d.item_name, d.qty
      into v_detail
      from stock_voucher_details d
      where d.voucher_id = v_voucher.id
        and d.item_code = v_received->>'itemCode';

      if not found then
        raise exception 'الصنف غير موجود في الإذن: %', v_received->>'itemCode';
      end if;

      if v_received_qty > v_detail.qty then
        raise exception 'الكمية المستلمة أكبر من كمية الإذن للصنف %', v_detail.item_code;
      end if;

      select * into v_stock
      from stock_branches
      where branch_id = v_branch_id
        and item_id = v_detail.item_id
      for update;

      if not found then
        raise exception 'رصيد المخزون غير موجود للفرع المستلم والصنف %', v_detail.item_code;
      end if;

      update stock_branches
      set qty = v_stock.qty + v_received_qty
      where id = v_stock.id
        and qty = v_stock.qty
        and allocated_qty = v_stock.allocated_qty;

      if not found then
        raise exception 'تغير رصيد المخزون أثناء الاستلام للصنف %', v_detail.item_code;
      end if;

      update stock_voucher_details
      set received_qty = v_received_qty
      where voucher_id = v_voucher.id
        and item_code = v_detail.item_code;

      v_log_code := 'IN-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || substr(md5(random()::text), 1, 8);
      insert into inventory_log (
        company_id, log_code, movement_date, voucher_id,
        item_id, item_code, item_name, movement_type,
        qty, reference, user_email
      ) values (
        p_company_id, v_log_code, current_date, p_voucher_code,
        v_detail.item_id, v_detail.item_code,
        coalesce(v_detail.item_name, v_detail.item_code),
        v_voucher.type, v_received_qty, p_voucher_code, p_user_email
      );
    end loop;

    update stock_vouchers
    set status = 'Received', received_date = now(), received_by = p_user_email
    where id = v_voucher.id
      and company_id = p_company_id
      and status = 'Sent';

    if not found then
      raise exception 'فشل انتقال حالة الإذن إلى Received';
    end if;
  end if;

  return jsonb_build_object('success', true, 'voucher_code', p_voucher_code, 'operation', p_operation);
end;
$$;

create or replace function public.complete_manual_stock_voucher_atomic(
  p_company_id uuid,
  p_voucher_code text,
  p_user_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voucher stock_vouchers%rowtype;
  v_expected_status text;
begin
  select * into v_voucher
  from stock_vouchers
  where company_id = p_company_id
    and voucher_code = p_voucher_code
  for update;

  if not found then raise exception 'الإذن غير موجود'; end if;

  v_expected_status := case when v_voucher.type = 'Transfer' then 'Received' else 'Sent' end;

  if v_voucher.status <> v_expected_status then
    raise exception 'حالة الإذن لا تسمح بالإكمال';
  end if;

  update stock_vouchers
  set status = 'Completed', completed_at = now(), completed_by = p_user_email
  where id = v_voucher.id
    and company_id = p_company_id
    and status = v_expected_status;

  if not found then raise exception 'فشل إكمال الإذن'; end if;

  return jsonb_build_object('success', true, 'voucher_code', p_voucher_code);
end;
$$;

create or replace function public.cancel_manual_stock_voucher_atomic(
  p_company_id uuid,
  p_voucher_code text,
  p_user_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voucher stock_vouchers%rowtype;
begin
  select * into v_voucher
  from stock_vouchers
  where company_id = p_company_id
    and voucher_code = p_voucher_code
  for update;

  if not found then raise exception 'الإذن غير موجود'; end if;
  if v_voucher.status <> 'Draft' then
    raise exception 'لا يمكن إلغاء إذن بعد تنفيذ حركة مخزنية؛ استخدم حركة عكسية رسمية';
  end if;

  update stock_vouchers
  set status = 'Cancelled'
  where id = v_voucher.id
    and company_id = p_company_id
    and status = 'Draft';

  if not found then raise exception 'فشل إلغاء الإذن'; end if;

  return jsonb_build_object('success', true, 'voucher_code', p_voucher_code);
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
