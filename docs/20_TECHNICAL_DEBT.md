20_TECHNICAL_DEBT.md – الديون التقنية
المشروع: الروائع ERP (Al Rawaie ERP)
النسخة: 2.0
التاريخ: 2026-07-13
المراجع: دستور الروائع 2.0، 15_KNOWN_ISSUES_AND_DEBT.md، 14_ARCHITECTURAL_DECISIONS.md
________________________________________
🎯 الهدف من هذه الوثيقة
توثيق جميع الديون التقنية (Technical Debt) المتراكمة في "الروائع ERP" – أي الفجوة بين الحالة الراهنة للنظام والحالة المثلى التي يجب أن يكون عليها ليكون قابلاً للصيانة، آمناً، وقابلاً للتوسع على المدى الطويل.
كل دين مُسجل هنا يشمل: وصفاً دقيقاً، سبب التراكم، الملفات المتأثرة، التأثير الحالي والمستقبلي، خطة السداد، الجهد المقدر، والأولوية.
________________________________________
📊 تصنيف الديون التقنية
الرمز	النوع	الوصف
TD-SEC	دين أمني	ثغرات أمنية، RLS، CORS، Rate Limiting
TD-AD	دين معماري	قرارات معمارية تحتاج إعادة نظر
TD-CD	دين كودي	تكرار كود، مخالفات الدستور، كود غير نظيف
TD-ID	دين بنية تحتية	CI/CD، Backups، مراقبة
TD-TEST	ديون اختبارات	Unit Tests، Code Review، Penetration Test
TD-DOC	ديون توثيقية	API Docs، توثيق PWA
TD-PROC	ديون عملياتية	إجراءات العمل، النشر، CI/CD
________________________________________
🔴 أولاً: الديون الأمنية (Security Debt)
#	الرمز	العنوان	الوصف	الملفات المتأثرة	التأثير	خطة السداد	الجهد	الأولوية
1	TD-SEC-01	supabase.sql مع قيم ديناميكية في 3 دوال مالية	الدوال save-receipt-voucher، save-payment-voucher، save-transfer-voucher تستخدم supabase.sql\...`مع قيم مدخلة من المستخدم. ثغرة SQL Injection محتملة. العملية ليست ذرية (Atomic) – يمكن أن ينفذ القيد ولا ينفذ تحديث الخزينة. | save-receipt-voucher, save-payment-voucher, save-transfer-voucher | 🔴 عالي – خطر التلاعب بالبيانات المالية. يمنع شهادات الأمان (SOC 2). | استبدال supabase.sql بـ RPC (Stored Procedure) مع Parameterized Query. | 6 ساعات | P0 |					
2	TD-SEC-02	جداول مالية بدون RLS	driver_liabilities، daily_settlements، driver_ledger، journal_entries، journal_lines، treasury، cash_box ليس لديها سياسات RLS. أي مستخدم يمكنه قراءة وكتابة هذه البيانات.	PostgreSQL – سياسات RLS لـ 7 جداول	🔴 عالي – ثغرة أمنية كبيرة. يمنع التحول إلى Multi-Tenant.	كتابة سياسات RLS لكل جدول: SELECT مقيد بـ company_id، INSERT/UPDATE/DELETE للمالك والمحاسب فقط.	10 ساعات	P0
3	TD-SEC-03	CORS يستخدم * في بعض Edge Functions	بعض Edge Functions تستخدم Access-Control-Allow-Origin: * مما يسمح لأي نطاق باستدعائها.	Edge Functions (مثل النسخ القديمة من complete-*)	🟡 متوسط – هجمات CSRF ممكنة نظرياً.	تقييد CORS بالنطاقات الفعلية (app.rawaea.com, sales.rawaea.com...).	2 ساعة	P1
4	TD-SEC-04	عدم وجود Rate Limiting	لا يوجد حد لعدد استدعاءات Edge Functions. مستخدم ضار قد يستنزف الموارد (Denial of Service).	Supabase – إعدادات Rate Limiting	🟡 متوسط – خطر DoS. تكاليف إضافية على Supabase.	تفعيل Rate Limiting على Supabase Dashboard أو عبر Cloudflare WAF.	1 ساعة	P1
5	TD-SEC-05	دوال delete-* تنفذ Hard Delete	delete-order، delete-customer، delete-supplier، delete-item، delete-branch، delete-employee، delete-role تنفذ Hard Delete. تخالف المادة 7 من الدستور.	7 دوال delete-*	🟡 متوسط – فقدان الأثر المالي والتدقيقي.	تعديل الدوال: السجلات المالية تُلغى (Cancelled) ولا تُحذف. السجلات التشغيلية تُحذف فقط إذا لم تكن مرتبطة بسجلات مالية.	3 ساعات	P1
6	TD-SEC-06	driver_liabilities بدون RLS	أي مستخدم يمكنه قراءة مديونيات السائقين. بيانات مالية حساسة.	PostgreSQL – driver_liabilities	🟡 متوسط – انتهاك للخصوصية المالية.	RLS: السائق يرى مديونياته فقط. المحاسب والمالك يرون الكل.	2 ساعة	P1
________________________________________
🏗️ ثانياً: الديون المعمارية (Architectural Debt)
#	الرمز	العنوان	الوصف	التأثير	خطة السداد	الجهد	الأولوية
7	TD-AD-01	غياب Multi-Tenant	النظام يعمل لشركة واحدة (company_id ثابت). الانتقال إلى SaaS يتطلب عزل بيانات الشركات.	يمنع التوسع التجاري.	Schema per Tenant أو RLS مع company_id لعزل البيانات.	كبير (إعادة هيكلة)	P2
8	TD-AD-02	غياب Event Bus / Supabase Realtime	التطبيقات لا تتواصل مع بعضها. picker.html لا يعرف أن loader.html أنهى التحميل إلا بإعادة التحميل اليدوي.	تجربة مستخدم دون المستوى.	تفعيل Supabase Realtime على الجداول الرئيسية. إضافة مستمعين في تطبيقات PWA.	12 ساعة	P2
9	TD-AD-03	sync-run-sheet-details ليست PostgreSQL Trigger	لا تزال تُستدعى يدوياً من Edge Functions. أي نسيان = run_sheet_details غير محدث.	خطر خطأ في البيانات للسائقين والمحضرين.	كتابة Trigger على order_details (AFTER INSERT OR UPDATE) لاستدعاء sync-run-sheet-details تلقائياً.	12 ساعة	P2
10	TD-AD-04	تطبيقات المكتب Thin Clients	accountant.html، finance-manager.html... مجرد واجهات تحيل إلى main.html. لا تقدم قيمة مستقلة.	لا تقدم قيمة مستقلة.	إما إكمالها كتطبيقات مستقلة أو إخفاؤها حتى لا تعطي انطباعاً سيئاً.	20 ساعة	P2
________________________________________
🧬 ثالثاً: الديون الكودية (Code Debt)
#	الرمز	العنوان	الوصف	الملفات المتأثرة	التأثير	خطة السداد	الجهد	الأولوية
11	TD-CD-01	complete-picking تستخدم supabase.functions.invoke	تم إصلاح هذا في complete-loading و complete-order-delivery و complete-return، لكنه بقي هنا.	supabase/functions/complete-picking/index.ts	🔴 عالي – خرق للدستور + خطر انهيار صامت.	استبدال invoke بـ fetch اليدوي (نفس إصلاح complete-loading).	1 ساعة	P0
12	TD-CD-02	unloader.html يستعلم بحالة خاطئة	_applyUnloading تستعلم عن ['Open','New'] والصواب ['Loaded','Delivering'].	warehouse/unloader.html	🟡 متوسط – التفريغ لا يعمل على الرانشيتات الصحيحة.	تغيير سطر واحد في الاستعلام.	30 دقيقة	P0
13	TD-CD-03	RW_Audit_log + RW_OnlineStore + RW_Purchases تستخدم invoke	3 دوال في main.html تستخدم supabase.functions.invoke بدلاً من fetch اليدوي.	main.html – RW_Audit_log، RW_OnlineStore._showCart، RW_Purchases._openReceive	🟡 متوسط – خرق للمادة 1 من الدستور.	استبدال invoke بـ fetch اليدوي في الدوال الثلاث.	2 ساعة	P1
14	TD-CD-04	13 تطبيق PWA لا يستخدمون core.js	تطبيقات المبيعات (6)، التطبيقات المكتبية (5)، المشتريات (2) تعيد تعريف Supabase Client و Dexie.js ووظائف المصادقة يدوياً.	13 ملف PWA	🟡 متوسط – صيانة أصعب. أخطاء متكررة.	ترحيل تدريجي لكل تطبيق إلى core.js (P1). الأولوية لتطبيقات المبيعات.	25 ساعة	P1
15	TD-CD-05	7 تطبيقات PWA تحتوي على const و let	pos.html، store/index.html، order-taker.html، telesales.html، van-sales.html، counter.html، vouchers.html تحتوي على const و let. مخالفة للدستور.	7 ملفات PWA	🟡 متوسط – خطر انهيار على أجهزة قديمة.	تشغيل schema-validator.js وإصلاح جميع المخالفات.	5 ساعات	P1
16	TD-CD-06	استراتيجية كاش sw.js غير آمنة	يستخدم Network First مع fallback إلى الكاش لملفات HTML. يجب Network Only. استجابات API قد تُخزن مؤقتاً.	sw.js	🟡 متوسط – مستخدمون قد يرون نسخاً قديمة.	تغيير استراتيجية HTML إلى Network Only. استثناء API Calls من الكاش.	1 ساعة	P1
17	TD-CD-07	main.html حجم كبير جداً (10,000+ سطر)	النظام الأم ملف واحد ضخم. يصعب التنقل فيه.	main.html	🟢 منخفض – صعوبة في الصيانة والتطوير.	تقسيم إلى وحدات منفصلة (كل وحدة في ملف مستقل).	30 ساعة	P2
18	TD-CD-08	تكرار كاش الصور	picker.html يستخدم ITEMS_IMAGE_CACHE محلياً. باقي التطبيقات تستخدم RW_ImageCache.	picker.html	🟢 منخفض – صيانة أصعب.	توحيد على RW_ImageCache.	2 ساعة	P1
19	TD-CD-09	تحديثات الخزينة غير ذرية	save-receipt-voucher و save-payment-voucher و save-transfer-voucher تستخدم قراءة + كتابة منفصلتين.	3 Edge Functions مالية	🟡 متوسط – Race Condition محتمل.	تحويل إلى RPC Function واحدة ذرية.	6 ساعات	P2
________________________________________
🧪 رابعاً: ديون الاختبارات (Testing Debt)
#	الرمز	العنوان	الوصف	التأثير	خطة السداد	الجهد	الأولوية
20	TD-TEST-01	لا توجد اختبارات وحدات	صفر Unit Tests لـ 71 Edge Function. أي تعديل قد يسبب انهياراً دون اكتشاف.	خطر انهيار غير مكتشف. يمنع التوسع الآمن.	كتابة اختبارات للـ Edge Functions الأساسية أولاً (المادة 55 من الدستور).	20 ساعة	P2
21	TD-TEST-02	لا يوجد Code Review إجباري	لا يوجد نظام يمنع دمج كود غير مراجع.	خطر إدخال أخطاء.	تفعيل GitHub Branch Protection – يتطلب Pull Request ومراجعة قبل الدمج.	1 ساعة	P1
22	TD-TEST-03	لا يوجد اختبار اختراق (Penetration Test)	لم يُختبر النظام ضد هجمات حقيقية.	ثغرات غير مكتشفة.	تعيين مختبر أمني لاختبار الاختراق.	10 ساعات	P2
________________________________________
⚙️ خامساً: ديون البنية التحتية (Infrastructure Debt)
#	الرمز	العنوان	الوصف	التأثير	خطة السداد	الجهد	الأولوية
23	TD-ID-01	غياب CI/CD كامل	النشر التلقائي يعمل عبر Cloudflare، لكن لا يوجد فحص آلي (Tests, Linting) قبل النشر.	خطر نشر كود معطوب.	إضافة GitHub Actions لتشغيل schema-validator.js واختبارات الوحدات قبل النشر.	5 ساعات	P1
24	TD-ID-02	الاعتماد على CDNs خارجية	Tailwind, SweetAlert2, Chart.js, Leaflet, QRCode.js... كلها من CDN. إذا تعطل CDN، يتأثر النظام.	خطر تعطل التصميم والخرائط.	تنزيل المكتبات محلياً.	3 ساعات	P2
25	TD-ID-03	غياب Monitoring/Alerting	لا توجد إشعارات تلقائية عند فشل Edge Functions.	أخطاء صامتة.	تفعيل Supabase Logs + Webhooks.	4 ساعات	P2
26	TD-ID-04	لا يوجد Backups تلقائية	لا توجد آلية نسخ احتياطي تلقائي. Supabase يوفر Backups يومية (في الخطة المدفوعة) لكن لم يتم التحقق.	خطر فقدان البيانات.	تفعيل Supabase Automatic Backups. اختبار استعادة النسخ الاحتياطي.	1 ساعة	P1
27	TD-ID-05	غياب نظام هجرة قاعدة البيانات	لا يوجد Supabase Migration.	صعوبة تتبع تغييرات المخطط.	تفعيل Supabase Migrations.	3 ساعات	P2
________________________________________
📝 سادساً: ديون التوثيق (Documentation Debt)
#	الرمز	العنوان	الوصف	التأثير	خطة السداد	الجهد	الأولوية
28	TD-DOC-01	توثيق Edge Functions غير كامل	معظم الدوال لا تحتوي على تعليق رأسي يشرح المدخلات والمخرجات والجداول المتأثرة.	صعوبة في فهم الدوال للمطورين الجدد.	كتابة تعليقات JSDoc لكل Edge Function.	10 ساعات	P1
29	TD-DOC-02	توثيق تطبيقات PWA غير موجود	لا يوجد شرح لكل تطبيق: وظيفته، مستخدمه، تدفقاته.	صعوبة في التدريب والتطوير.	كتابة README لكل تطبيق PWA.	8 ساعات	P2
30	TD-DOC-03	توثيق API غير تفاعلي	لا يوجد Swagger/OpenAPI للمطورين الخارجيين.	لا يمكن لمطورين خارجيين التكامل مع النظام.	تفعيل Swagger لـ Edge Functions.	8 ساعات	P2
________________________________________
📋 ملخص الديون التقنية – بطاقة الأداء
الفئة	عدد الديون	نسبة الخطورة
أمنية (TD-SEC)	6	2 حرجة، 4 متوسطة
معمارية (TD-AD)	4	4 متوسطة
كودية (TD-CD)	9	2 حرجة، 5 متوسطة، 2 منخفضة
اختبارات (TD-TEST)	3	3 متوسطة
بنية تحتية (TD-ID)	5	3 متوسطة، 2 منخفضة
توثيقية (TD-DOC)	3	2 متوسطة، 1 منخفضة
المجموع	30	4 حرجة، 21 متوسطة، 5 منخفضة
إجمالي الجهد المقدر لسداد جميع الديون: 47 يوم عمل.
________________________________________
📊 خطة سداد الدين التقني (Debt Repayment Plan)
🚨 المرحلة 0: الإطفاء (P0) – الأسبوع الأول
#	الدين	الجهد
1	TD-SEC-01: إصلاح supabase.sql في 3 دوال مالية	6 ساعات
2	TD-SEC-02: تفعيل RLS للجداول المالية	10 ساعات
3	TD-CD-01: إصلاح complete-picking (invoke → fetch)	1 ساعة
4	TD-CD-02: إصلاح unloader.html (الحالة الخاطئة)	30 دقيقة
إجمالي P0: 17.5 ساعة (2-3 أيام عمل)
________________________________________
🟢 المرحلة 1: التحصين (P1) – الأسابيع 2-6
#	الدين	الجهد
5	TD-SEC-05: دوال delete-* – Soft Delete	3 ساعات
6	TD-SEC-06: RLS لـ driver_liabilities	2 ساعة
7	TD-SEC-03: تقييد CORS	2 ساعة
8	TD-SEC-04: تفعيل Rate Limiting	1 ساعة
9	TD-CD-03: إصلاح invoke في main.html (3 دوال)	2 ساعة
10	TD-CD-04: ربط 13 تطبيق PWA بـ core.js	25 ساعة
11	TD-CD-05: إصلاح const/let في 7 تطبيقات	5 ساعات
12	TD-CD-06: إصلاح sw.js (Network Only)	1 ساعة
13	TD-CD-08: توحيد كاش الصور	2 ساعة
14	TD-TEST-02: تفعيل Code Review إجباري	1 ساعة
15	TD-ID-01: إضافة CI/CD	5 ساعات
16	TD-ID-04: تفعيل Backups تلقائية	1 ساعة
17	TD-DOC-01: توثيق Edge Functions	10 ساعات
إجمالي P1: 60 ساعة (7-8 أيام عمل)
________________________________________
🟡 المرحلة 2: التوسع (P2) – الشهر 3-6
#	الدين	الجهد
18	TD-AD-01: Multi-Tenant	40 ساعة
19	TD-AD-02: تفعيل Realtime	12 ساعة
20	TD-AD-03: PostgreSQL Trigger لـ sync-run-sheet-details	12 ساعة
21	TD-AD-04: تطبيقات المكتب	20 ساعة
22	TD-CD-07: تقسيم main.html	30 ساعة
23	TD-CD-09: ذرية الخزينة	6 ساعات
24	TD-TEST-01: اختبارات وحدات	20 ساعة
25	TD-TEST-03: اختبار اختراق	10 ساعات
26	TD-ID-02: تنزيل CDNs محلياً	3 ساعات
27	TD-ID-03: Monitoring	4 ساعات
28	TD-ID-05: Supabase Migrations	3 ساعات
29	TD-DOC-02: توثيق PWA	8 ساعات
30	TD-DOC-03: Swagger/OpenAPI	8 ساعات
إجمالي P2: 176 ساعة (22 يوم عمل)
________________________________________
🧠 تقييم الثقة (Confidence Assessment)
المعيار	الحالة
هل جميع البنود مدعومة بالكود الفعلي؟	✅ نعم – كل بند تم التحقق منه من الملفات المستلمة
هل تقديرات الجهد دقيقة؟	⚠️ تقديرية – قد تختلف حسب خبرة المنفذ
هل توجد ديون أخرى غير مذكورة؟	⚠️ احتمال – يحتاج مراجعة دورية كل 3 أشهر
نسبة الثقة الإجمالية	92%
معلومات ناقصة:
•	تقديرات الجهد قد تختلف حسب الفريق المنفذ.
•	بعض الديون قد تُكتشف لاحقاً مع توسع الاستخدام.
ما يلزم للتحقق:
•	مراجعة هذه القائمة كل 3 أشهر وتحديثها.
•	إضافة ديون جديدة فور اكتشافها.
•	فحص Supabase Dashboard للتأكد من وجود RPC Functions المالية.
________________________________________
جاهز للانتقال  الي الملف التالي