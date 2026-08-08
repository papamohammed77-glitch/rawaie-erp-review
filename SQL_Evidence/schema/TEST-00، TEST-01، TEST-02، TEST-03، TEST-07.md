نتائج تنفيذ الأكواد 
TEST-00 — Preflight
00-A — التحقق من وجود send_stock_voucher_atomic
النتيجة
Success. No rows returned

00 -B — التحقق من وجود الجداول المطلوبة
النتيجة
table_name   
 app_settings 
 inventory_log 
 items 
 stock_branches 
 stock_voucher_details 
 stock_vouchers 

00-C — التحقق من الأعمدة المطلوبة
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








	


00-D — التحقق من توقيع الـDatabase Function وعدم وجود نسخة أخرى
Verify the migration has not been executed under an unexpected signature
النتيجة
Success. No rows returned


TEST-01 — Valid Single Item
TRANSACTIONAL TEST
هذا الاختبار ينشئ شركة وBranch وItem وStock وVoucher وDetail مؤقتين، ثم يستدعي الـRPC ويتحقق من النتيجة قبل ROLLBACK.
النتيجة
Failed to run sql query: ERROR:  42883: function public.send_stock_voucher_atomic(uuid, text, unknown) does not exist
HINT:  No function matches the given name and argument types. You might need to add explicit type casts.
QUERY:  v_result := public.send_stock_voucher_atomic(
        v_company_id,
        v_voucher_code,
        'test-owner@example.invalid'
    )
CONTEXT:  PL/pgSQL function inline_code_block line 104 at assignment


TEST-02 — Insufficient Stock
TRANSACTIONAL TEST
الاستثناء يجب التقاطه داخل EXCEPTION block حتى يمكن الاستمرار داخل الـtransaction والتحقق من أن الـsubtransaction الخاصة باستدعاء الـRPC لم تترك mutation. PostgreSQL يستخدم الـEXCEPTION block كـsubtransaction، وتُراجع التغييرات الواقعة داخله عند حدوث الخطأ.

النتيجة
Success. No rows returned



TEST-03 — Multi-Item Atomicity
TRANSACTIONAL TEST
هذا هو الاختبار الأساسي للـtransaction boundary.
Item A يستطيع الخصم، بينما Item B غير كافٍ. المطلوب أن يفشل الـRPC وأن يعود Item A إلى حالته الأصلية.

النتيجة
Success. No rows returned


TEST-07 — Company Context
TRANSACTIONAL TEST
نختبر أن Voucher تابع للشركة A لا يمكن تشغيله باستخدام Company Context مختلف B.
لا توجد أي UUIDs مخمنة؛ كل UUID يتم توليده داخل الـtransaction.

النتيجة
Success. No rows returned


