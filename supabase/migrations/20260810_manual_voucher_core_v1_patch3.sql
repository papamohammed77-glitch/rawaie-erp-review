-- RAWAEA Manual Stock Voucher Core V1 — Patch 3
-- Purpose: enforce Manual Voucher endpoint/type invariants at creation time too.
-- This prevents the atomic core from depending on Edge Function validation alone.
-- NOT approved for Production execution until final owner validation.

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
  select company_id into v_settings_company
  from app_settings
  limit 1;

  if v_settings_company is null or v_settings_company <> p_company_id then
    raise exception 'سياق الشركة غير متسق مع إعدادات النظام';
  end if;

  if p_type not in ('Transfer','DirectSale','DirectReturn','SupplierReturn') then
    raise exception 'نوع الإذن غير مدعوم في دورة الأذونات الحالية';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'يجب إضافة صنف واحد على الأقل';
  end if;

  if p_type in ('Transfer','DirectSale','DirectReturn') then
    if p_from_type <> 'Branch' or p_from_id is null then
      raise exception 'مصدر الإذن يجب أن يكون فرعًا محددًا';
    end if;
    if p_to_type <> 'Branch' or p_to_id is null then
      raise exception 'وجهة الإذن يجب أن تكون فرعًا محددًا';
    end if;
  elsif p_type = 'SupplierReturn' then
    if p_from_type <> 'Branch' or p_from_id is null then
      raise exception 'مصدر مرتجع المورد يجب أن يكون فرعًا محددًا';
    end if;
    if p_to_type <> 'Supplier' or p_to_id is null then
      raise exception 'وجهة مرتجع المورد يجب أن تكون موردًا محددًا';
    end if;
  end if;

  if p_from_type = 'Branch' then
    select exists(
      select 1 from branches b
      where b.id = p_from_id
        and b.company_id = p_company_id
    ) into v_valid;
    if not v_valid then raise exception 'فرع المصدر غير موجود أو لا يتبع الشركة الحالية'; end if;
  end if;

  if p_to_type = 'Branch' then
    select exists(
      select 1 from branches b
      where b.id = p_to_id
        and b.company_id = p_company_id
    ) into v_valid;
    if not v_valid then raise exception 'فرع الوجهة غير موجود أو لا يتبع الشركة الحالية'; end if;
  end if;

  perform pg_advisory_xact_lock(hashtext('rawaea:stock-voucher-code'));

  select coalesce(max(substring(voucher_code from '[0-9]+$')::bigint),0)
    into v_last_num
  from stock_vouchers
  where company_id = p_company_id;

  v_voucher_code := 'IN-' || (v_last_num + 1)::text;

  insert into stock_vouchers(
    voucher_code, voucher_date, type, status, reference,
    from_type, from_id, to_type, to_id, notes,
    created_by, source, company_id
  )
  values(
    v_voucher_code, current_date, p_type, 'Draft', coalesce(p_reference,''),
    p_from_type, p_from_id, p_to_type, p_to_id, coalesce(p_notes,''),
    p_created_by, 'Manual', p_company_id
  )
  returning id into v_voucher_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if coalesce(nullif(v_item->>'itemCode',''),'') = '' then
      raise exception 'كود الصنف مطلوب';
    end if;

    if coalesce((v_item->>'qty')::numeric,0) <= 0 then
      raise exception 'كمية الصنف يجب أن تكون أكبر من صفر';
    end if;

    select count(*) into v_count
    from items i
    where i.company_id = p_company_id
      and i.item_code = v_item->>'itemCode';

    if v_count = 0 then raise exception 'الصنف غير موجود: %',v_item->>'itemCode'; end if;
    if v_count > 1 then raise exception 'كود الصنف غير فريد داخل الشركة: %',v_item->>'itemCode'; end if;

    select i.id into v_item_id
    from items i
    where i.company_id = p_company_id
      and i.item_code = v_item->>'itemCode';

    -- Prevent duplicate detail lines for the same item within one manual voucher.
    if exists(
      select 1
      from stock_voucher_details d
      where d.voucher_id = v_voucher_id
        and d.item_id = v_item_id
    ) then
      raise exception 'لا يمكن تكرار الصنف داخل نفس الإذن: %',v_item->>'itemCode';
    end if;

    insert into stock_voucher_details(
      voucher_id,item_id,item_code,item_name,unit,qty,unit_price,notes
    )
    values(
      v_voucher_id,
      v_item_id,
      v_item->>'itemCode',
      coalesce(nullif(v_item->>'itemName',''),v_item->>'itemCode'),
      coalesce(nullif(v_item->>'unit',''),'حبة'),
      (v_item->>'qty')::numeric,
      coalesce((v_item->>'unitPrice')::numeric,0),
      coalesce(v_item->>'notes','')
    );
  end loop;

  return jsonb_build_object(
    'success',true,
    'voucher_id',v_voucher_id,
    'voucher_code',v_voucher_code
  );
end;
$$;

revoke all on function public.create_manual_stock_voucher_atomic(uuid,text,text,text,uuid,text,uuid,text,text,jsonb) from public;
grant execute on function public.create_manual_stock_voucher_atomic(uuid,text,text,text,uuid,text,uuid,text,text,jsonb) to service_role;
