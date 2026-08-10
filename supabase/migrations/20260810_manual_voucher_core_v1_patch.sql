-- RAWAEA Manual Stock Voucher Core V1 patch
-- Required together with 20260810_manual_voucher_core_v1.sql
-- NOT approved for production execution until owner validation.
-- Re-applies the corrected type-aware completion rule together with company-context protection.

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
  v_settings_company uuid;
begin
  select company_id into v_settings_company from app_settings limit 1;
  if v_settings_company is null or v_settings_company <> p_company_id then
    raise exception 'سياق الشركة غير متسق مع إعدادات النظام';
  end if;

  select * into v_voucher
  from stock_vouchers
  where company_id=p_company_id and voucher_code=p_voucher_code
  for update;

  if not found then raise exception 'الإذن غير موجود'; end if;

  v_expected_status := case
    when v_voucher.type in ('Transfer','DirectReturn') then 'Received'
    when v_voucher.type in ('DirectSale','SupplierReturn') then 'Sent'
    else null
  end;

  if v_expected_status is null or v_voucher.status<>v_expected_status then
    raise exception 'حالة الإذن لا تسمح بالإكمال';
  end if;

  update stock_vouchers
  set status='Completed', completed_at=now(), completed_by=p_user_email
  where id=v_voucher.id and company_id=p_company_id and status=v_expected_status;

  if not found then raise exception 'فشل إكمال الإذن'; end if;
  return jsonb_build_object('success',true,'voucher_code',p_voucher_code);
end;
$$;

revoke all on function public.complete_manual_stock_voucher_atomic(uuid,text,text) from public;
grant execute on function public.complete_manual_stock_voucher_atomic(uuid,text,text) to service_role;
