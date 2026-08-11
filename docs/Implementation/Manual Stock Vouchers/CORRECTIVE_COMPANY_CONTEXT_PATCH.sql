-- CORRECTIVE COMPANY CONTEXT PATCH
-- Pre-operational Production correction.
-- Guarded: changes only the single app_settings row whose main branch belongs to the verified distribution company.
-- Does NOT alter branches, items, stock, vouchers, or RLS.

BEGIN;

DO $$
DECLARE
  v_settings_id uuid;
  v_old_company uuid;
  v_main_branch uuid;
  v_main_branch_company uuid;
  v_target_company uuid := 'da4ef704-88ac-4120-aa0e-65b92b2aa2bc';
BEGIN
  SELECT id, company_id, main_branch_id
    INTO v_settings_id, v_old_company, v_main_branch
  FROM public.app_settings
  LIMIT 1;

  IF v_settings_id IS NULL THEN
    RAISE EXCEPTION 'PATCH BLOCKED: app_settings row not found';
  END IF;

  SELECT company_id
    INTO v_main_branch_company
  FROM public.branches
  WHERE id = v_main_branch;

  IF v_main_branch_company IS NULL THEN
    RAISE EXCEPTION 'PATCH BLOCKED: app_settings.main_branch_id does not reference an existing branch';
  END IF;

  IF v_main_branch_company <> v_target_company THEN
    RAISE EXCEPTION 'PATCH BLOCKED: verified main branch belongs to %, not target company %', v_main_branch_company, v_target_company;
  END IF;

  UPDATE public.app_settings
     SET company_id = v_target_company,
         updated_at = now()
   WHERE id = v_settings_id
     AND company_id = v_old_company
     AND main_branch_id = v_main_branch;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PATCH BLOCKED: guarded app_settings row changed before update';
  END IF;

  RAISE NOTICE 'COMPANY CONTEXT CORRECTED: % -> %', v_old_company, v_target_company;
END;
$$;

SELECT
  s.id,
  s.company_id,
  s.main_branch_id,
  b.branch_code AS main_branch_code,
  b.company_id AS main_branch_company_id,
  CASE
    WHEN s.company_id = b.company_id
     AND s.company_id = 'da4ef704-88ac-4120-aa0e-65b92b2aa2bc'::uuid
    THEN 'PASS'
    ELSE 'FAIL'
  END AS company_context_validation
FROM public.app_settings s
LEFT JOIN public.branches b ON b.id = s.main_branch_id;

COMMIT;
