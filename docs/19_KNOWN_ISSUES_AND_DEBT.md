19_KNOWN_ISSUES_AND_DEBT.md – المشكلات المعروفة والديون التقنية
المشروع: الروائع ERP (Al Rawaie ERP)
النسخة: 2.0
التاريخ: 2026-07-13
المراجع: دستور الروائع 2.0، تقارير الفريق السابقة، 14_ARCHITECTURAL_DECISIONS.md
المؤلفون: مراد، حامد، محمود – مدمجة ومحسّنة بواسطة حسين (RAWAEA AI CTO)
________________________________________
🎯 الهدف من هذه الوثيقة
توثيق جميع المشكلات المعروفة، الثغرات، والديون التقنية في "الروائع ERP" بشكل صريح وشفاف. هذه الوثيقة هي "تقرير الحالة الصحية" للنظام. يجب مراجعتها قبل أي دورة تطوير جديدة، وتحديثها بعد كل إصدار. الهدف ليس إخفاء العيوب، بل كشفها لتُحل.
________________________________________
📊 ملخص تنفيذي (Executive Summary)
الأولوية	العدد	الوصف
P0 – حرجة (فورية)	5	مشكلات تمنع التشغيل الآمن في الإنتاج
P1 – عالية (شهر)	11	مشكلات تؤثر على جودة المنتج وتجربة المستخدم
P2 – متوسطة (ربع سنة)	11	تحسينات مطلوبة للوصول للمعيار العالمي
P3 – استراتيجية (سنة)	5	رؤية مستقبلية للتحول إلى SaaS عالمي
________________________________________
🚨 أولاً: المشكلات الحرجة (P0) – يجب إصلاحها فوراً
#	المشكلة	الوصف	الملفات المتأثرة	المادة المخالفة	الحالة	المسؤول
1	complete-picking تستخدم invoke	await supabase.functions.invoke("sync-run-sheet-details", ...)	supabase/functions/complete-picking/index.ts	المادة 1	✅ تم الإصلاح	حامد
2	sw.js استراتيجية كاش غير آمنة	Network First بدلاً من Network Only لـ HTML. API Calls لا تُستثنى.	sw.js	المواد 64، 65	✅ تم الإصلاح	حامد
3	save-receipt-voucher تستخدم supabase.sql	ثغرة SQL Injection محتملة. العملية غير ذرية.	save-receipt-voucher/index.ts	المادة 29	✅ تم الإصلاح (مؤقت)	حامد
4	save-payment-voucher تستخدم supabase.sql	نفس الثغرة أعلاه.	save-payment-voucher/index.ts	المادة 29	✅ تم الإصلاح (مؤقت)	محمود
5	save-transfer-voucher تستخدم supabase.sql	نفس الثغرة أعلاه.	save-transfer-voucher/index.ts	المادة 29	✅ تم الإصلاح (مؤقت)	محمود
6	unloader.html يستعلم بحالة خاطئة	.in('status', ['Open','New']) بدلاً من ['Loaded','Delivering']	warehouse/unloader.html	المادتان 2، 8	✅ تم الإصلاح	حامد
7	RW_OnlineStore._showCart تستخدم invoke	في main.html	main.html	المادة 1	✅ تم الإصلاح	حسين
8	RW_Purchases._openReceive تستخدم invoke	في main.html	main.html	المادة 1	✅ تم الإصلاح	حسين
🟡 مشكلات P0 لم تُحل بعد (تحتاج متابعة فورية)
#	المشكلة	الوصف	الملفات المتأثرة	المادة المخالفة	الحالة	المسؤول
9	driver_liabilities بدون RLS	لا توجد سياسة RLS على الجدول. أي مستخدم يمكنه رؤية مديونيات جميع السائقين.	قاعدة البيانات	المادة 21	⚠️ مفتوح	محمود
10	daily_settlements بدون RLS	لا توجد سياسة RLS على الجدول.	قاعدة البيانات	المادة 21	⚠️ مفتوح	محمود
11	عدم ذرية تحديث الخزينة	save-receipt-voucher و save-payment-voucher و save-transfer-voucher تستخدم عمليتين منفصلتين بدلاً من RPC ذرية.	3 دوال Edge Function	المادة 29	⚠️ مفتوح (P2)	حامد
12	RW_Audit_log في main.html تستخدم invoke	دالة تسجيل التدقيق في النظام الأم.	main.html	المادة 1	⚠️ مفتوح	حسين
13	schema-validator.js غير محدث	كان يفحص Edge Functions بـ ES5، ولا يحتوي قواعد invoke و supabase.sql.	schema-validator.js	المادة 46	✅ تم الإصلاح	محمود
جهد الإصلاح المتبقي لـ P0: 6 ساعات (RLS + RPC Functions + RW_Audit_log)
________________________________________
🟠 ثانياً: المشكلات العالية (P1) – تؤثر على جودة المنتج
#	المشكلة	الوصف	الملفات المتأثرة	الحالة	المسؤول
14	telesales.html لا تستخدم core.js	تعيد تعريف Supabase Client وكل شيء يدوياً.	sales/telesales.html	⚠️ مفتوح	حامد
15	picker.html لا يستخدم core.js	النموذج الذهبي الأصلي منفصل عن النواة.	warehouse/picker.html	⚠️ مفتوح	حامد
16	تطبيقات المبيعات تستخدم const و let	6 تطبيقات مبيعات تستخدم ES6+.	telesales.html, pos.html, order-taker.html, van-sales.html, supervisor.html, manager.html	⚠️ مفتوح	محمود
17	تطبيقات المتجر تستخدم const و let	store/index.html و store/track.html	store/index.html, store/track.html	⚠️ مفتوح	محمود
18	Dexie.js غير موحد على RW_DB	كل تطبيق يعيد تعريف Dexie محلياً.	16 تطبيق PWA	⚠️ مفتوح	حامد + محمود
19	كاش الصور غير موحد على RW_ImageCache	picker.html يستخدم ITEMS_IMAGE_CACHE محلياً.	picker.html	⚠️ مفتوح	حامد
20	syncUp غير موحد في core.js	كل تطبيق يدير pending_updates بشكل منفصل.	جميع تطبيقات PWA	⚠️ مفتوح	محمود
21	RPC Functions المالية قد لا تكون منشأة	get_trial_balance, get_profit_loss, get_balance_sheet_data...	قاعدة البيانات	⚠️ مفتوح (يحتاج تحقيق)	مراد
22	supplier_ledger لا يُحدث تلقائياً	receive-purchase لا تحدث supplier_ledger.	receive-purchase/index.ts	⚠️ مفتوح	محمود
23	sync-run-sheet-details ليست PostgreSQL Trigger	لا تزال تُستدعى يدوياً. أي نسيان = run_sheet_details غير محدث.	جميع complete-*	⚠️ مفتوح	حسين
24	غياب Supabase Realtime	لا يوجد Event Bus بين التطبيقات.	جميع تطبيقات PWA	⚠️ مفتوح	محمود
جهد الإصلاح المتبقي لـ P1: 3-4 أسابيع (توحيد core.js، Dexie، كاش الصور، syncUp)
________________________________________
🟡 ثالثاً: المشكلات المتوسطة (P2) – للوصول للمعيار العالمي
#	المشكلة	الوصف	الحالة
25	Rate Limiting غير مفعّل	لا يوجد حد لعدد استدعاءات Edge Functions.	⚠️ مفتوح
26	CORS غير مقيد	معظم Edge Functions تستخدم * في Access-Control-Allow-Origin.	⚠️ مفتوح (يحتاج مراجعة)
27	لا توجد اختبارات وحدات (Unit Tests)	صفر اختبارات لـ 71 Edge Function.	⚠️ مفتوح
28	لا يوجد Code Review إجباري	لا يوجد نظام يمنع دمج كود غير مراجع.	⚠️ مفتوح
29	بعض التبويبات "قيد التطوير"	في hr.html (الحضور، الرواتب)، accountant.html (بعض التقارير).	⚠️ مفتوح
30	inventory_log غير كامل في دوال cancel-*	بعض دوال الإلغاء لا تسجل حركة في inventory_log.	⚠️ مفتوح (يحتاج تحقيق)
31	لا يوجد GDPR Compliance كامل	لا توجد آلية anonymize أو "حق النسيان".	⚠️ مفتوح
32	اعتماد على CDNs خارجية	Tailwind, SweetAlert2, Chart.js... إذا تعطل أي CDN، يتأثر النظام.	⚠️ مفتوح
33	لا يوجد نظام تنبيه (Alerting)	لا توجد إشعارات تلقائية عند فشل Edge Functions.	⚠️ مفتوح
34	غياب Multi-Tenant	النظام Single-Tenant حالياً.	⚠️ مفتوح (استراتيجي)
35	غياب REST API عام	لا يوجد Swagger أو وثائق API للمطورين الخارجيين.	⚠️ مفتوح
جهد الإصلاح المتبقي لـ P2: 2-3 أشهر
________________________________________
🟢 رابعاً: المشكلات منخفضة الخطورة (P3) – رؤية مستقبلية
#	المشكلة	الوصف	الحالة
36	تطبيق Native	لا يوجد تطبيق Android/iOS حقيقي. PWA فقط.	⚠️ مفتوح (استراتيجي)
37	BI Dashboard	لا يوجد تكامل مع Metabase/Grafana.	⚠️ مفتوح (استراتيجي)
38	ذكاء اصطناعي	لا يوجد توقع طلب أو كشف احتيال.	⚠️ مفتوح (استراتيجي)
39	شهادة SOC 2 / ISO 27001	لا توجد شهادة أمان.	⚠️ مفتوح (استراتيجي)
40	تكامل مع بوابات دفع	Paymob، Stripe، Fawry.	⚠️ مفتوح (استراتيجي)
________________________________________
📊 خامساً: ملخص الديون التقنية (Technical Debt)
النوع	الوصف	التكلفة التقديرية	الأولوية
تكرار الكود	13 ملفاً يعيدون تعريف Supabase/Dexie بدلاً من استخدام core.js.	3-5 أيام عمل	P1
مخالفات ES6	7 ملفات تستخدم const/let. قد تنهار على أجهزة قديمة.	2-3 أيام عمل	P1
غياب الاختبارات	0 Unit Tests. أي تغيير = خطر الانهيار.	10-15 يوم عمل	P2
Race Condition	تحديثات treasury ليست ذرية.	3-5 أيام عمل	P2
غياب RPC Functions	بعض دوال التقارير المالية قد لا تعمل لغياب RPC Functions.	2-3 أيام عمل	P1
RLS مفقود	جداول مالية بدون RLS.	4 ساعات	P0
CDNs خارجية	9 مكتبات من CDN.	يوم عمل	P2
________________________________________
📋 سادساً: خطة التعافي من الديون التقنية (Technical Debt Recovery Plan)
المرحلة	المدة	المهام	المسؤول
الإطفاء (P0)	أسبوع واحد	RLS على الجداول المالية، إصلاح RW_Audit_log، تأكيد RPC Functions.	محمود + مراد
التوحيد (P1)	3-4 أسابيع	توحيد core.js، Dexie، كاش الصور، syncUp، ربط التطبيقات.	حامد + محمود
سد الفجوات (P2)	2-3 أشهر	اختبارات وحدات، Code Review، GDPR، Rate Limiting، CORS.	الفريق كاملاً
التحول (P3)	6-12 شهر	Multi-Tenant، Native App، BI، بوابات دفع.	الفريق كاملاً
________________________________________
🧠 تقييم الثقة (Confidence Assessment)
المعيار	الحالة
هل جميع المشكلات المذكورة مدعومة بالكود الفعلي؟	✅ نعم
هل توجد مشكلات أخرى غير مذكورة؟	⚠️ احتمال وجود مشكلات أداء لم تُكتشف بعد (بدون Load Testing)
هل تم تشغيل schema-validator.js فعلياً؟	❌ لم يُشغّل بعد – التقديرات مبنية على تحليل الملفات المستلمة
هل RPC Functions المالية مؤكدة الوجود؟	⚠️ غير مؤكد – يحتاج فحص في PostgreSQL
نسبة الثقة الإجمالية	90%
معلومات ناقصة:
•	نتائج اختبارات الأداء (Load Testing).
•	تأكيد وجود RPC Functions في PostgreSQL (SELECT * FROM pg_proc WHERE proname LIKE 'get_%';).
•	نتائج تشغيل schema-validator.js على كامل المشروع.
ما يلزم للتحقق:
1.	تشغيل node schema-validator.js على جذر المشروع.
2.	تنفيذ استعلام RPC Functions في Supabase SQL Editor.
3.	إجراء اختبار أداء أولي على Edge Functions الأساسية.
________________________________________
🫡 جاهز للانتقال إلى الملف التالي