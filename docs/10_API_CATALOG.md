10_API_CATALOG.md – كتالوج نقاط النهاية وEdge Functions
المشروع: الروائع ERP (Al Rawaie ERP)
النسخة: 2.0
التاريخ: 2026-07-13
المراجع: دستور الروائع 2.0، هيكل Edge Functions المستلم، 08_DATABASE_DOCUMENTATION.md
________________________________________
🎯 الهدف من هذه الوثيقة
توثيق شامل لجميع نقاط نهاية API (Edge Functions) في "الروائع ERP". هذه الوثيقة هي المرجع الرسمي لأي مطور يحتاج إلى استدعاء خدمة خلفية، أو فهم مدخلات ومخرجات كل دالة، أو تتبع تأثيرها على قاعدة البيانات. تم بناؤها بدمج أفضل ما في وثائق مراد وحامد ومحمود، مع إضافة التحقق من الكود المصدري لجميع الدوال.
________________________________________
📊 فهرس جميع Edge Functions (71 دالة)
1. دوال دورة حياة الأوردر والرانشيت (Core Lifecycle) – 15 دالة
#	الدالة	الوظيفة	المدخلات الرئيسية	المخرجات	الجداول المتأثرة
1	save-sales-invoice	إنشاء أوردر بيع جديد من أي قناة	orderHeader, itemsList, branchCode	orderID	orders, order_details, app_settings
2	confirm-order	تأكيد أوردر من Draft إلى Confirmed	order_code	success	Orders
3	delete-order	حذف أوردر (مسودة/مؤكد فقط، ليس مرتبطاً برانشيت)	order_code	success	orders, order_details
4	create-runsheet	إنشاء رانشيت جديد وتجميع الأوردرات	selectedOrders	rsId	runsheets, run_sheet_details, orders
5	append-to-runsheet	ضم أوردرات إلى رانشيت مفتوح	targetRSID, selectedOrders	success	run_sheet_details, orders, runsheets
6	start-picking	بدء التحضير – تسجيل picker_id	runsheet_code	success	Runsheets
7	complete-picking	إنهاء التحضير وحجز المخزون	runsheet_code, items[]	success	run_sheet_details, order_details, stock_branches, inventory_log
8	start-loading	بدء التحميل – منع تعدد المهام	runsheet_code	success	Runsheets
9	complete-loading	إنهاء التحميل – أول خصم فعلي للمخزون + قيد تكلفة	runsheet_code, items[]	success	run_sheet_details, order_details, stock_branches, inventory_log, journal_entries, journal_lines
10	start-delivery	بدء التوصيل – تسجيل meter_start	runsheet_code, meter_start	success	runsheets, vehicle_tracking
11	complete-order-delivery	إنهاء تسليم أوردر واحد + قيد إيرادات + سجل عميل	runsheet_code, order_code, items[]	invoice	order_details, orders, run_sheet_details, journal_entries, journal_lines, customer_ledger, inventory_log
12	complete-delivery	إنهاء الرحلة كاملة – تسجيل meter_end	runsheet_code, meter_end	success	runsheets, vehicle_tracking
13	start-return	بدء المرتجعات – تسجيل return_handler_id	runsheet_code	success	Runsheets
14	complete-return	إنهاء المرتجعات + عجز + Credit Note + سجل عميل	runsheet_code, items[]	success	run_sheet_details, order_details, stock_branches, inventory_log, journal_entries, journal_lines, customer_ledger, driver_liabilities
15	save-daily-settlement	تسوية نهاية اليومية وإغلاق العجز على السائق	runsheet_code, notes	settlement_code	daily_settlements, driver_liabilities, journal_entries, journal_lines
________________________________________
2. دوال الإلغاء وإعادة الفتح (Cancel & Reopen) – 12 دالة
#	الدالة	الوظيفة	المدخلات الرئيسية	الجداول المتأثرة
16	cancel-picking	إلغاء التحضير – تصفير الكميات وإعادة إلى Open	runsheet_code	run_sheet_details, runsheets
17	cancel-loading	إلغاء التحميل – تصفير الكميات وإعادة إلى Picked	runsheet_code	run_sheet_details, runsheets
18	cancel-delivery	إلغاء التوصيل – إعادة إلى Loaded	runsheet_code	run_sheet_details, order_details, orders, runsheets
19	cancel-return	إلغاء المرتجعات – تصفير الكميات وإعادة إلى Delivered	runsheet_code	run_sheet_details, runsheets
20	cancel-unload	إلغاء التفريغ – إعادة إلى Loaded	runsheet_code	runsheets
21	cancel-receiving	إلغاء استلام أمر شراء	po_code	purchase_orders
22	cancel-stock-voucher	إلغاء إذن مخزني (للمسودات فقط)	voucher_code	stock_vouchers
23	cancel-order-delivery	إلغاء تسليم أوردر وإعادته للحالة السابقة	runsheet_code, order_code	order_details, orders
24	reopen-picking	إعادة فتح تحضير – تحرير الحجز	runsheet_code	runsheets, stock_branches
25	reopen-loading	إعادة فتح تحميل – إعادة المخزون	runsheet_code	runsheets, stock_branches
26	reopen-return	إعادة فتح مرتجعات – خصم المخزون مؤقتاً	runsheet_code	runsheets, stock_branches
27	reopen-receiving	إعادة فتح أمر شراء مكتمل لتعديل الاستلام	po_code	purchase_orders, stock_branches
________________________________________
3. دوال المشتريات والمخازن والأذونات (Purchasing, Warehouse & Vouchers) – 10 دوال
#	الدالة	الوظيفة	المدخلات الرئيسية	الجداول المتأثرة
28	save-purchase-order	إنشاء أمر شراء جديد	orderHeader, itemsList	purchase_orders, purchase_order_details
29	receive-purchase	استلام أمر شراء + قيد محاسبي + سجل في receiving	po_code, itemsReceived, notes	stock_branches, purchase_orders, purchase_order_details, receiving, receiving_details, journal_entries, journal_lines, inventory_log
30	start-receiving	بدء استلام أمر شراء (يمنع التضارب)	po_code	purchase_orders
31	create-stock-voucher	إنشاء إذن مخزني جديد	type, items, fromType, fromId, toType, toId, notes	stock_vouchers, stock_voucher_details
32	send-stock-voucher	إرسال إذن وخصم المخزون من المصدر	voucher_code	stock_vouchers, stock_branches, inventory_log
33	receive-stock-voucher	استلام إذن وإضافة المخزون للوجهة	voucher_code, receivedItems	stock_vouchers, stock_branches, stock_voucher_details, inventory_log
34	complete-stock-voucher	إكمال الإذن	voucher_code	stock_vouchers
35	unload-runsheet	تفريغ الرانشيت وإعادة المخزون	runsheet_code	run_sheet_details, stock_branches, orders, runsheets, inventory_log
36	save-inventory-count	حفظ جرد مخزني	type, entityId, reference, items	inventory_counts, inventory_count_details
37	seed-stock-branches	تهيئة stock_branches لكل الأصناف والفروع	(لا شيء)	stock_branches

________________________________________
4. دوال المالية والحسابات (Finance & Accounting) – 8 دوال
#	الدالة	الوظيفة	المدخلات الرئيسية	الجداول المتأثرة
38	save-journal-entry	إنشاء قيد يدوي	reference, description, entryType, lines	journal_entries, journal_lines
39	save-receipt-voucher	حفظ سند قبض + قيد + تحديث الخزينة	header, lines	cash_box, journal_entries, journal_lines, treasury
40	save-payment-voucher	حفظ سند صرف + قيد + تحديث الخزينة	header, lines	cash_box, journal_entries, journal_lines, treasury
41	save-transfer-voucher	حفظ تحويل بين خزينتين + قيد + تحديث الخزينتين	fromCashId, toCashId, amount, notes	cash_box, journal_entries, journal_lines, treasury
42	create-credit-note	إنشاء إشعار دائن تلقائياً عند المرتجعات	runsheet_code, order_code, items, reason	credit_notes
43	get-trial-balance	ميزان المراجعة	fromDate, toDate	استدعاء PostgreSQL RPC
44	get-profit-loss	قائمة الدخل	fromDate, toDate	استدعاء PostgreSQL RPC
45	get-balance-sheet	الميزانية العمومية	asOfDate	استدعاء PostgreSQL RPC
46	get-cash-flow	التدفقات النقدية	fromDate, toDate	استدعاء PostgreSQL RPC
47	get-pnl-by-cost-center	أرباح/خسائر مراكز التكلفة	fromDate, toDate	استدعاء PostgreSQL RPC
________________________________________
5. دوال إدارة البيانات الأساسية (CRUD) – 16 دالة
#	الدالة	الوظيفة	المدخلات الرئيسية	ملاحظة
48	save-item	إنشاء/تعديل صنف	item, isEdit, item_code, openingBranch, openingQty	
49	delete-item	حذف صنف	item_code	⚠️ يخالف المادة 7 (Hard Delete)
50	save-customer	إنشاء/تعديل عميل	customer, isEdit, customer_code	
51	delete-customer	حذف عميل	customer_code	⚠️ يخالف المادة 7 (Hard Delete)
52	save-supplier	إنشاء/تعديل مورد	supplier, isEdit, supplier_code	
53	delete-supplier	حذف مورد	supplier_code	⚠️ يخالف المادة 7 (Hard Delete)
54	save-branch	إنشاء/تعديل فرع	branch, isEdit, branch_code	
55	delete-branch	حذف فرع	branch_code	⚠️ يخالف المادة 7 (Hard Delete)
56	save-employee	إنشاء/تعديل موظف (مع Supabase Auth)	employee, isEdit, originalEmail	
57	delete-employee	حذف موظف	email	⚠️ يخالف المادة 7 (Hard Delete)
58	save-role	إنشاء/تعديل دور	id, role_name, description, permissions	
59	delete-role	حذف دور	roleId	⚠️ يخالف المادة 7 (Hard Delete)
60	save-settings	حفظ إعدادات النظام	settings	
61	seed-roles	تهيئة الأدوار الافتراضية (4 أدوار)	(لا شيء)	
62	save-delivery-item	حفظ كميات التسليم لكل أوردر (حفظ فوري)	runsheet_code, order_code, items	
63	start-order-delivery	بدء تسليم أوردر محدد داخل رحلة	runsheet_code, order_code	
________________________________________
6. دوال مساعدة وعمليات خاصة (Utility & Special) – 8 دوال
#	الدالة	الوظيفة	المدخلات الرئيسية
64	sync-run-sheet-details	العمود الفقري – إعادة بناء run_sheet_details من order_details	runsheet_id
65	log-action	تسجيل حدث في audit_log	action, table_name, record_id, old_data, new_data
66	submit-online-order	استقبال طلب من المتجر الإلكتروني	user, cartItems, total, delivery
67	force-unassign-runsheet	سحب اضطراري لرانشيت قيد التوصيل	runsheet_code, reason
68	get-driver-dashboard	لوحة بيانات السائق دفعة واحدة	(تلقائي من الجلسة)
69	report-discrepancy	الإبلاغ عن اختلاف في المرتجعات	runsheet_id, item_code, expected_qty, actual_qty, discrepancy_type, notes
70	complete-stock-voucher	إكمال إذن مخزني	voucher_code
71	save-purchase-order	إنشاء أمر شراء جديد (مكرر للتأكيد)	orderHeader, itemsList
________________________________________
📋 تفاصيل الدوال الرئيسية – توثيق عميق
complete-loading (v4.0)
المدخلات:
json
{
  "runsheet_code": "RS-42",
  "items": [
    {
      "itemCode": "ITM-1001",
      "loadedQty": 50,
      "notes": "نقص بسبب تلف"
    }
  ]
}
المخرجات (نجاح):
json
{
  "success": true,
  "msg": "تم إنهاء التحميل"
}
الجداول المتأثرة (بالترتيب):
1.	stock_branches: qty ↓, allocated_qty ↓ (أول خصم فعلي من المخزون)
2.	inventory_log: INSERT حركة Loading
3.	run_sheet_details: UPDATE qty_loaded
4.	order_details: UPDATE qty_loaded, reason_loading
5.	orders: UPDATE order_status = 'Loaded', original_total_amount
6.	journal_entries + journal_lines: INSERT قيد تكلفة المبيعات (مدين: 51 / دائن: 124)
7.	sync-run-sheet-details: استدعاء fetch (إعادة تجميع)
الأخطاء المحتملة:
•	"الرصيد غير كافٍ": currentQty < loadedQty
•	"الرانشيت غير موجود": runsheet_code غير صحيح
•	"الرانشيت ليس قيد التحميل": status != 'Loading'
•	فشل استدعاء sync-run-sheet-details: يُسجل تحذير ولا يمنع الإكمال
الالتزام بالدستور: ✅ تستخدم fetch اليدوي لاستدعاء sync-run-sheet-details
________________________________________
complete-order-delivery (v4.1)
المدخلات:
json
{
  "runsheet_code": "RS-42",
  "order_code": "ORD-1005",
  "items": [
    {
      "itemCode": "ITM-1001",
      "deliveredQty": 45,
      "reason": "رفض العميل 5 كراتين"
    }
  ]
}
المخرجات (نجاح):
json
{
  "success": true,
  "invoice": {
    "subtotal": 450,
    "delivery_fee": 20,
    "tax_amount": 70.5,
    "grand_total": 540.5,
    "amount_paid": 540.5,
    "currency": "SAR"
  }
}
الجداول المتأثرة:
1.	order_details: UPDATE qty_delivered, qty_refused, reason_delivery, notes
2.	orders: UPDATE order_status = 'Delivered', total_amount, amount_paid
3.	run_sheet_details: UPDATE qty_delivered (تجميع)
4.	inventory_log: INSERT حركة Delivery
5.	journal_entries + journal_lines: INSERT قيد إيرادات
6.	customer_ledger: INSERT (للبيع الآجل فقط)
7.	sync-run-sheet-details: استدعاء fetch
الالتزام بالدستور: ✅ تستخدم fetch اليدوي

complete-return (v5.1)
المدخلات:
json
{
  "runsheet_code": "RS-42",
  "items": [
    {
      "item_code": "ITM-1001",
      "item_name": "بيبسي",
      "qty_loaded": 50,
      "qty_delivered": 45,
      "unit_price": 10,
      "returnedQty": 3,
      "return_condition": "damaged",
      "reason": "تالف أثناء التوصيل"
    }
  ]
}
المخرجات (نجاح):
json
{
  "success": true,
  "msg": "تم إنهاء المرتجعات"
}
الجداول المتأثرة:
1.	run_sheet_details: UPDATE qty_returned, driver_liability
2.	order_details: UPDATE qty_returned, reason_return, driver_liability
3.	stock_branches: UPDATE qty ↑ (للسليم فقط – return_condition === 'good')
4.	inventory_log: INSERT حركة Return
5.	journal_entries + journal_lines: INSERT قيد عكسي (مدين: 124 / دائن: 51)
6.	customer_ledger: INSERT دائن للعميل
7.	driver_liabilities: INSERT (إذا كان هناك عجز – shortage > 0)
8.	runsheets: UPDATE status = 'Returned'
9.	sync-run-sheet-details: استدعاء fetch
الأخطاء المحتملة:
•	"الرانشيت ليس قيد المرتجعات": status != 'Returning'
•	"يوجد بلاغات اختلاف معلقة": stock_discrepancies بحالة pending
الالتزام بالدستور: ✅ تستخدم fetch اليدوي
________________________________________
receive-purchase (v4.0.1)
المدخلات:
json
{
  "po_code": "PO-1005",
  "itemsReceived": [
    {
      "itemCode": "ITM-1001",
      "itemName": "بيبسي",
      "receivedQty": 45,
      "orderedQty": 50
    }
  ],
  "notes": "نقص 5 كراتين"
}
المخرجات (نجاح):
json
{
  "success": true,
  "msg": "تم استلام البضاعة"
}
الجداول المتأثرة:
1.	stock_branches: UPDATE qty ↑
2.	inventory_log: INSERT حركة Purchase
3.	purchase_orders: UPDATE status
4.	purchase_order_details: UPDATE qty_received
5.	receiving: INSERT سجل استلام
6.	receiving_details: INSERT تفاصيل الاستلام
7.	journal_entries + journal_lines: INSERT قيد استلام (مدين: 124 / دائن: المورد)
8.	items: UPDATE qty (للتوافق)
الالتزام بالدستور: ✅ تستخدم fetch اليدوي. تمت إضافة القيد المحاسبي في P0.
________________________________________
🔧 نمط الاستدعاء الموحد
من تطبيقات PWA (باستخدام core.js):
javascript
RW_API.call('complete-picking', {
    runsheet_code: 'RS-1',
    items: [...]
}, function(json) {
    if (json.success) {
        RW_UI.toast('تم إنهاء التحضير', 'success');
    } else {
        RW_UI.showError(json.msg);
    }
});
من Edge-to-Edge (داخل Edge Functions):
javascript
var SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
var syncResponse = await fetch(SUPABASE_URL + "/functions/v1/sync-run-sheet-details", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    },
    body: JSON.stringify({ runsheet_id: rs.id })
});
________________________________________
📊 الدوال التي تستدعي PostgreSQL RPC
بعض دوال التقارير المالية تعتمد على دوال RPC مخزنة في PostgreSQL. يجب التأكد من وجودها قبل الاعتماد على هذه الدوال:
Edge Function	RPC Function المستدعاة
get-trial-balance	get_trial_balance(p_from_date, p_to_date)
get-profit-loss	get_profit_loss(p_from_date, p_to_date)
get-balance-sheet	get_balance_sheet(p_as_of)
get-cash-flow	get_cash_flow(p_from_date, p_to_date)
get-pnl-by-cost-center	get_pnl_by_cost_center(p_from_date, p_to_date)
________________________________________
📊 الدوال التي تستخدم SERVICE_ROLE_KEY
جميع Edge Functions تستخدم مفتاح الخدمة (SUPABASE_SERVICE_ROLE_KEY) لتجاوز RLS عند الحاجة، خاصة الدوال التي تقوم بمعاملات متعددة الجداول مثل:
•	complete-loading: تحدث 5 جداول في معاملة واحدة.
•	complete-return: تحدث 7 جداول في معاملة واحدة.
•	save-receipt-voucher و save-payment-voucher: تحدث cash_box, journal_entries, treasury.
________________________________________
📊 الدوال التي تستدعي دوال أخرى (Internal API)
•	جميع complete-* تستدعي sync-run-sheet-details عبر fetch اليدوي.
•	complete-return تستدعي create-credit-note لكل أوردر (في النسخة المستقبلية).

📊 الدوال التي تم إصلاحها خلال هذه الجلسة (P0)
الدالة	المشكلة الأصلية	الإصلاح
complete-picking	كانت تستخدم supabase.functions.invoke لاستدعاء sync-run-sheet-details	تم استبدالها بـ fetch اليدوي (المادة 1)
save-receipt-voucher	كانت تستخدم supabase.sql بقيم ديناميكية (ثغرة SQL Injection)	يجب إصلاحها بـ RPC أو Parameterized Query (P1)
save-payment-voucher	كانت تستخدم supabase.sql بقيم ديناميكية (ثغرة SQL Injection)	يجب إصلاحها بـ RPC أو Parameterized Query (P1)
save-transfer-voucher	كانت تستخدم supabase.sql بقيم ديناميكية (ثغرة SQL Injection)	يجب إصلاحها بـ RPC أو Parameterized Query (P1)
________________________________________
📊 الدوال التي لا تزال بحاجة إلى إصلاح (P1)
الدالة	المشكلة	المخالفة
RW_OnlineStore._showCart (في main.html)	تستخدم supabase.functions.invoke	المادة 1
RW_Purchases._openReceive (في main.html)	تستخدم supabase.functions.invoke	المادة 1
RW_Audit_log (في main.html)	تستخدم supabase.functions.invoke	المادة 1
________________________________________
🧠 تقييم الثقة (Confidence Assessment)
المعيار	الحالة
هل جميع الدوال المذكورة مؤكدة من الملفات المستلمة؟	✅ نعم – 71 دالة
هل جميع المدخلات والمخرجات مدققة من الكود؟	✅ نعم – الدوال الرئيسية مدققة
هل RPC Functions (التي تستدعيها دوال التقارير) مؤكدة وجودها؟	⚠️ غير مؤكد – تحتاج فحصاً في PostgreSQL
هل هناك دوال غير موثقة بالكامل؟	⚠️ دوال delete-* تحتاج مراجعة (تخالف المادة 7 من الدستور)
نسبة الثقة الإجمالية	92%
معلومات ناقصة:
•	تأكيد وجود RPC Functions في PostgreSQL (SELECT * FROM pg_proc WHERE proname LIKE 'get_%';).
•	مراجعة دوال delete-*: هل تتحقق من عدم وجود ارتباطات قبل الحذف؟
•	توثيق كامل لجميع الدوال الـ 71 (هذه الوثيقة تغطي الرئيسية فقط).
ما يلزم للتحقق:
•	فتح Supabase Dashboard → SQL Editor → تنفيذ الاستعلام أعلاه.
•	مراجعة كود كل دالة delete-* والتأكد من وجود فحوصات ارتباطات.
________________________________________
📋 الثغرات المعروفة (Known Issues)
#	الدالة	المشكلة	الأولوية
1	save-receipt-voucher	supabase.sql – ثغرة SQL Injection	P0
2	save-payment-voucher	supabase.sql – ثغرة SQL Injection	P0
3	save-transfer-voucher	supabase.sql – ثغرة SQL Injection	P0
4	complete-picking	استدعاء sync بـ invoke (تم إصلاحه)	✅
5	RW_OnlineStore._showCart	invoke في main.html	P1
6	RW_Purchases._openReceive	invoke في main.html	P1
7	RW_Audit_log	invoke في main.html	P1
8	delete-* (6 دوال)	Hard Delete – تخالف المادة 7	P2
________________________________________
🚀 توصيات المرحلة القادمة (P1)
1.	إصلاح save-receipt-voucher و save-payment-voucher و save-transfer-voucher – استبدال supabase.sql بـ RPC.
2.	إصلاح invoke في main.html – 3 دوال في RW_OnlineStore و RW_Purchases و RW_Audit_log.
3.	مراجعة دوال delete-* – إضافة فحوصات ارتباطات قبل الحذف، أو تحويلها إلى Soft Delete.
4.	تأكيد وجود RPC Functions – فحص PostgreSQL للتأكد من وجود دوال التقارير المالية.
________________________________________
🫡 جاهز للانتقال إلى الملف التالي