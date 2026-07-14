📁 04_FOLDER_INDEX.md – البنية المجلدية الموحدة
🎯 الغرض من الوثيقة
شرح كل مجلد في مشروع "الروائع ERP" بعمق، مع توثيق: ماذا يفعل، لماذا وُجد، كيف يعمل، اعتمادياته، تفاعلاته، وحالة Multi-Tenant. هذه الوثيقة هي المرجع المعماري الموحد لأي CTO أو مهندس جديد.
________________________________________
🗺️ الهيكل العام
text
erp-frontend/                         ← جذر المستودع (Git Repository)
│
├── companies/                        ← مجلد المستأجرين (Tenants)
│   └── company-1/                    ← المستأجر الحالي (Single Tenant)
│       ├── [ملفات جذر الشركة]         ← core.js, app.html, main.html, sw.js...
│       ├── sales/                    ← تطبيقات المبيعات (6)
│       ├── warehouse/                ← تطبيقات المخازن (9)
│       ├── delivery/                 ← تطبيقات التوصيل (2)
│       ├── purchasing/               ← تطبيقات المشتريات (2)
│       ├── office/                   ← تطبيقات مكتبية (5)
│       └── store/                    ← المتجر الإلكتروني (2)
│
├── supabase/                         ← طبقة الخلفية (Backend)
│   └── functions/                    ← Edge Functions (71+)
│
└── docs/                             ← التوثيق الهندسي
    ├── 01_PROJECT_OVERVIEW.md
    ├── 02_PROJECT_TREE.md
    ├── 03_FILE_INDEX.md
    ├── 04_FOLDER_INDEX.md           ← هذه الوثيقة
    └── ...
________________________________________
📁 أولاً: companies/ – مجلد المستأجرين
ماذا يفعل؟
يحتوي على مجلدات المستأجرين (Tenants). حالياً، مستأجر واحد فقط (company-1). في P2 (Multi-Tenant)، ستُضاف مجلدات جديدة (company-2, company-3...).
لماذا وُجد؟
لعزل ملفات كل شركة عن الأخرى، تمهيداً للتحول إلى SaaS. هذا هو النمط الذي تستخدمه Odoo.sh و Shopify.
كيف يعمل؟
•	حالياً (Single Tenant): Cloudflare Pages ينشر companies/company-1/.
•	مستقبلاً (Multi-Tenant): كل مجلد شركة يُنشر على نطاق فرعي مستقل (company1.rawaea.com).
حالة Multi-Tenant
•	غير مفعل حالياً. company_id ثابت في كل مكان (00000000-...001).
•	الانتقال يتطلب: إعادة هيكلة RLS، Edge Functions، وقاعدة البيانات.
________________________________________
📁 ثانياً: companies/company-1/ – جذر الشركة
ماذا يحتوي؟
الملفات الأساسية المشتركة بين جميع التطبيقات:
الملف	الدور
core.js	النواة المشتركة (RW_Auth, RW_DB, RW_API, RW_UI, RW_ImageCache, RW_SW)
app.html	بوابة الدخول الذكية (Smart Router)
main.html	النظام الأم – مركز القيادة (10,000+ سطر)
sw.js	Service Worker
register-sw.js	مدير التحديثات (فحص كل 60 ثانية)
manifest.json	إعدادات PWA
_headers	ضوابط Cloudflare Cache
schema-validator.js	حارس الدستور الآلي
كيف يتفاعل مع باقي المجلدات؟
•	core.js يُستدعى من جميع تطبيقات PWA في المجلدات الفرعية.
•	sw.js يُسجل لجميع التطبيقات في النطاق /companies/company-1/.
•	schema-validator.js يفحص جميع ملفات company-1/ و supabase/functions/.
________________________________________

📁 ثالثاً: sales/ – تطبيقات المبيعات (6 تطبيقات)
ماذا يحتوي؟
الملف	القناة	حالة core.js	حالة ES6
telesales.html	البيع الهاتفي	❌ لم يهاجر	⚠️ const, let
pos.html	نقطة البيع (كاشير)	❌ لم يهاجر	⚠️ const, let
order-taker.html	مندوب المبيعات	❌ لم يهاجر	⚠️ const
van-sales.html	البيع المباشر من السيارة	❌ لم يهاجر	⚠️ const, let
supervisor.html	مراقبة أداء الفريق	❌ لم يهاجر	⚠️ const
manager.html	تقارير وإدارة	❌ لم يهاجر	⚠️ const
لماذا وُجد؟
هذه التطبيقات هي "بوابات الإيراد". كل قناة بيعية لها تطبيقها المستقل لمنع الفوضى وتسهيل التدريب.
كيف يتفاعل مع باقي المجلدات؟
•	مع warehouse/: الأوردرات التي تُنشأ هنا تُجمع في رانشيتات وتُجهز في المخازن.
•	مع delivery/: الأوردرات المُجهزة تُسلم عبر driver.html.
•	مع supabase/functions/: تستدعي save-sales-invoice.
ملاحظات معمارية
•	⚠️ لا تستخدم core.js. تعيد تعريف Supabase Client و Dexie.js. هذه أولوية P1.
•	⚠️ تستخدم const و let. خرق للمواد 1-4 من الدستور.
________________________________________
📁 رابعاً: warehouse/ – تطبيقات المخازن (9 تطبيقات)
ماذا يحتوي؟
الملف	الدور	حالة core.js
receiver.html	استلام المشتريات	✅ ذهبي
picker.html	التحضير (النموذج الذهبي)	⚠️ جزئي
loader.html	التحميل على السيارة	✅ ذهبي ماسي
returns.html	استلام المرتجعات (الأعلى تعقيداً)	✅ ذهبي ماسي
unloader.html	تفريغ البضاعة	✅ ذهبي ماسي
counter.html	الجرد	✅ ذهبي ماسي
vouchers.html	الأذونات المخزنية	✅ ذهبي ماسي
supervisor.html	إدارة الفريق (تغيير الأدوار)	❌ لم يهاجر
manager.html	تقارير المخازن	❌ لم يهاجر
لماذا وُجد؟
المخازن هي العمود الفقري للتوزيع. كل دور له تطبيقه المستقل.
كيف يتفاعل مع باقي المجلدات؟
•	مع sales/: تستقبل الأوردرات المُجمعة في رانشيتات.
•	مع delivery/: تُجهز البضاعة التي سيُسلمها driver.html.
•	مع purchasing/: تستقبل البضاعة من receiver.html.
•	مع supabase/functions/: تستدعي complete-picking, complete-loading, complete-return.
ملاحظات معمارية
•	✅ معظم التطبيقات ذهبية ماسية وتستخدم core.js.
•	✅ picker.html (النموذج الذهبي الأصلي) لا يستخدم core.js بالكامل. أولوية إصلاح.
________________________________________
📁 خامساً: delivery/ – تطبيقات التوصيل (2 تطبيقان)
ماذا يحتوي؟
الملف	الدور	حالة core.js
driver.html	مندوب التوصيل (4 تبويبات)	✅ ذهبي ماسي
supervisor.html	مشرف التوصيل	✅ يستخدم core.js
لماذا وُجد؟
التوصيل هو المرحلة الميدانية الأهم. driver.html هو التطبيق الذي يستخدمه السائق في الشارع.
كيف يتفاعل مع باقي المجلدات؟
•	مع warehouse/: يستلم الرانشيتات المُحمّلة من loader.html.
•	مع supabase/functions/: يستدعي start-delivery, complete-order-delivery, complete-delivery, cancel-delivery.
ملاحظات معمارية
•	✅ driver.html ذهبي ماسي. يستخدم core.js بالكامل (RW_Auth, RW_API, RW_UI, RW_ImageCache, RW_SW).
________________________________________
📁 سادساً: purchasing/ – تطبيقات المشتريات (2 تطبيقان)
ماذا يحتوي؟
الملف	الدور	حالة core.js
buyer.html	مسؤول المشتريات	❌ لم يهاجر
supervisor.html	مشرف المشتريات	❌ لم يهاجر
كيف يتفاعل مع باقي المجلدات؟
•	مع warehouse/: receiver.html يستقبل البضاعة التي طلبها buyer.html.
•	مع supabase/functions/: يستدعي save-purchase-order, receive-purchase.
________________________________________
📁 سابعاً: office/ – التطبيقات المكتبية (5 تطبيقات)
ماذا يحتوي؟
الملف	الدور	حالة core.js
accountant.html	المحاسب (KPIs، سندات)	❌ لم يهاجر
finance-manager.html	المدير المالي (KPIs، تقارير)	❌ لم يهاجر
general-manager.html	المدير العام (لوحة شاملة)	❌ لم يهاجر
hr.html	الموارد البشرية (موظفين، رواتب)	❌ لم يهاجر
owner.html	المالك (تحكم كامل)	❌ لم يهاجر
ملاحظات معمارية
•	هذه التطبيقات "قشرة رقيقة" (Thin Clients). تقدم KPIs وتحيل إلى main.html للتفاصيل.
•	⚠️ بعض التبويبات "قيد التطوير" (الحضور والرواتب في hr.html). هذا دين تقني.
________________________________________
📁 ثامناً: store/ – المتجر الإلكتروني (2 تطبيقان)
الملف	الدور	حالة core.js	حالة ES6
index.html	واجهة المتجر (سلة، كوبونات)	❌ لم يهاجر	⚠️ const, let
track.html	تتبع الطلب (5 مراحل)	❌ لم يهاجر	⚠️ const, let
________________________________________

📁 تاسعاً: supabase/functions/ – Edge Functions (71+)
ماذا يحتوي؟
71+ دالة Deno/TypeScript. كل دالة في مجلد منفصل.
التنظيم الداخلي
الفئة	الدوال
دورة الحياة	start-picking, complete-picking, start-loading, complete-loading, start-delivery, complete-order-delivery, complete-delivery, start-return, complete-return, cancel-*, reopen-*
المبيعات	save-sales-invoice, submit-online-order, confirm-order, delete-order
المشتريات	save-purchase-order, receive-purchase
المخزون	save-inventory-count, send-stock-voucher, receive-stock-voucher, unload-runsheet
المالية	save-receipt-voucher, save-payment-voucher, save-transfer-voucher, save-daily-settlement, get-trial-balance, get-profit-loss
الإدارة	save-item, save-customer, save-employee, save-role, save-branch, save-settings
مساعدة	log-action, sync-run-sheet-details, report-discrepancy
ملاحظات معمارية
•	⚠️ complete-picking لا تزال تستخدم invoke (P0).
•	⚠️ save-receipt-voucher و save-payment-voucher تستخدمان supabase.sql (P0).
•	✅ مجلد functions/ مُستثنى من فحص ES6 في schema-validator.js.
________________________________________
📁 عاشراً: docs/ – التوثيق الهندسي
ماذا يحتوي؟
مرجع رسمي لأي CTO أو مهندس معماري جديد.
الملفات
#	الملف	الوصف
01	PROJECT_OVERVIEW.md	نظرة عامة
02	PROJECT_TREE.md	شجرة المشروع
03	FILE_INDEX.md	فهرس الملفات
04	FOLDER_INDEX.md	هذه الوثيقة
05	TECH_STACK.md	المجموعة التقنية
06	SYSTEM_ARCHITECTURE.md	المعمارية (قيد الإنشاء)
...	...	حتى 24
________________________________________
📊 مقارنة بالأنظمة المنافسة
المعيار	SAP B1	Odoo	الروائع ERP
فصل التطبيقات حسب الإدارة	✅ وحدات	✅ addons	✅ sales/, warehouse/...
وجود نواة مشتركة	✅ DI API	✅ ORM	✅ core.js
فصل الخلفية عن الواجهة	✅ صارم	✅ واضح	✅ supabase/functions/
سهولة إضافة شركة جديدة	❌ معقد	✅ سهل	🟡 P2: Multi-Tenant
Offline-First	❌	❌	✅ Dexie.js
دعم أجهزة قديمة	❌	❌	✅ ES5
________________________________________
🧠 تقييم الثقة (Confidence Assessment)
المعيار	الحالة
هل جميع المجلدات المذكورة مؤكدة من المستودع؟	✅ نعم
هل توجد مجلدات أخرى غير مذكورة؟	⚠️ احتمال .git (مخفي)، node_modules (غير موجود)
هل هيكل المجلدات قابل للتوسع (Multi-Tenant)؟	✅ نعم – companies/ جاهز
هل هناك مجلدات غير مستخدمة أو ميتة؟	❌ لا – كل مجلد له وظيفة
نسبة الثقة الإجمالية	98%
________________________________________
🫡 تم. هذه وثيقة 04_FOLDER_INDEX.md الموحدة. جاهزة للاعتماد.
