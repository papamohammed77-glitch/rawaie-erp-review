03_FILE_INDEX.md – فهرس الملفات والاعتماديات المتبادلة (النسخة الموحدة 1.0)
🎯 الهدف
توثيق كل ملف في المشروع مع: وظيفته، اعتمادياته، من يعتمد عليه، حالة التزامه بالدستور، وخطورته عند التعطل. لتكون المرجع الشامل لأي مهندس قبل أي تعديل.
________________________________________
١. ملفات جذر المشروع (companies/company-1/)
#	الملف	الوظيفة	يعتمد على	يعتمد عليه	الدستور
1	core.js	النواة المشتركة (6 وحدات) – توحد المصادقة، DB، API، UI، الصور، SW	Supabase SDK, Dexie.js, SweetAlert2	18 تطبيق PWA	✅
2	sw.js	Service Worker – Network Only لـ HTML/API	register-sw.js	جميع تطبيقات PWA	✅ (v2.0)
3	register-sw.js	تسجيل SW + كشف التحديثات كل 5 دقائق + حماية الجلسات	sw.js	جميع تطبيقات PWA	✅
4	app.html	بوابة الدخول (Smart Router) – توجيه حسب active_warehouse_role	Supabase Auth, users, app_settings	جميع تطبيقات PWA	✅
5	main.html	النظام الأم (مركز القيادة) – 40+ تبويب	Supabase, Chart.js, SweetAlert2	المالك، المديرين، المحاسبين	✅ (⚠️ RW_Audit_log)
6	index.html	صفحة هبوط – توجيه إلى app.html أو main.html	لا شيء	لا شيء	✅
7	manifest.json	إعدادات PWA	icon-512.png	جميع تطبيقات PWA	✅
8	_headers	إعدادات Cloudflare – منع تخزين sw.js و HTML	لا شيء	sw.js, جميع HTML	✅
9	schema-validator.js	حارس الدستور الآلي	Node.js	لا شيء (أداة)	✅
________________________________________
٢. تطبيقات المبيعات (sales/)
#	الملف	الوظيفة	الاعتماديات	معتمد عليه	الدستور
1	telesales.html	التلي سيلز – أوردرات هاتفية	Supabase, Dexie.js	save-sales-invoice	⚠️ لا core.js
2	pos.html	نقطة البيع – فواتير فورية	core.js (جزئي), Dexie.js, QRCode.js, BarcodeDetector	save-sales-invoice	⚠️ const/let
3	order-taker.html	مندوب المبيعات – أوردرات ميدانية	core.js (جزئي), Dexie.js	save-sales-invoice	⚠️ const/let
4	van-sales.html	فان سيلز – بيع مباشر من العهدة	core.js, Dexie.js	save-sales-invoice, save-inventory-count	⚠️ const/let
5	supervisor.html	مشرف المبيعات – KPIs وأداء الفريق	core.js, Chart.js	تقارير	⚠️ const
6	manager.html	مدير المبيعات – تقارير وأهداف	core.js, Chart.js	تقارير	⚠️ const
________________________________________
٣. تطبيقات المخازن (warehouse/)
#	الملف	الوظيفة	الاعتماديات	معتمد عليه	الدستور
1	receiver.html	مسؤول الاستلام	core.js, Dexie.js	receive-purchase	✅
2	picker.html	المحضّر (النموذج الذهبي)	Supabase, Dexie.js	start-picking, complete-picking, cancel-picking, reopen-picking	❌ لا core.js
3	loader.html	المحمّل	core.js, Dexie.js, RW_ImageCache	start-loading, complete-loading, cancel-loading, reopen-loading	✅ ذهبي ماسي
4	returns.html	المرتجعات	core.js, Dexie.js, html5-qrcode	start-return, complete-return, cancel-return, reopen-return, report-discrepancy	✅ ذهبي ماسي
5	unloader.html	التفريغ	core.js	unload-runsheet	✅ (تم إصلاح الاستعلام)
6	counter.html	الجرد الذكي	core.js, html5-qrcode	save-inventory-count	✅ ذهبي ماسي
7	vouchers.html	الأذونات المخزنية	core.js	create-stock-voucher, send-stock-voucher, receive-stock-voucher, cancel-stock-voucher	✅ ذهبي ماسي
8	supervisor.html	مشرف المخازن	core.js	users (تغيير الأدوار)	✅
9	manager.html	مدير المخازن – KPIs وتقارير	core.js, Chart.js	تقارير	✅
________________________________________
٤. تطبيقات التوصيل (delivery/)
#	الملف	الوظيفة	الاعتماديات	معتمد عليه	الدستور
1	driver.html	مندوب التوصيل	core.js (كامل), Dexie.js, Leaflet.js	start-delivery, complete-order-delivery, complete-delivery, cancel-delivery	✅ ذهبي ماسي
2	supervisor.html	مشرف التوصيل	core.js	force-unassign-runsheet	✅
________________________________________
٥. تطبيقات المشتريات (purchasing/)
#	الملف	الوظيفة	الاعتماديات	معتمد عليه	الدستور
1	buyer.html	مسؤول المشتريات	core.js, Dexie.js	save-purchase-order, receive-purchase	✅
2	supervisor.html	مشرف المشتريات	core.js	تقارير	✅
________________________________________
٦. تطبيقات العمليات المكتبية (office/)
#	الملف	الوظيفة	الاعتماديات	معتمد عليه	الدستور
1	accountant.html	المحاسب – KPIs وسندات	core.js	save-receipt-voucher, save-payment-voucher	✅
2	finance-manager.html	المدير المالي – تقارير مالية	core.js, Chart.js	تقارير	✅
3	general-manager.html	المدير العام – لوحة قيادة شاملة	core.js, Chart.js	تقارير	✅
4	hr.html	الموارد البشرية	core.js	تقارير	✅
5	owner.html	المالك – لوحة تحكم وتدقيق	core.js, Chart.js	audit_log	✅
________________________________________
٧. المتجر الإلكتروني (store/)
#	الملف	الوظيفة	الاعتماديات	معتمد عليه	الدستور
1	index.html	واجهة المتجر – سلة وكوبونات	core.js, Dexie.js	submit-online-order	⚠️ const/let/Array.find
2	track.html	تتبع الطلب	core.js	orders	⚠️ const/let
________________________________________

٨. دوال Edge Functions الأساسية (supabase/functions/)
#	الدالة	الوظيفة	يعتمد على	يعتمد عليه	الدستور
1	save-sales-invoice	إنشاء أوردر جديد	orders, order_details, app_settings	جميع تطبيقات المبيعات	✅
2	create-runsheet	إنشاء رانشيت وتجميع الأوردرات	orders, run_sheet_details, items	main.html	✅
3	complete-picking	إنهاء التحضير وحجز المخزون	run_sheet_details, stock_branches, inventory_log, sync-run-sheet-details	picker.html	✅ (v3.1)
4	complete-loading	إنهاء التحميل + أول خصم + قيد تكلفة	stock_branches, journal_entries, sync-run-sheet-details	loader.html	✅ (v4.0)
5	complete-order-delivery	إنهاء تسليم أوردر + قيد إيرادات	order_details, customer_ledger, journal_entries, sync-run-sheet-details	driver.html	✅ (v4.1)
6	complete-return	إنهاء المرتجعات + إعادة مخزون + Credit Note + عجز	stock_branches, driver_liabilities, journal_entries, sync-run-sheet-details	returns.html	✅ (v5.1)
7	save-daily-settlement	تسوية اليومية وإغلاق العجز	driver_liabilities, journal_entries, runsheets	main.html	✅
8	sync-run-sheet-details	العمود الفقري – إعادة بناء التجميع من الأصل	order_details, run_sheet_details	جميع complete-*	✅
9	unload-runsheet	تفريغ الرانشيت وإعادة المخزون	runsheets, stock_branches, inventory_log	unloader.html	✅
10	receive-purchase	استلام أمر شراء + قيد محاسبي	purchase_orders, stock_branches, receiving, journal_entries	receiver.html	✅ (v4.0.1)
11	save-receipt-voucher	سند قبض	cash_box, treasury, journal_entries	main.html, accountant.html	✅ (v2)
12	save-payment-voucher	سند صرف	cash_box, treasury, journal_entries	main.html, accountant.html	✅ (v2)
13	save-transfer-voucher	تحويل بين خزائن	cash_box, treasury, journal_entries	main.html	✅ (v2)
14	log-action	تسجيل حدث في audit_log	audit_log	جميع التطبيقات	✅
15	report-discrepancy	الإبلاغ عن اختلاف	stock_discrepancies	returns.html	✅
16	force-unassign-runsheet	سحب اضطراري من السائق	runsheets, audit_log	delivery/supervisor.html	✅
________________________________________
٩. مصفوفة الخطورة – ماذا لو تعطل هذا الملف؟
الملف	تأثيره عند التعطل	الخطورة
core.js	18 تطبيق PWA لن تعمل (مصادقة، API، SW)	🔴 حرجة
sw.js	جميع تطبيقات PWA لن تتلقى تحديثات	🔴 حرجة
main.html	المالك، المديرين، المحاسبين لا يمكنهم إدارة النظام	🔴 حرجة
sync-run-sheet-details	جميع تطبيقات المخازن والتوصيل – أرقام run_sheet_details خاطئة	🔴 حرجة
save-sales-invoice	جميع تطبيقات المبيعات لا يمكنها إنشاء أوردرات	🔴 حرجة
complete-loading	loader.html, driver.html, returns.html لا يمكنها متابعة دورة التوصيل	🔴 حرجة
driver.html	السائق لا يمكنه تسليم الأوردرات	🟠 عالية
schema-validator.js	لا شيء – أداة تطوير فقط	🟢 منخفضة
________________________________________
🧠 تقييم الثقة (Confidence Assessment)
البند	القيمة
هل جميع الملفات المذكورة مؤكدة من المستودع؟	✅ نعم – 35 ملف PWA + 71 Edge Function
هل توجد ملفات أخرى غير مذكورة؟	⚠️ احتمال وجود icon-512.png في company-1/
هل جميع الاعتماديات مدققة من الكود الفعلي؟	✅ نعم
هل هناك اعتماديات غير موثقة؟	⚠️ بعض التطبيقات القديمة تستخدم Supabase SDK مباشرة بدلاً من core.js – هذا موثّق في الجدول
نسبة الثقة الإجمالية	96%
________________________________________
🫡 تم. هذه هي الوثيقة الموحدة النهائية لـ 03_FILE_INDEX.md. جاهزة للاعتماد والانطلاق إلى الملف التالي.
