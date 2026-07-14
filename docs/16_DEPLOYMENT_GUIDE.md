16_DEPLOYMENT_GUIDE.md – دليل النشر الكامل
المشروع: الروائع ERP (Al Rawaie ERP)
النسخة: 2.0
التاريخ: 2026-07-13
المراجع: دستور الروائع 2.0، 06_SYSTEM_ARCHITECTURE.md، 11_DEPENDENCY_MAP.md
المؤلفون: مراد، حامد، محمود – مدمجة ومحسّنة بواسطة حسين (RAWAEA AI CTO)
________________________________________
🎯 الهدف من هذه الوثيقة
توثيق دليل النشر الكامل لنظام الروائع ERP. هذه الوثيقة هي المرجع الرسمي لأي مهندس DevOps لنشر النظام في بيئة إنتاجية، أو إنشاء بيئة تطوير جديدة، أو التوسع إلى Multi-Tenant. تغطي:
•	المتطلبات الأساسية قبل النشر
•	هيكل النشر على Cloudflare Pages و Supabase
•	خطوات النشر التفصيلية خطوة بخطوة
•	استراتيجية التحديث (Continuous Deployment)
•	استراتيجية التراجع (Rollback)
•	مراقبة ما بعد النشر (Monitoring)
•	استكشاف الأخطاء وإصلاحها (Troubleshooting)
________________________________________
📋 أولاً: المتطلبات الأساسية
المتطلب	التفاصيل	إلزامي؟
حساب Supabase	مشروع Supabase مع PostgreSQL و Edge Functions مفعلة	✅ نعم
حساب Cloudflare	Cloudflare Pages للنشر	✅ نعم
حساب GitHub	مستودع خاص للمشروع (erp-frontend)	✅ نعم
Node.js	v18+ (لتشغيل schema-validator.js)	✅ نعم
Git	للتحكم بالإصدارات	✅ نعم
Supabase CLI	npm install -g supabase – لنشر Edge Functions	✅ نعم
نطاق مخصص	rawaea.com أو ما يعادله (اختياري للإنتاج)	🟡 اختياري
________________________________________
📋 ثانياً: هيكل النشر – نظرة عامة
graph TD
    Developer[مطور] -->|git push| GitHub[GitHub Repository]
    GitHub -->|Webhook| Cloudflare[Cloudflare Pages]
    Developer -->|supabase functions deploy| Supabase[Supabase Platform]
    
    Cloudflare -->|يُخدم الملفات| Edge[شبكة الحافة العالمية]
    Cloudflare -->|استضافة PWA| PWA[تطبيقات الموظفين]
    Cloudflare -->|استضافة main.html| Main[النظام الأم]
    
    Supabase -->|تُشغّل الدوال| Deno[Deno Edge Functions]
    Supabase -->|قاعدة بيانات| DB[(PostgreSQL)]
    Supabase -->|مصادقة| Auth[Supabase Auth]
    Supabase -->|تخزين| Storage[Supabase Storage]
ملخص البنية:
•	الواجهة الأمامية: ملفات ثابتة (HTML, JS, CSS) تُنشر على Cloudflare Pages.
•	الخدمات الخلفية: 71 Edge Function تُنشر على Supabase (Deno).
•	قاعدة البيانات: PostgreSQL مُدارة عبر Supabase.
•	المصادقة: Supabase Auth (Email/Password).
•	لا توجد خوادم وسيطة. نموذج Serverless + Jamstack.
________________________________________
📋 ثالثاً: هيكل النشر – مشاريع Cloudflare Pages
#	المشروع	مجلد البناء	النطاق المقترح	الوصف
1	النظام الأم	companies/company-1/	app.rawaea.com	main.html – مركز القيادة
2	تطبيقات الموظفين	companies/company-1/	staff.rawaea.com	app.html – بوابة الدخول
3	تطبيقات المبيعات	companies/company-1/sales/	sales.rawaea.com	6 تطبيقات PWA
4	تطبيقات المخازن	companies/company-1/warehouse/	warehouse.rawaea.com	9 تطبيقات PWA
5	تطبيقات التوصيل	companies/company-1/delivery/	delivery.rawaea.com	driver.html
6	تطبيقات المشتريات	companies/company-1/purchasing/	purchasing.rawaea.com	2 تطبيقان
7	التطبيقات المكتبية	companies/company-1/office/	office.rawaea.com	5 تطبيقات
8	المتجر الإلكتروني	companies/company-1/store/	store.rawaea.com	index.html, track.html
ملاحظة: يمكن دمج بعض المشاريع في نطاق واحد إذا كانت الملفات في نفس المجلد. التقسيم أعلاه هو للتوسع المستقبلي.
________________________________________
📋 رابعاً: التهيئة البيئية (Environment Setup)
متغيرات البيئة في Cloudflare Pages
المتغير	القيمة	الوصف
SUPABASE_URL	https://xxxxx.supabase.co	عنوان مشروع Supabase
SUPABASE_ANON_KEY	eyJhbGciOi...	مفتاح Supabase العام (Anon Key)
ملاحظة أمنية: SUPABASE_ANON_KEY هو مفتاح عام بطبيعته. لا حاجة لإخفائه في تطبيقات PWA. لكن لا تستخدم SUPABASE_SERVICE_ROLE_KEY في أي ملف أمامي.
متغيرات البيئة في Supabase Edge Functions
المتغير	الوصف
SUPABASE_URL	عنوان مشروع Supabase
SUPABASE_SERVICE_ROLE_KEY	مفتاح الخدمة (صلاحيات كاملة – لا يُكشف أبداً)
جميع هذه المتغيرات محقونة تلقائياً في بيئة Deno Edge Function.
ملف _headers – إعدادات Cloudflare
يجب وضع ملف _headers في جذر companies/company-1/ (وهو موجود بالفعل). محتواه:
text
/sw.js
  Cache-Control: no-cache, no-store, must-revalidate

/companies/company-1/sw.js
  Cache-Control: no-cache, no-store, must-revalidate

/*/sw.js
  Cache-Control: no-cache, no-store, must-revalidate

/*.html
  Cache-Control: no-cache, must-revalidate
الغرض: منع Cloudflare من تخزين sw.js وملفات HTML مؤقتاً، لضمان وصول التحديثات فوراً للمستخدمين.
________________________________________
📋 خامساً: خطوات النشر التفصيلية
أ. النشر الأولي (First Deployment)
الخطوة 1: تهيئة Supabase
1.	أنشئ مشروع Supabase جديد من Supabase Dashboard.
2.	اختر كلمة مرور قوية لقاعدة البيانات.
3.	اختر المنطقة الأقرب لعملائك (مثلاً: eu-central-1 لأوروبا، ap-southeast-1 لآسيا).
4.	فعّل Auth (Email/Password):
o	انتقل إلى Authentication → Settings.
o	تأكد من تفعيل Email/Password.
o	عطّل تأكيد البريد الإلكتروني للتطوير (يُفعّل في الإنتاج).
5.	نفذ SQL لإنشاء الجداول:
o	انتقل إلى SQL Editor.
o	نفذ ملف schema.sql (يحتوي على جميع الجداول الـ 51).
6.	فعّل RLS على الجداول الأساسية:
sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_settlements ENABLE ROW LEVEL SECURITY;
-- ... إلخ لجميع الجداول الحساسة
7.	أنشئ RPC Functions:
sql
-- مثال: ميزان المراجعة
CREATE OR REPLACE FUNCTION get_trial_balance(p_from_date DATE, p_to_date DATE)
RETURNS TABLE(account_id TEXT, account_name TEXT, total_debit NUMERIC, total_credit NUMERIC) AS $$
BEGIN
    RETURN QUERY SELECT ...;
END;
$$ LANGUAGE plpgsql;
⚠️ تحذير: بعض RPC Functions قد لا تكون منشأة بعد. راجع 09_API_CATALOG.md للقائمة الكاملة.
8.	انشر جميع Edge Functions (71 دالة):
bash
# تثبيت Supabase CLI (إن لم يكن مثبتاً)
npm install -g supabase

# توثيق
supabase login

# نشر جميع الدوال دفعة واحدة
supabase functions deploy --project-ref [project-ref]
أو نشر دالة محددة:
bash
supabase functions deploy complete-loading --project-ref [project-ref]
9.	حمّل الإعدادات الافتراضية في app_settings:
sql
INSERT INTO app_settings (company_id, company_name, tax_rate, delivery_fee, currency)
VALUES ('00000000-0000-0000-0000-000000000001', 'الروائع', 15, 20, 'SAR');
10.	أنشئ Buckets في Storage:
o	product-images (عام – للقراءة فقط).
o	logos (عام – للقراءة فقط).
الخطوة 2: تهيئة GitHub
1.	ادفع المستودع إلى GitHub (مستودع خاص):
bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-org/erp-frontend.git
git push -u origin main
2.	تأكد من أن جميع الملفات في أماكنها الصحيحة (راجع 02_PROJECT_TREE.md).
3.	شغّل schema-validator.js وتأكد من 0 مخالفات:
bash
node schema-validator.js
# يجب أن يطبع: "✅ لا توجد أي مخالفات للدستور."
الخطوة 3: تهيئة Cloudflare Pages
1.	سجّل الدخول إلى Cloudflare Dashboard.
2.	انتقل إلى Workers & Pages → Create application → Pages → Connect to Git.
3.	اختر مستودع erp-frontend من GitHub.
4.	حدد Build settings:
o	Build command: (فارغ – لا يوجد بناء، الملفات ثابتة).
o	Build output directory: / (الجذر).
o	Root directory: / (الجذر).
5.	أضف متغيرات البيئة:
o	SUPABASE_URL = https://xxxxx.supabase.co
o	SUPABASE_ANON_KEY = eyJhbGciOi...
6.	انشر.
الخطوة 4: نشر تطبيقات PWA (مشاريع منفصلة)
لكل مجموعة تطبيقات، أنشئ مشروع Cloudflare Pages منفصل:
1.	أنشئ مشروع جديد ← اربطه بنفس مستودع GitHub.
2.	حدد مجلد البناء المناسب:
o	companies/company-1/sales/ لتطبيقات المبيعات
o	companies/company-1/warehouse/ لتطبيقات المخازن
o	companies/company-1/delivery/ لتطبيقات التوصيل
o	إلخ...
3.	أضف نفس متغيرات البيئة.
4.	انشر.
الخطوة 5: إعداد النطاقات (اختياري)
1.	في Cloudflare Pages ← المشروع ← Custom domains.
2.	أضف النطاق المخصص (مثلاً: app.rawaea.com).
3.	سيتم تفعيل SSL تلقائياً.
الخطوة 6: التحقق من النشر
1.	افتح https://app.rawaea.com (النظام الأم).
2.	سجّل الدخول كمالك.
3.	افتح https://staff.rawaea.com (تطبيقات الموظفين).
4.	سجّل دخول كموظف وتحقق من التوجيه (app.html → تطبيق المخازن).
5.	افتح تطبيق PWA مباشرة (مثل https://warehouse.rawaea.com/picker.html).
6.	اختبر دورة حياة كاملة:
o	أنشئ أوردر ← رانشيت ← تحضير ← تحميل ← توصيل ← مرتجعات ← تسوية.
________________________________________
ب. النشر المستمر (Continuous Deployment)
Cloudflare Pages يدعم النشر التلقائي عند الدفع إلى GitHub:
•	أي push إلى main ← نشر تلقائي.
•	أي pull request ← معاينة (Preview Deployment) برابط مؤقت.
•	schema-validator.js يجب أن يُشغّل قبل كل push.
________________________________________
ج. استراتيجية التحديث والتحديثات التلقائية
sequenceDiagram
    participant Dev as المطور
    participant GH as GitHub
    participant CF as Cloudflare Pages
    participant Browser as متصفح المستخدم
    participant SW as Service Worker

    Dev->>GH: git push (main)
    GH->>CF: Webhook - نشر تلقائي
    CF->>CF: نشر الملفات الجديدة
    Note over Browser: بعد 5 دقائق...
    Browser->>CF: فحص sw.js (عبر register-sw.js)
    CF-->>Browser: sw.js الجديد (no-cache)
    Browser->>SW: install + activate + clients.claim()
    SW->>Browser: postMessage(RW_SW_UPDATED)
    Browser->>Browser: هل _rwHasActiveSession؟
    alt لا توجد جلسة نشطة
        Browser->>Browser: window.location.reload()
    else توجد جلسة نشطة
        Browser->>Browser: عرض Banner "يتوفر تحديث"
    end
ملاحظات هامة:
•	ملفات HTML: Network Only (لا تخزين). تُجلب من الخادم دائماً.
•	ملفات JS/CSS/صور: Cache First (تُخزن محلياً في Service Worker لتحسين الأداء).
•	استجابات API: Network Only (لا تخزين).
•	register-sw.js يفحص التحديثات كل 60 ثانية. هذا سلوك تلقائي.
________________________________________
د. استراتيجية التراجع (Rollback)
إذا فشل النشر الجديد:
1.	التراجع الفوري (الواجهة الأمامية):
o	انتقل إلى Cloudflare Pages Dashboard.
o	اختر المشروع ← Deployments.
o	اختر النشر السابق (الأخضر/الناجح).
o	اضغط "Rollback to this deployment".
2.	التراجع عبر Git:
bash
git revert <commit-hash>  # إلغاء الـ commit المسبب للمشكلة
git push origin main
3.	التراجع عن Edge Function:
bash
# أعد نشر النسخة السابقة من الكود
supabase functions deploy [function-name] --project-ref [project-ref]
⚠️ تحذير: لا يوجد نظام إصدارات (Versioning) تلقائي للدوال. يُوصى بالاحتفاظ بنسخ احتياطية من الكود.
________________________________________
📋 سادساً: مراقبة ما بعد النشر (Monitoring)
الأداة	الغرض	الحالة
Cloudflare Analytics	مراقبة الزيارات، الأداء، أخطاء 4xx/5xx	🟢 مفعّل تلقائياً
Supabase Dashboard	مراقبة قاعدة البيانات، Edge Functions، Auth	🟢 مفعّل تلقائياً
Supabase Logs	سجلات Edge Functions (كل console.log)	🟢 مفعّل
audit_log	سجل أحداث النظام (داخل التطبيق)	🟢 مفعّل
inventory_log	سجل حركات المخزون	🟢 مفعّل
Uptime Monitoring	مراقبة توفر النظام (مثل UptimeRobot)	🟡 غير مفعّل (P2)
Error Tracking	تتبع الأخطاء في الواجهة الأمامية (مثل Sentry)	🟡 غير مفعّل (P2)
________________________________________
📋 سابعاً: استكشاف الأخطاء وإصلاحها (Troubleshooting)
المشكلة 1: المستخدمون لا يرون التحديثات الجديدة
العنصر	التفاصيل
السبب المحتمل	Cloudflare يخزن sw.js في الكاش
الفحص	curl -I https://app.rawaea.com/sw.js – تحقق من Cache-Control
الحل	تأكد من وجود _headers مع Cache-Control: no-cache لـ sw.js
المشكلة 2: تطبيق PWA لا يعمل Offline
العنصر	التفاصيل
السبب المحتمل	sw.js يستخدم Network Only لـ HTML (المادة 64)
الفحص	افتح DevTools ← Application ← Service Worker
الحل	هذا سلوك متوقع. التطبيق يعتمد على Dexie.js للبيانات (تعمل Offline)، لكن HTML يحتاج Network. إذا كان المستخدم في منطقة نائية، يحتاج إلى فتح التطبيق مرة واحدة على الأقل.
المشكلة 3: Edge Function تفشل بصمت
العنصر	التفاصيل
السبب المحتمل	خطأ في الكود أو CORS
الفحص	Supabase Dashboard ← Edge Functions ← Logs
الحل	تأكد من وجود console.log(rawBody) في بداية الدالة. راجع السجلات.
المشكلة 4: run_sheet_details غير محدث
العنصر	التفاصيل
السبب المحتمل	sync-run-sheet-details لم تُستدعَ
الفحص	Supabase Logs ← ابحث عن "sync-run-sheet-details"
الحل	تأكد من أن complete-* تستدعي sync-run-sheet-details عبر fetch اليدوي. أو استدعِها يدوياً: POST /functions/v1/sync-run-sheet-details
المشكلة 5: run_sheet_details غير محدث (حالة خاصة)
العنصر	التفاصيل
السبب المحتمل	complete-picking كانت تستخدم invoke (تم إصلاحها)
الحل	تأكد من أن جميع complete-* تستخدم fetch اليدوي لاستدعاء sync-run-sheet-details.
________________________________________
📋 ثامناً: قائمة التحقق قبل النشر (Pre-Deployment Checklist)
#	البند	✓
1	تشغيل schema-validator.js – 0 مخالفات	☐
2	جميع Edge Functions تستخدم fetch اليدوي (لا invoke)	☐
3	جميع Edge Functions تستخدم console.log(rawBody)	☐
4	لا يوجد supabase.sql بقيم ديناميكية	☐
5	CORS مقيد (وليس *)	☐
6	_headers موجود ويحتوي على Cache-Control لـ sw.js	☐
7	RLS مفعل على driver_liabilities و daily_settlements	☐
8	اختبار تسجيل الدخول كمالك وكمستخدم عادي	☐
9	اختبار دورة حياة رانشيت كاملة (من الإنشاء للتسوية)	☐
10	اختبار Offline (فصل الإنترنت وتجربة التطبيق)	☐
11	اختبار التحديث التلقائي (نشر إصدار جديد والتحقق من تحديث المستخدمين)	☐
12	اختبار Rollback (التراجع عن نشر والتأكد من عدم تأثر المستخدمين)	☐
________________________________________
📋 تاسعاً: مقارنة بالأنظمة المنافسة
المعيار	SAP B1	Odoo	الروائع ERP
نوع النشر	On-Premise أو Cloud	On-Premise أو Odoo.sh	Cloudflare Pages (Serverless)
النشر التلقائي (CI/CD)	❌ يدوي	✅ عبر Odoo.sh	✅ Cloudflare + GitHub
بيئات متعددة	✅ (Dev, Test, Prod)	✅ (Staging)	✅ Preview Deployments
استراتيجية التحديث	تحديثات دورية	تحديثات دورية	تلقائي (كل push)
تحديثات PWA التلقائية	❌	❌	✅ register-sw.js
حماية الجلسات النشطة	❌	❌	✅ _rwHasActiveSession
التراجع (Rollback)	✅ يدوي	✅ يدوي	✅ بنقرة واحدة في Cloudflare
تحديثات Edge Functions	❌ (ABAP)	✅ (Python)	✅ supabase functions deploy
________________________________________
📋 عاشراً: التوسع إلى Multi-Tenant (خطة مستقبلية – P2)
•	قاعدة البيانات: إما Schema per Tenant (مثلاً: company_1, company_2) أو RLS مع company_id.
•	النشر: كل مستأجر له مجلده الخاص تحت companies/ (مثلاً: company-2/).
•	Cloudflare Pages: إنشاء مشروع جديد لكل مستأجر، مرتبط بمجلده في المستودع.
•	Edge Functions: تبقى موحدة، مع تمرير company_id في كل طلب.
________________________________________
📋 حادي عشر: إجراءات الطوارئ (Disaster Recovery)
الإجراء	التفاصيل
النسخ الاحتياطي لقاعدة البيانات	Supabase يوفر نسخاً احتياطية تلقائية يومياً (حسب الخطة). يمكن تصدير قاعدة البيانات يدوياً عبر pg_dump.
PITR (Point-in-Time Recovery)	غير مفعل حالياً (يحتاج خطة مدفوعة).
استرجاع الواجهة الأمامية	عبر Cloudflare Pages: Rollback إلى آخر نشر ناجح.
استرجاع Edge Functions	عبر Supabase CLI: إعادة نشر النسخة السابقة من الكود.
استرجاع الكود المصدري	GitHub يحتفظ بكل الإصدارات. git revert لاسترجاع أي تغيير.
________________________________________
🧠 تقييم الثقة (Confidence Assessment)
المعيار	الحالة
هل خطوات النشر مدعومة بتجربة فعلية؟	⚠️ جزئياً – تم بناء الهيكل لكن لم يُختبر النشر على Cloudflare Pages فعلياً
هل إعدادات Supabase مؤكدة؟	⚠️ جزئياً – تم إنشاء المشروع لكن بعض الإعدادات (RLS, RPC) تحتاج تأكيداً
هل هناك خطة تعافي من الكوارث؟	✅ نعم – تم توثيقها في القسم 11
نسبة الثقة الإجمالية	85%
معلومات ناقصة:
•	اسم النطاق الفعلي (هل هو rawaea.com أم نطاق آخر؟).
•	تفاصيل اشتراك Supabase (Plan، Rate Limits).
•	تجربة نشر فعلي على Cloudflare Pages (تأكيد أن كل شيء يعمل).
ما يلزم للتحقق:
•	تنفيذ نشر فعلي على Cloudflare Pages واختبار التطبيقات جميعها.
•	توثيق إعدادات Supabase Dashboard (RLS Policies، RPC Functions) في ملف منفصل.
•	اختبار خطة التعافي من الكوارث (Disaster Recovery) عملياً.
________________________________________
🫡 تم إعداد هذه الوثيقة وفقاً لدستور الروائع 2.0. جاهز للانتقال إلى الملف التالي