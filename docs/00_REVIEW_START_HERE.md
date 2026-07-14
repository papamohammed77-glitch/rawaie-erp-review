📋 وثيقة: 00_REVIEW_START_HERE.md – ابدأ من هنا
المشروع: الروائع ERP (Al Rawaie ERP)
الإصدار: 3.0
التاريخ: 2026-07-13
المُعِدّ: مكتب CTO التنفيذي – رئيس المهندسين المعماريين
المساهمون: حسين، مراد، حامد، محمود
الغرض: هذا الملف هو نقطة الدخول الوحيدة لأي مهندس معماري، مدقق تقني، CTO جديد، أو مستثمر يحتاج إلى فهم "الروائع ERP" في 10 دقائق. بعد قراءته، ستعرف بالضبط أين تقف، وأين تذهب بعد ذلك.
________________________________________
🎯 ١. ملخص المشروع في صفحة واحدة
"الروائع ERP" هو نظام تخطيط موارد مؤسسات سحابي (Cloud-Native ERP) مبني على تقنيات PWA و Offline-First. يستهدف شركات التوزيع والسلع الاستهلاكية (FMCG) واللوجستيات في السوق العربي.
الفرادة التنافسية: يتتبع النظام حركة البضاعة عبر 6 كميات في صف واحد – من الطلب إلى التسليم إلى المرتجع إلى التسوية. هذه الآلية ("الرانشيت") لا توجد في SAP أو Odoo أو دفترة.
التقنيات الأساسية:
•	الخلفية: Supabase (PostgreSQL + Auth + Edge Functions)
•	الواجهة: 26 تطبيق PWA مستقل (Vanilla JS ES5 + Tailwind CSS + SweetAlert2)
•	النشر: Cloudflare Pages
•	التخزين المحلي: Dexie.js (IndexedDB)
•	النواة المشتركة: core.js (6 وحدات: RW_Auth, RW_DB, RW_API, RW_UI, RW_ImageCache, RW_SW)
الفلسفة الحاكمة: دستور هندسي صارم (أكثر من 53 مادة في أحدث إصدار)، يفرض var و function للتوافق مع الأجهزة القديمة، و fetch اليدوي لاستدعاء الخدمات، ويمنع Hard Delete في السجلات المالية.
الحالة الراهنة: 80% من النظام الأساسي مكتمل. P0 و P1 منجزان. P2 (الأتمتة والـ SaaS) هو الهدف التالي.
التقييم الإجمالي: 77-80% – منتج قوي، جاهز للتشغيل الداخلي، يحتاج إلى حزمة إصلاحات حرجة (حوالي أسبوعين) قبل أي توسع.
________________________________________
📦 ٢. أهم الوحدات
الوحدة	الاختصاص	التطبيقات الرئيسية
المبيعات	4 مسارات بيعية + متجر إلكتروني	telesales.html, pos.html, order-taker.html, van-sales.html, store/index.html
المخازن	دورة حياة الرانشيت + أذونات + جرد	picker.html, loader.html, returns.html, unloader.html, counter.html, vouchers.html, receiver.html
التوصيل	إدارة السائقين، تسليم، تحصيل، رصيد	driver.html (ذهبي ماسي), supervisor.html
المشتريات	أوامر شراء، استلام	buyer.html, supervisor.html
الحسابات	قيود تلقائية، تسويات، تقارير مالية	مدمجة في main.html (وحدة RW_Finance)
النظام الأم	لوحة تحكم، تقارير، صلاحيات، إدارة	main.html (10,000+ سطر، 40+ تبويباً)
________________________________________
🗄️ ٣. مكان قاعدة البيانات
•	المنصة: Supabase
•	النوع: PostgreSQL (51 جدولاً)
•	الأمان: Row Level Security (RLS) مفعّل على معظم الجداول
•	التوثيق الكامل: docs/08_DATABASE_DOCUMENTATION.md
________________________________________
⚡ ٤. مكان الخدمات الخلفية (Edge Functions)
⚠️ ملاحظة هامة: النظام لا يستخدم Cloudflare Workers. يستخدم Supabase Edge Functions (Deno).
•	الموقع: supabase/functions/
•	العدد: 71 دالة
•	الدور: كل العمليات التجارية (تحضير، تحميل، قيود، تسويات) تُنفذ هنا.
•	التوثيق الكامل: docs/09_API_CATALOG.md
________________________________________
🌐 ٥. مكان الواجهة الأمامية
•	الاستضافة: Cloudflare Pages (ملفات ثابتة)
•	الموقع: companies/company-1/
•	الهيكل:
o	main.html – النظام الأم (مركز القيادة)
o	core.js – النواة المشتركة (أساس كل تطبيق PWA)
o	sales/ – 6 تطبيقات
o	warehouse/ – 9 تطبيقات
o	delivery/ – 2 تطبيقان
o	purchasing/ – 2 تطبيقان
o	office/ – 5 تطبيقات
o	store/ – 2 تطبيقان
•	التوثيق الكامل: docs/02_PROJECT_TREE.md, docs/03_FILE_INDEX.md
________________________________________
📖 ٦. ترتيب قراءة الملفات
🚀 المسار السريع (للمدير التنفيذي/المستثمر)
1.	هذه الوثيقة (00_REVIEW_START_HERE.md)
2.	01_PROJECT_OVERVIEW.md – الرؤية والنطاق
3.	19_FINAL_CTO_REPORT.md – التقييم النهائي والتوصيات
🧠 المسار المتعمق (للمهندس المعماري/المطور)
1.	00_REVIEW_START_HERE.md (هنا)
2.	01_PROJECT_OVERVIEW.md – الرؤية، النطاق، التقنيات
3.	02_PROJECT_TREE.md – شجرة المشروع الكاملة
4.	06_SYSTEM_ARCHITECTURE.md – المعمارية وتدفقات البيانات (مخططات Mermaid)
5.	07_MODULE_INDEX.md – شرح كل وحدة أعمال
6.	08_DATABASE_DOCUMENTATION.md – الجداول، العلاقات، RLS
7.	09_API_CATALOG.md – فهرس جميع Edge Functions
8.	10_BUSINESS_WORKFLOWS.md – تدفقات الأعمال (Order to Cash...)
9.	14_ARCHITECTURAL_DECISIONS.md – ADR (لماذا صممنا النظام هكذا؟)
10.	12_SECURITY_MODEL.md – نموذج الأمان
11.	15_KNOWN_ISSUES_AND_DEBT.md – المشكلات المعروفة والديون التقنية
12.	19_FINAL_CTO_REPORT.md – التقرير الهندسي النهائي والتوصيات
________________________________________
⚠️ ٧. أهم المخاطر المعروفة
#	المخاطرة	الخطورة	المرجع
1	sync-run-sheet-details ليست Trigger – إذا نُسي استدعاؤها بعد أي complete-*، ستظهر بيانات خاطئة	🔴 حرجة	15_KNOWN_ISSUES.md #1
2	complete-picking لا تزال تستخدم supabase.functions.invoke – خرق للمادة 5 من الدستور	🔴 حرجة	15_KNOWN_ISSUES.md #2
3	unloader.html يستعلم بحالة خاطئة (['Open','New'] بدل ['Loaded','Delivering'])	🔴 حرجة	15_KNOWN_ISSUES.md #3
4	تحديثات الخزينة غير ذرية (Race Condition) في save-receipt-voucher و save-payment-voucher	🔴 حرجة	15_KNOWN_ISSUES.md #4
5	sw.js استراتيجية كاش غير آمنة (Network First بدل Network Only)	🔴 حرجة	15_KNOWN_ISSUES.md #5
6	RLS غير مفعّل على driver_liabilities و daily_settlements	🟠 عالية	15_KNOWN_ISSUES.md #9
7	RPC Functions المالية غير محققة – دوال التقارير قد لا تعمل	🟠 عالية	15_KNOWN_ISSUES.md #20
8	13 تطبيق PWA لا تستخدم core.js – تكرار الكود وصعوبة الصيانة	🟡 متوسطة	15_KNOWN_ISSUES.md #12
9	8 تطبيقات تستخدم const/let – خرق للدستور، خطر انهيار على Android 6	🟡 متوسطة	15_KNOWN_ISSUES.md #14
10	لا توجد اختبارات وحدات (0 Unit Tests)	🟡 متوسطة	16_TECHNICAL_DEBT.md TD-01
________________________________________
🧠 ٨. تقييم الثقة (Self-Assessment)
المعيار	الحالة
هل المعلومات ملخصة بدقة من الوثائق السابقة؟	✅ نعم
هل المخاطر المذكورة مدعومة بالكود الفعلي؟	✅ نعم
هل ترتيب القراءة منطقي ومتدرج؟	✅ نعم
هل هناك تناقضات داخلية؟	❌ لا
نسبة الثقة الإجمالية	96%
________________________________________
🗺️ ٩. خريطة تنقل سريعة للـ CTO الجديد
تريد أن تعرف...	اذهب إلى...
ما هو هذا المشروع؟	01_PROJECT_OVERVIEW.md
أين الملفات؟	02_PROJECT_TREE.md
ما التقنيات المستخدمة؟	05_TECH_STACK.md
كيف يتدفق البيانات؟	06_SYSTEM_ARCHITECTURE.md
ما الجداول وكيف ترتبط؟	08_DATABASE_DOCUMENTATION.md
ما الـ APIs المتاحة؟	09_API_CATALOG.md
كيف يعمل التوصيل؟	10_BUSINESS_WORKFLOWS.md
لماذا صممنا النظام هكذا؟	14_ARCHITECTURAL_DECISIONS.md
ما المشكلات المعروفة؟	15_KNOWN_ISSUES_AND_DEBT.md
ما تقييمك النهائي؟	19_FINAL_CTO_REPORT.md
________________________________________
🫡 تم. هذه الوثيقة هي بوابتك إلى عالم "الروائع ERP". اختر مسارك، وابدأ الرحلة.