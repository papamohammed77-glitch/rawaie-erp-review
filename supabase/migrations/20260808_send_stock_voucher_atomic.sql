-- RAWAEA Inventory Sprint 1
-- Atomic transaction boundary for send-stock-voucher.
-- Additive, non-destructive migration.

create or replace function public.send_stock_voucher_atomic(
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
  v_detail record;
  v_item_id uuid;
  v_stock stock_branches%rowtype;
  v_qty numeric;
  v_available numeric;
  v_log_code text;
  v_main_branch_id uuid;
begin
  select * into v_voucher
  from stock_vouchers
  where company_id = p_company_id
    and voucher_code = p_voucher_code
  for update;

  if not found then raise exception 'Voucher not found'; end if;
  if v_voucher.status <> 'Draft' then raise exception 'Voucher is not Draft'; end if;

  if v_voucher.from_id is null then
    select main_branch_id into v_main_branch_id
    from app_settings
    where company_id = p_company_id
    limit 1;
  end if;

  -- Preserve the existing send-stock-voucher deduction business rule.
  if v_voucher.type in ('Transfer', 'DirectSale', 'SupplierReturn') then
    for v_detail in
      select d.item_id, d.item_code, d.item_name, d.qty
      from stock_voucher_details d
      where d.voucher_id = v_voucher.id
      order by d.id
    loop
      v_qty := coalesce(v_detail.qty, 0);
      if v_qty <= 0 then continue; end if;

      -- Resolve the item only within the trusted company context.
      select i.id into v_item_id
      from items i
      where i.company_id = p_company_id
        and (i.id = v_detail.item_id or i.item_code = v_detail.item_code)
      order by (i.id = v_detail.item_id) desc
      limit 1;

      if v_item_id is null then
        raise exception 'Item not found: %', v_detail.item_code;
      end if;

      select * into v_stock
      from stock_branches
      where branch_id = coalesce(v_voucher.from_id, v_main_branch_id)
        and item_id = v_item_id
      for update;

      if not found then
        raise exception 'Stock balance not found for item %', v_detail.item_code;
      end if;

      v_available := coalesce(v_stock.qty, 0) - coalesce(v_stock.allocated_qty, 0);
      if v_available < v_qty then
        raise exception 'Insufficient stock for item %', v_detail.item_code;
      end if;

      -- Preserve the existing CAS invariant inside the transaction.
      update stock_branches
      set qty = v_stock.qty - v_qty
      where id = v_stock.id
        and qty = v_stock.qty
        and allocated_qty = v_stock.allocated_qty
        and qty >= allocated_qty + v_qty;

      if not found then
        raise exception 'Stock changed during operation for item %', v_detail.item_code;
      end if;

      v_log_code := 'OUT-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || substr(md5(random()::text), 1, 8);

      insert into inventory_log (
        company_id,
        log_code,
        movement_date,
        voucher_id,
        item_id,
        item_code,
        item_name,
        movement_type,
        qty,
        reference,
        user_email
      ) values (
        p_company_id,
        v_log_code,
        current_date,
        p_voucher_code,
        v_item_id,
        v_detail.item_code,
        coalesce(v_detail.item_name, v_detail.item_code),
        v_voucher.type,
        v_qty,
        p_voucher_code,
        p_user_email
      );
    end loop;
  end if;

  update stock_vouchers
  set status = 'Sent', sent_date = now()
  where id = v_voucher.id
    and company_id = p_company_id;

  if not found then
    raise exception 'Failed to update voucher state';
  end if;

  return jsonb_build_object(
    'success', true,
    'voucher_id', v_voucher.id,
    'voucher_code', p_voucher_code
  );
end;
$$;

revoke all on function public.send_stock_voucher_atomic(uuid, text, text) from public;
grant execute on function public.send_stock_voucher_atomic(uuid, text, text) to service_role;
