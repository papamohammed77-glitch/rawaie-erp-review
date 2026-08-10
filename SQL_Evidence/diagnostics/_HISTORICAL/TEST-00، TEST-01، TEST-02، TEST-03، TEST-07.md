نتائج تنفيذ الأكواد 
TEST-00 — Preflight
00-A — التحقق من وجود send_stock_voucher_atomic
الاستعلام : 
-- 00-A: Verify the atomic database function exists
select
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'send_stock_voucher_atomic';

-------------------------------------
النتيجة
schema_name	function_name	arguments	return_type	security_definer
public	send_stock_voucher_atomic	p_company_id uuid, p_voucher_code text, p_user_email text	jsonb	TRUE


00 -B — التحقق من وجود الجداول المطلوبة
الإستعلام  : -
select distinct table_name
from (
    values
        ('app_settings'),
        ('items'),
        ('stock_branches'),
        ('stock_vouchers'),
        ('stock_voucher_details'),
        ('inventory_log')
) as required(table_name)
where exists (
    select 1
    from information_schema.tables t
    where t.table_schema = 'public'
      and t.table_name = required.table_name
)
order by table_name;

--------
النتيجة
table_name
app_settings
inventory_log
items
stock_branches
stock_voucher_details
stock_vouchers

00-C — التحقق من الأعمدة المطلوبة
الإستعلام : - 
select
    table_name,
    column_name
from information_schema.columns
where table_schema = 'public'
  and (
       (table_name = 'app_settings' and column_name in ('company_id','main_branch_id'))
    or (table_name = 'items' and column_name in ('id','company_id','item_code','name','unit','sales_price'))
    or (table_name = 'stock_branches' and column_name in ('id','branch_id','item_id','qty','allocated_qty'))
    or (table_name = 'stock_vouchers' and column_name in
        ('id','company_id','voucher_code','voucher_date','type','status','from_id','sent_date'))
    or (table_name = 'stock_voucher_details' and column_name in
        ('id','voucher_id','item_id','item_code','item_name','unit','qty'))
    or (table_name = 'inventory_log' and column_name in
        ('id','company_id','log_code','movement_date','voucher_id','item_id',
         'item_code','item_name','movement_type','qty','reference','user_email'))
  )
order by table_name, column_name;
--------
النتيجة
table_name	column_name
app_settings	company_id
app_settings	main_branch_id
inventory_log	company_id
inventory_log	id
inventory_log	item_code
inventory_log	item_id
inventory_log	item_name
inventory_log	log_code
inventory_log	movement_date
inventory_log	movement_type
inventory_log	qty
inventory_log	reference
inventory_log	user_email
inventory_log	voucher_id
items	company_id
items	id
items	item_code
items	name
items	sales_price
items	unit
stock_branches	allocated_qty
stock_branches	branch_id
stock_branches	id
stock_branches	item_id
stock_branches	qty
stock_voucher_details	id
stock_voucher_details	item_code
stock_voucher_details	item_id
stock_voucher_details	item_name
stock_voucher_details	qty
stock_voucher_details	unit
stock_voucher_details	voucher_id
stock_vouchers	company_id
stock_vouchers	from_id
stock_vouchers	id
stock_vouchers	sent_date
stock_vouchers	status
stock_vouchers	type
stock_vouchers	voucher_code
stock_vouchers	voucher_date


00-D: Verify the migration has not been executed under an unexpected signature
00-D: Verify the migration has not been executed under an unexpected signature
select
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'send_stock_voucher_atomic'
order by pg_get_function_identity_arguments(p.oid);

 النتيجة 
schema_name	function_name	arguments
public	send_stock_voucher_atomic	p_company_id uuid, p_voucher_code text, p_user_email text

TEST-01 — Valid Single Item
TRANSACTIONAL TEST
هذا الاختبار ينشئ شركة وBranch وItem وStock وVoucher وDetail مؤقتين، ثم يستدعي الـRPC ويتحقق من النتيجة قبل ROLLBACK.
الإستعلام : - 

BEGIN;

DO $$
DECLARE
    v_company_id uuid := gen_random_uuid();
    v_branch_id uuid := gen_random_uuid();
    v_item_id uuid := gen_random_uuid();
    v_voucher_id uuid := gen_random_uuid();

    v_company_code text := 'TEST-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    v_voucher_code text := 'TEST-SINGLE-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

    v_before_qty numeric := 10;
    v_request_qty numeric := 3;

    v_after_qty numeric;
    v_status text;
    v_log_count integer;
    v_result jsonb;
BEGIN
    INSERT INTO companies (
        id, company_code, name
    )
    VALUES (
        v_company_id, v_company_code, 'RAWAEA TEST COMPANY'
    );

    INSERT INTO app_settings (
        company_id, main_branch_id
    )
    VALUES (
        v_company_id, v_branch_id
    );

    INSERT INTO branches (
        id, company_id, branch_code, name
    )
    VALUES (
        v_branch_id,
        v_company_id,
        'TEST-' || substr(replace(v_branch_id::text, '-', ''), 1, 8),
        'RAWAEA TEST BRANCH'
    );

    INSERT INTO items (
        id, company_id, item_code, name, unit, sales_price
    )
    VALUES (
        v_item_id,
        v_company_id,
        'TEST-ITEM-' || substr(replace(v_item_id::text, '-', ''), 1, 8),
        'RAWAEA TEST ITEM',
        'unit',
        1
    );

    INSERT INTO stock_branches (
        id, branch_id, item_id, qty, allocated_qty
    )
    VALUES (
        gen_random_uuid(),
        v_branch_id,
        v_item_id,
        v_before_qty,
        0
    );

    INSERT INTO stock_vouchers (
        id,
        company_id,
        voucher_code,
        voucher_date,
        type,
        status,
        from_id
    )
    VALUES (
        v_voucher_id,
        v_company_id,
        v_voucher_code,
        current_date,
        'Transfer',
        'Draft',
        v_branch_id
    );

    INSERT INTO stock_voucher_details (
        id,
        voucher_id,
        item_id,
        item_code,
        item_name,
        unit,
        qty
    )
    VALUES (
        gen_random_uuid(),
        v_voucher_id,
        v_item_id,
        'TEST-ITEM-' || substr(replace(v_item_id::text, '-', ''), 1, 8),
        'RAWAEA TEST ITEM',
        'unit',
        v_request_qty
    );

    v_result := public.send_stock_voucher_atomic(
        v_company_id,
        v_voucher_code,
        'test-owner@example.invalid'
    );

    SELECT qty
    INTO v_after_qty
    FROM stock_branches
    WHERE branch_id = v_branch_id
      AND item_id = v_item_id;

    SELECT status
    INTO v_status
    FROM stock_vouchers
    WHERE id = v_voucher_id;

    SELECT count(*)
    INTO v_log_count
    FROM inventory_log
    WHERE company_id = v_company_id
      AND voucher_id = v_voucher_code;

    IF v_after_qty <> v_before_qty - v_request_qty THEN
        RAISE EXCEPTION
            'TEST-01 FAILED: expected qty %, got %',
            v_before_qty - v_request_qty,
            v_after_qty;
    END IF;

    IF v_status <> 'Sent' THEN
        RAISE EXCEPTION
            'TEST-01 FAILED: expected voucher status Sent, got %',
            v_status;
    END IF;

    IF v_log_count <> 1 THEN
        RAISE EXCEPTION
            'TEST-01 FAILED: expected 1 inventory log, got %',
            v_log_count;
    END IF;

    IF coalesce((v_result ->> 'success')::boolean, false) <> true THEN
        RAISE EXCEPTION 'TEST-01 FAILED: RPC did not return success=true';
    END IF;

    RAISE NOTICE 'TEST-01 PASS: single-item atomic success verified before rollback.';
END;
$$;

ROLLBACK;
________________________________________
النتيجة
Success. No rows returned

TEST-02 — Insufficient Stock
TRANSACTIONAL TEST
الاستثناء يجب التقاطه داخل EXCEPTION block حتى يمكن الاستمرار داخل الـtransaction والتحقق من أن الـsubtransaction الخاصة باستدعاء الـRPC لم تترك mutation. PostgreSQL يستخدم الـEXCEPTION block كـsubtransaction، وتُراجع التغييرات الواقعة داخله عند حدوث الخطأ. 
الإستعلام : -

BEGIN;

DO $$
DECLARE
    v_company_id uuid := gen_random_uuid();
    v_branch_id uuid := gen_random_uuid();
    v_item_id uuid := gen_random_uuid();
    v_voucher_id uuid := gen_random_uuid();

    v_company_code text := 'TEST-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    v_item_code text := 'TEST-ITEM-' || substr(replace(v_item_id::text, '-', ''), 1, 8);
    v_voucher_code text := 'TEST-INSUFFICIENT-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

    v_before_qty numeric := 2;
    v_request_qty numeric := 5;

    v_after_qty numeric;
    v_status text;
    v_log_count integer;
    v_failed boolean := false;
BEGIN
    INSERT INTO companies (id, company_code, name)
    VALUES (v_company_id, v_company_code, 'RAWAEA TEST COMPANY');

    INSERT INTO app_settings (company_id, main_branch_id)
    VALUES (v_company_id, v_branch_id);

    INSERT INTO branches (id, company_id, branch_code, name)
    VALUES (
        v_branch_id,
        v_company_id,
        'TEST-' || substr(replace(v_branch_id::text, '-', ''), 1, 8),
        'RAWAEA TEST BRANCH'
    );

    INSERT INTO items (
        id, company_id, item_code, name, unit, sales_price
    )
    VALUES (
        v_item_id,
        v_company_id,
        v_item_code,
        'RAWAEA TEST ITEM',
        'unit',
        1
    );

    INSERT INTO stock_branches (
        id, branch_id, item_id, qty, allocated_qty
    )
    VALUES (
        gen_random_uuid(),
        v_branch_id,
        v_item_id,
        v_before_qty,
        0
    );

    INSERT INTO stock_vouchers (
        id, company_id, voucher_code, voucher_date,
        type, status, from_id
    )
    VALUES (
        v_voucher_id,
        v_company_id,
        v_voucher_code,
        current_date,
        'Transfer',
        'Draft',
        v_branch_id
    );

    INSERT INTO stock_voucher_details (
        id, voucher_id, item_id, item_code, item_name, unit, qty
    )
    VALUES (
        gen_random_uuid(),
        v_voucher_id,
        v_item_id,
        v_item_code,
        'RAWAEA TEST ITEM',
        'unit',
        v_request_qty
    );

    BEGIN
        PERFORM public.send_stock_voucher_atomic(
            v_company_id,
            v_voucher_code,
            'test-owner@example.invalid'
        );
    EXCEPTION
        WHEN OTHERS THEN
            v_failed := true;
    END;

    IF NOT v_failed THEN
        RAISE EXCEPTION
            'TEST-02 FAILED: insufficient-stock request unexpectedly succeeded';
    END IF;

    SELECT qty
    INTO v_after_qty
    FROM stock_branches
    WHERE branch_id = v_branch_id
      AND item_id = v_item_id;

    SELECT status
    INTO v_status
    FROM stock_vouchers
    WHERE id = v_voucher_id;

    SELECT count(*)
    INTO v_log_count
    FROM inventory_log
    WHERE company_id = v_company_id
      AND voucher_id = v_voucher_code;

    IF v_after_qty <> v_before_qty THEN
        RAISE EXCEPTION
            'TEST-02 FAILED: stock changed from % to %',
            v_before_qty,
            v_after_qty;
    END IF;

    IF v_status <> 'Draft' THEN
        RAISE EXCEPTION
            'TEST-02 FAILED: voucher status changed to %',
            v_status;
    END IF;

    IF v_log_count <> 0 THEN
        RAISE EXCEPTION
            'TEST-02 FAILED: inventory log exists after rejected operation';
    END IF;

    RAISE NOTICE 'TEST-02 PASS: insufficient stock caused full rollback.';
END;
$$;

ROLLBACK;
________________________________________
النتيجة

Success. No rows returned

TEST-03 — Multi-Item Atomicity
TRANSACTIONAL TEST
هذا هو الاختبار الأساسي للـtransaction boundary.
Item A يستطيع الخصم، بينما Item B غير كافٍ. المطلوب أن يفشل الـRPC وأن يعود Item A إلى حالته الأصلية.
الإستعلام : -

BEGIN;

DO $$
DECLARE
    v_company_id uuid := gen_random_uuid();
    v_branch_id uuid := gen_random_uuid();

    v_item_a uuid := gen_random_uuid();
    v_item_b uuid := gen_random_uuid();

    v_voucher_id uuid := gen_random_uuid();

    v_company_code text := 'TEST-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    v_code_a text := 'TEST-A-' || substr(replace(v_item_a::text, '-', ''), 1, 8);
    v_code_b text := 'TEST-B-' || substr(replace(v_item_b::text, '-', ''), 1, 8);
    v_voucher_code text := 'TEST-MULTI-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

    v_a_before numeric := 10;
    v_b_before numeric := 2;

    v_a_request numeric := 3;
    v_b_request numeric := 5;

    v_a_after numeric;
    v_b_after numeric;
    v_status text;
    v_log_count integer;

    v_failed boolean := false;
BEGIN
    INSERT INTO companies (id, company_code, name)
    VALUES (v_company_id, v_company_code, 'RAWAEA TEST COMPANY');

    INSERT INTO app_settings (company_id, main_branch_id)
    VALUES (v_company_id, v_branch_id);

    INSERT INTO branches (id, company_id, branch_code, name)
    VALUES (
        v_branch_id,
        v_company_id,
        'TEST-' || substr(replace(v_branch_id::text, '-', ''), 1, 8),
        'RAWAEA TEST BRANCH'
    );

    INSERT INTO items (
        id, company_id, item_code, name, unit, sales_price
    )
    VALUES
        (
            v_item_a,
            v_company_id,
            v_code_a,
            'RAWAEA TEST ITEM A',
            'unit',
            1
        ),
        (
            v_item_b,
            v_company_id,
            v_code_b,
            'RAWAEA TEST ITEM B',
            'unit',
            1
        );

    INSERT INTO stock_branches (
        id, branch_id, item_id, qty, allocated_qty
    )
    VALUES
        (gen_random_uuid(), v_branch_id, v_item_a, v_a_before, 0),
        (gen_random_uuid(), v_branch_id, v_item_b, v_b_before, 0);

    INSERT INTO stock_vouchers (
        id, company_id, voucher_code, voucher_date,
        type, status, from_id
    )
    VALUES (
        v_voucher_id,
        v_company_id,
        v_voucher_code,
        current_date,
        'Transfer',
        'Draft',
        v_branch_id
    );

    INSERT INTO stock_voucher_details (
        id, voucher_id, item_id, item_code, item_name, unit, qty
    )
    VALUES
        (
            gen_random_uuid(),
            v_voucher_id,
            v_item_a,
            v_code_a,
            'RAWAEA TEST ITEM A',
            'unit',
            v_a_request
        ),
        (
            gen_random_uuid(),
            v_voucher_id,
            v_item_b,
            v_code_b,
            'RAWAEA TEST ITEM B',
            'unit',
            v_b_request
        );

    BEGIN
        PERFORM public.send_stock_voucher_atomic(
            v_company_id,
            v_voucher_code,
            'test-owner@example.invalid'
        );
    EXCEPTION
        WHEN OTHERS THEN
            v_failed := true;
    END;

    IF NOT v_failed THEN
        RAISE EXCEPTION
            'TEST-03 FAILED: mixed-stock voucher unexpectedly succeeded';
    END IF;

    SELECT qty
    INTO v_a_after
    FROM stock_branches
    WHERE branch_id = v_branch_id
      AND item_id = v_item_a;

    SELECT qty
    INTO v_b_after
    FROM stock_branches
    WHERE branch_id = v_branch_id
      AND item_id = v_item_b;

    SELECT status
    INTO v_status
    FROM stock_vouchers
    WHERE id = v_voucher_id;

    SELECT count(*)
    INTO v_log_count
    FROM inventory_log
    WHERE company_id = v_company_id
      AND voucher_id = v_voucher_code;

    IF v_a_after <> v_a_before THEN
        RAISE EXCEPTION
            'TEST-03 FAILED: Item A remained deducted: % → %',
            v_a_before,
            v_a_after;
    END IF;

    IF v_b_after <> v_b_before THEN
        RAISE EXCEPTION
            'TEST-03 FAILED: Item B changed unexpectedly: % → %',
            v_b_before,
            v_b_after;
    END IF;

    IF v_status <> 'Draft' THEN
        RAISE EXCEPTION
            'TEST-03 FAILED: voucher status became %',
            v_status;
    END IF;

    IF v_log_count <> 0 THEN
        RAISE EXCEPTION
            'TEST-03 FAILED: partial inventory log remained';
    END IF;

    RAISE NOTICE
        'TEST-03 PASS: multi-item failure rolled back all mutations.';
END;
$$;

ROLLBACK;
________________________________________
النتيجة

Success. No rows returned

TEST-07 — Company Context
TRANSACTIONAL TEST
نختبر أن Voucher تابع للشركة A لا يمكن تشغيله باستخدام Company Context مختلف B.
لا توجد أي UUIDs مخمنة؛ كل UUID يتم توليده داخل الـtransaction.
الإستعلام : -

BEGIN;

DO $$
DECLARE
    v_company_a uuid := gen_random_uuid();
    v_company_b uuid := gen_random_uuid();

    v_branch_a uuid := gen_random_uuid();
    v_item_a uuid := gen_random_uuid();
    v_voucher_a uuid := gen_random_uuid();

    v_code_a text := 'TEST-A-' || substr(replace(v_item_a::text, '-', ''), 1, 8);
    v_voucher_code text := 'TEST-COMPANY-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

    v_before_qty numeric := 10;
    v_after_qty numeric;
    v_status text;

    v_failed boolean := false;
BEGIN
    INSERT INTO companies (id, company_code, name)
    VALUES
        (
            v_company_a,
            'TEST-' || substr(replace(v_company_a::text, '-', ''), 1, 12),
            'RAWAEA TEST COMPANY A'
        ),
        (
            v_company_b,
            'TEST-' || substr(replace(v_company_b::text, '-', ''), 1, 12),
            'RAWAEA TEST COMPANY B'
        );

    INSERT INTO app_settings (company_id, main_branch_id)
    VALUES
        (v_company_a, v_branch_a);

    INSERT INTO branches (
        id, company_id, branch_code, name
    )
    VALUES (
        v_branch_a,
        v_company_a,
        'TEST-' || substr(replace(v_branch_a::text, '-', ''), 1, 8),
        'RAWAEA TEST BRANCH A'
    );

    INSERT INTO items (
        id, company_id, item_code, name, unit, sales_price
    )
    VALUES (
        v_item_a,
        v_company_a,
        v_code_a,
        'RAWAEA TEST ITEM A',
        'unit',
        1
    );

    INSERT INTO stock_branches (
        id, branch_id, item_id, qty, allocated_qty
    )
    VALUES (
        gen_random_uuid(),
        v_branch_a,
        v_item_a,
        v_before_qty,
        0
    );

    INSERT INTO stock_vouchers (
        id,
        company_id,
        voucher_code,
        voucher_date,
        type,
        status,
        from_id
    )
    VALUES (
        v_voucher_a,
        v_company_a,
        v_voucher_code,
        current_date,
        'Transfer',
        'Draft',
        v_branch_a
    );

    INSERT INTO stock_voucher_details (
        id,
        voucher_id,
        item_id,
        item_code,
        item_name,
        unit,
        qty
    )
    VALUES (
        gen_random_uuid(),
        v_voucher_a,
        v_item_a,
        v_code_a,
        'RAWAEA TEST ITEM A',
        'unit',
        2
    );

    BEGIN
        PERFORM public.send_stock_voucher_atomic(
            v_company_b,
            v_voucher_code,
            'test-owner@example.invalid'
        );
    EXCEPTION
        WHEN OTHERS THEN
            v_failed := true;
    END;

    IF NOT v_failed THEN
        RAISE EXCEPTION
            'TEST-07 FAILED: wrong company context unexpectedly succeeded';
    END IF;

    SELECT qty
    INTO v_after_qty
    FROM stock_branches
    WHERE branch_id = v_branch_a
      AND item_id = v_item_a;

    SELECT status
    INTO v_status
    FROM stock_vouchers
    WHERE id = v_voucher_a;

    IF v_after_qty <> v_before_qty THEN
        RAISE EXCEPTION
            'TEST-07 FAILED: stock changed under wrong company context';
    END IF;

    IF v_status <> 'Draft' THEN
        RAISE EXCEPTION
            'TEST-07 FAILED: voucher status changed under wrong company context';
    END IF;

    RAISE NOTICE
        'TEST-07 PASS: wrong company context was rejected without mutation.';
END;
$$;

ROLLBACK;
________________________________________
النتيجة
Success. No rows returned


