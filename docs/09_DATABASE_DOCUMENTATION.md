09_DATABASE_DOCUMENTATION.md — الإصدار النهائي المُعتمد
توثيق قاعدة بيانات "الروائع ERP" (PostgreSQL على Supabase)
الإصدار: 3.0
التاريخ: 2026-07-13
المراجعون: حسين (CTO)، مراد (مهندس معماري)، حامد (مستشار استراتيجي)، محمود (مهندس معماري)
________________________________________
1. الغرض من هذه الوثيقة
توثيق كامل لهيكل قاعدة بيانات نظام "الروائع ERP". تشمل الجداول، العلاقات، المفاتيح، السياسات الأمنية، الدوال، والأنماط المعمارية. هذه الوثيقة هي المرجع الرسمي لأي مهندس بيانات أو مدير تقني ينضم للمشروع.
________________________________________
2. نظرة عامة
الخاصية	القيمة
عدد الجداول	51
نوع القاعدة	PostgreSQL 15 (عبر Supabase)
المفاتيح الأساسية	UUID v4 (لجميع الجداول)
الأكواد التجارية	ORD-, RS-, ITM-, CUST-, SUPP-, PO-, IN-, SET-, CN-
سياسات الأمان	Row Level Security (RLS) على الجداول الرئيسية
التتبع	inventory_log لكل حركة مخزنية، audit_log لكل حدث
دعم Offline	orders.sync_status, orders.offline_created_at, orders.device_id
________________________________________
3. الجداول الأساسية — "الـ 7 الكبار"
هذه الجداول تمثل قلب النظام. كل عملية، كل حركة، كل قيد مالي تمر عبر واحد أو أكثر من هذه الجداول.
3.1 orders — رأس الأوردر (عقد البيع)
العمود	النوع	الوصف
id	UUID (PK)	معرف فريد
order_code	VARCHAR	رقم الأوردر (ORD-1001)
order_date	DATE	تاريخ الطلب
customer_id	UUID (FK → customers)	معرف العميل
customer_name	VARCHAR	اسم العميل (حماية من الحذف)
area	VARCHAR	المنطقة
total_amount	NUMERIC	إجمالي الأوردر بعد التسليم
original_total_amount	NUMERIC	القيمة الأصلية عند التحميل
delivery_fee	NUMERIC	رسوم التوصيل
order_status	VARCHAR	دورة الحياة (Draft → Confirmed → Pending → Loaded → Delivered → Returned → Closed)
payment_type	VARCHAR	نقدي / آجل
runsheet_id	UUID (FK → runsheets)	الجسر الوحيد إلى عالم الرانشيت
amount_paid	NUMERIC	المبلغ المدفوع فعلياً
source	VARCHAR	pos, telesales, online_store
sync_status	VARCHAR	synced, pending, conflict (دعم Offline)
offline_created_at	TIMESTAMP	وقت الإنشاء المحلي
device_id	VARCHAR	معرف الجهاز
3.2 order_details — بنود الأوردر (المصدر الوحيد للحقيقة)
العمود	الوصف
qty	الكمية المطلوبة
qty_picked	الكمية المحضّرة
qty_loaded	الكمية المحمّلة
qty_delivered	الكمية المسلّمة
qty_refused	الكمية المرفوضة
qty_returned	الكمية المرتجعة
reason_picking	سبب نقص التحضير
reason_loading	سبب نقص التحميل
reason_delivery	سبب الرفض
reason_return	سبب عدم الرجوع
driver_liability	مسؤولية السائق المالية
قاعدة ذهبية: order_details هو المصدر الوحيد للحقيقة (Source of Truth). run_sheet_details يُبنى منه ولا يُلمس مباشرة.
3.3 runsheets — رأس الرانشيت (الرحلة)
العمود	الوصف
runsheet_code	رقم الرانشيت (RS-1)
run_date	تاريخ الرحلة
driver_id	السائق (FK → users)
vehicle_id	المركبة (FK → vehicles)
status	Open → Picking → Picked → Loading → Loaded → Delivering → Delivered → Returning → Returned → Closed
picker_id	المحضّر
loader_id	المحمّل
deliverer_id	المندوب
return_handler_id	مسؤول المرتجعات
meter_start, meter_end	قراءة عداد المسافة
3.4 run_sheet_details — بنود الرانشيت (التجميع)
⚠️ هذا الجدول لا يُحدّث مباشرة أبداً. يُبنى تلقائياً من order_details عبر sync-run-sheet-details.
العمود	الوصف
qty_ordered	إجمالي الكمية المطلوبة
qty_picked	إجمالي الكمية المحضّرة
qty_loaded	إجمالي الكمية المحمّلة
qty_delivered	إجمالي الكمية المسلّمة
qty_refused	إجمالي الكمية المرفوضة
qty_returned	إجمالي الكمية المرتجعة
return_condition	good, damaged, missing
driver_liability	قيمة مسؤولية السائق
orders_list	قائمة الأوردرات المرتبطة (نصية)
3.5 stock_branches — المخزون الفعلي والمحجوز
العمود	الوصف
branch_id	معرف الفرع
item_id	معرف الصنف
qty	الرصيد الفعلي
allocated_qty	الرصيد المحجوز
available_qty	المتاح = qty - allocated_qty
آلية الحجز (Allocation):
•	تحضير (complete-picking): allocated_qty ↑ (البضاعة محجوزة للرانشيت، لم تخرج بعد)
•	تحميل (complete-loading): qty ↓ و allocated_qty ↓ (أول خصم فعلي)
•	مرتجعات (complete-return): qty ↑ (للمرتجع السليم فقط)
•	تفريغ (unload-runsheet): qty ↑ (إعادة كل شيء)
3.6 driver_liabilities — مديونية السائقين
العمود	الوصف
driver_id	السائق المدين
runsheet_id	الرانشيت المرتبط
item_code	الصنف المفقود
qty_missing	كمية العجز
amount	قيمة العجز المالي
status	pending → settled (بعد إغلاق اليومية)
3.7 daily_settlements — تسويات نهاية اليوم
العمود	الوصف
settlement_code	كود التسوية (SET-1)
runsheet_id	الرانشيت المسوّى
driver_id	السائق
total_shortage	إجمالي كمية العجز
total_shortage_value	إجمالي قيمة العجز
________________________________________
4. الجداول المالية والمحاسبية
الجدول	الوصف	الحالة
journal_entries + journal_lines	القيود المحاسبية — تُنشأ تلقائياً	🟢 مفعّل
treasury	الخزائن والبنوك — الأرصدة	🟢 مفعّل
cash_box	سندات القبض والصرف والتحويلات	🟢 مفعّل
customer_ledger	دفتر أستاذ العملاء (مدين/دائن/رصيد)	🟢 مفعّل
supplier_ledger	دفتر أستاذ الموردين	🟡 غير مفعّل تلقائياً
driver_ledger	دفتر أستاذ السائقين	🟢 مفعّل
credit_notes	الإشعارات الدائنة	🟢 مفعّل
budgets	الموازنات التقديرية	🟢 مفعّل
chart_of_accounts	دليل الحسابات (شجري)	🟢 مفعّل
cost_centers	مراكز التكلفة	🟢 مفعّل
cheques	الشيكات	🟡 غير مفعّل
installments + installment_details	الأقساط	🟡 غير مفعّل
أنواع القيود التلقائية:
1.	تكلفة المبيعات: عند complete-loading (مدين: تكلفة المبيعات 51 / دائن: المخزون السلعي 124)
2.	إيرادات المبيعات: عند complete-order-delivery (مدين: العميل/الخزينة / دائن: إيرادات المبيعات 41)
3.	مرتجعات: عند complete-return (مدين: المخزون السلعي 124 / دائن: تكلفة المبيعات 51)
4.	تسوية العجز: عند save-daily-settlement (مدين: السائق / دائن: تكلفة المبيعات 51)
________________________________________
5. جداول التتبع والتدقيق
الجدول	الوصف	الحالة
inventory_log	سجل كل حركة مخزنية (Picking, Loading, Delivery, Return, Purchase, Transfer...)	🟢 مفعّل
audit_log	سجل كل حدث في النظام (للمالك فقط)	🟢 مفعّل
inventory_counts + inventory_count_details	عمليات الجرد	🟢 مفعّل
stock_vouchers + stock_voucher_details	الأذونات المخزنية	🟢 مفعّل
stock_discrepancies	الإبلاغ عن الاختلافات	🟢 مفعّل
service_complaints	نظام الشكاوى الموحد	🟢 مفعّل
vehicle_tracking	تتبع قراءات عداد السيارة	🟢 مفعّل
credit_block_events	سجل منع تجاوز الحد الائتماني	🟢 مفعّل
notifications + notification_templates	نظام الإشعارات	🟡 هيكل فقط
workflow_rules + workflow_log	محرك سير العمل	🟡 هيكل فقط
________________________________________
6. الجداول التشغيلية والإدارية
الجدول	الوصف	الحالة
items	الأصناف (مع التصنيفات، التسعير، العروض، الصور)	🟢
categories	تصنيفات المنتجات (شجرية)	🟢
customers	العملاء (مع الأرصدة، الحد الائتماني، الإحداثيات)	🟢
suppliers	الموردين	🟢
branches	الفروع والمخازن	🟢
users	المستخدمين (مع الصلاحيات، الأدوار، active_warehouse_role)	🟢
roles + role_permissions	الأدوار والصلاحيات	🟢
vehicles	المركبات	🟢
companies	الشركات (للـ Multi-Tenant مستقبلاً)	🟡
app_settings	إعدادات النظام (الضريبة، التوصيل، العملة، الشعار، ZATCA)	🟢
coupons	كوبونات الخصم للمتجر الإلكتروني	🟢
loyalty_points	نقاط الولاء	🟡
return_reasons	أسباب المرتجعات المعتمدة	🟢
complaint_types	أنواع الشكاوى المعتمدة	🟢
customer_assignments	تعيين العملاء للمندوبين	🟢
customer_followups	متابعات العملاء (CRM)	🟢
work_orders + work_order_details	أوامر الشغل	🟡
________________________________________
7. مخطط العلاقات (ERD)
7.1 العلاقات بين الجداول الأساسية
text
orders (1) ────── (∞) order_details
   │                    │
   └── runsheet_id ─────┘
        │
runsheets (1) ────── (∞) run_sheet_details
7.2 العلاقات المالية
text
journal_entries (1) ────── (∞) journal_lines
     │
     └── entry_code ──── customer_ledger (reference)
     └── entry_code ──── supplier_ledger (reference)
7.3 العلاقات المخزنية
text
stock_branches (item_id, branch_id) ──── items (id)
                                     ──── branches (id)
inventory_log (item_id) ──── items (id)
                         ──── stock_vouchers (voucher_code)
________________________________________
8. الأنماط المعمارية في قاعدة البيانات
8.1 نمط "الأصل والتجميع" (Source of Truth & Projection)
•	order_details = المصدر الوحيد للحقيقة (Event Store)
•	run_sheet_details = التجميع (Projection). يُبنى من الأصل ولا يُلمس مباشرة.
•	sync-run-sheet-details = الـ Projector الذي يعيد بناء التجميع.
•	orders.runsheet_id = الجسر الوحيد بين العالمين.
8.2 نمط تتبع الأحداث (Event Sourcing)
•	inventory_log = سجل كل حركة مخزنية (مصدر لتقارير "حركة صنف")
•	journal_entries + journal_lines = سجل كل حركة محاسبية (مصدر لميزان المراجعة)
•	audit_log = سجل كل تغيير في البيانات الحساسة
•	driver_liabilities = سجل كل دين على السائق
8.3 نمط الهوية المزدوجة (Dual Identity)
•	auth.users (Supabase Auth): للتسجيل والمصادقة. id من نوع UUID.
•	public.users: للبيانات الإضافية (الاسم، الصلاحيات، الدور). id يجب أن يكون مطابقاً لـ auth.users.id.
•	في Edge Functions، يتم جلب public.users.id باستخدام البريد الإلكتروني.
________________________________________
9. الأمان — Row Level Security (RLS)
الجدول	RLS	الوصف
orders	✅	المستخدم يرى أوردراته فقط (حسب created_by)
order_details	✅	عبر الربط بـ orders
runsheets	✅	السائق يرى رانشيتاته فقط
run_sheet_details	✅	عبر الربط بـ runsheets
items	✅	حسب company_id
customers	✅	المندوب يرى عملاءه فقط
suppliers	✅	حسب company_id
stock_branches	✅	حسب branch_id المسموح
driver_liabilities	⚠️	يجب تفعيل RLS
daily_settlements	⚠️	يجب تفعيل RLS
journal_entries	⚠️	يجب تفعيل RLS
journal_lines	⚠️	يجب تفعيل RLS
ملاحظة: Edge Functions تستخدم SERVICE_ROLE_KEY لتجاوز RLS عند الحاجة (مثل complete-loading التي تحدث 5 جداول في معاملة واحدة).
________________________________________
10. الدوال والإجراءات المخزنة
الدالة	النوع	الوصف	الحالة
sync-run-sheet-details	Edge Function	إعادة بناء run_sheet_details من order_details	🟢 (يدوي)
get_trial_balance	RPC	ميزان المراجعة	⚠️ يحتاج تحقيق
get_profit_loss	RPC	قائمة الدخل	⚠️ يحتاج تحقيق
get_balance_sheet	RPC	الميزانية العمومية	⚠️ يحتاج تحقيق
get_cash_flow	RPC	التدفقات النقدية	⚠️ يحتاج تحقيق
get_pnl_by_cost_center	RPC	أرباح/خسائر المراكز	⚠️ يحتاج تحقيق
get_budget_vs_actual	RPC	مقارنة الموازنة بالفعلي	⚠️ يحتاج تحقيق
توصية معمارية (P2): تحويل sync-run-sheet-details من Edge Function إلى PostgreSQL Trigger على order_details ليتم تنفيذها تلقائياً عند أي تغيير في الكميات.
________________________________________
11. مؤشرات الأداء (Indexes)
المؤشر	الجدول	النوع
order_code	orders	فريد
runsheet_code	runsheets	فريد
item_code	items	فريد
customer_code	customers	فريد
supplier_code	suppliers	فريد
[item_id, branch_id]	stock_branches	فريد مركب
________________________________________
12. مقارنة بالأنظمة المنافسة
المعيار	SAP B1	Odoo	الروائع ERP
عدد الجداول	1000+	500+	51
المفاتيح الأساسية	Integer + GUID	Integer	UUID
RLS	عبر Authorization Objects	عبر IR Rules	✅ Supabase RLS
تتبع المخزون	OINM, INV1	stock.move	inventory_log
تتبع التدقيق	CDHDR, CDPOS	mail.tracking	audit_log
آلية التجميع (MView)	❌	❌	sync-run-sheet-details
دعم Offline	❌ يحتاج إضافات	❌ محدود	✅ Dexie.js
الـ 6 كميات	❌	❌	✅ فريد
________________________________________
13. تقييم الثقة
البند	القيمة
هل هناك جزء غير مفهوم بالكامل؟	حالة بعض RPC Functions المالية تحتاج تحقيقاً (هل هي منشأة في PostgreSQL أم لا)
المعلومات الناقصة	1) تأكيد وجود RPC Functions في قاعدة البيانات. 2) تفاصيل RLS على driver_liabilities و daily_settlements. 3) تأكيد وجود Foreign Keys رسمية على مستوى PostgreSQL
ما يلزم للتحقق	1) SELECT * FROM pg_proc WHERE proname LIKE 'get_%'; 2) SELECT * FROM pg_policies; 3) SELECT * FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY';
نسبة الثقة الإجمالية	92%
________________________________________
🫡 اعتمد وانتقل للملف التالي