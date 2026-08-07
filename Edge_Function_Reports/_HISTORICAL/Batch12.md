Batch:
Batch12

Category:
Reporting Engine
Contains:

get-profit-loss

get-balance-sheet

get-cash-flow

get-trial-balance

get-pnl-by-cost-center

get-driver-dashboard

Project Version:
Architecture Constitution v1
Date: 2026-08-06


راجعت الدوال الخاصة بـ Batch 12 — Reporting Engine من منظور المعمارية، الأمن، والاعتماديات، وهذه خلاصة المراجعة.
النتيجة العامة
الحالة: 🟢 Batch 12 صالح للاعتماد مع بعض التحسينات غير الحرجة.
التقييم الحالي:
•	Security: 9.5/10
•	Architecture: 9/10
•	Consistency: 9.5/10
•	Readiness: Production Ready
________________________________________
مراجعة كل Edge Function
1. get-profit-loss
✔ جيد
•	يستخدم RPC
•	يوجد Authentication
•	Validation جيد
•	لا يحتوي Business Logic داخل Edge Function
•	مجرد Orchestrator
الملاحظات
يوجد Hardcoded:
get_profit_loss()
وهذا صحيح لأن المنطق داخل PostgreSQL.
النتيجة
✅ اعتماد
________________________________________
2. get-balance-sheet
جيد جداً
يعتمد بالكامل على RPC
Authentication موجود
Parsing جيد
Separation ممتاز
________________________________________
الملاحظة الوحيدة
يفترض أن
Assets
Liabilities
Equity
يأتي Classification من قاعدة البيانات وليس من الحساب نفسه.
ولكن هذا واضح أنه كذلك.
✅ اعتماد
________________________________________
3. get-cash-flow
من أفضل الدوال الموجودة.
أعجبني تعليقك:
// Technical Debt
لأنك وثقت أن التصنيف الحالي مؤقت.
وهذا ممتاز.
________________________________________
الملاحظة الوحيدة
حالياً يعتمد على
account codes
لتحديد:
Operating
Investing
Financing
بينما مستقبلاً يجب أن يعتمد على
journal classification
وليس رقم الحساب.
لكن هذا موثق بالفعل.
✅ اعتماد
________________________________________
4. get-trial-balance
ممتاز جداً.
Edge Function نظيف.
Authentication.
RPC.
لا يوجد منطق محاسبي داخله.
هذا المطلوب.
✅ اعتماد
________________________________________
5. get-pnl-by-cost-center
أيضاً ممتاز.
يعتمد بالكامل على:
get_pnl_by_cost_center()
ولا يعيد اختراع المنطق.
وهذا هو التصميم الصحيح.
________________________________________
6. get-driver-dashboard
هذه الدالة هي الوحيدة التي أعتبرها تحتاج مراجعة بسيطة.
المشكلة الأولى
في الاستعلام:
activeRS.id
بينما:
.select(
runsheet_code,
status,
run_date,
vehicle_id,
delivery_start,
total_amount
)
لا تقوم بإرجاع
id
ثم لاحقاً تستخدم:
.eq("runsheet_id", activeRS.id)
وهذا Bug.
يجب أن يكون:
.select(
id,
runsheet_code,
...
)
________________________________________
المشكلة الثانية
الدالة تقوم بعدة Queries:
runsheets

orders

run_sheet_details

todayStats
يفضل مستقبلاً تحويلها إلى
RPC واحدة.
لكن ليس إلزامياً الآن.
________________________________________
المشكلة الثالثة
يفضل إضافة
company_id
داخل الاستعلامات.
حتى لو كانت RLS مفعلة.
________________________________________
النتيجة
🟡 تحتاج Patch صغير فقط.
________________________________________
تقييم الاعتماديات
يعتمد Batch على:
Journal Engine

Ledger Engine

Runsheet Engine

Master Data
ولا يعتمد على:
Treasury
Inventory الجديد
Van Ledger
وهذا ممتاز.
________________________________________
لا يوجد Business Logic داخل Edge Functions
وهذه نقطة مهمة جداً.
كل المنطق الحقيقي داخل:
RPC

Database

Views
وهذا هو المطلوب في دستور المشروع.
________________________________________
اقتراح صغير
يمكن إنشاء RPC موحدة:
get_driver_dashboard()
تعيد:
Driver

Runsheet

Orders

Vehicle Stock

Today Stats
بدلاً من 4 Queries.
ليس ضرورياً الآن.
________________________________________
التقرير النهائي
Batch 12 — Reporting Engine
الدالة	الحالة
get-profit-loss	✅ معتمد
get-balance-sheet	✅ معتمد
get-cash-flow	✅ معتمد
get-trial-balance	✅ معتمد
get-pnl-by-cost-center	✅ معتمد
get-driver-dashboard	🟡 Patch صغير (إضافة id إلى استعلام الرانشيت، ويفضل إضافة company_id)
القرار
Batch 12 جاهز للاعتماد بنسبة تقارب 98%.
بعد إصلاح بسيط في get-driver-dashboard، يمكن اعتباره معتمداً بالكامل والانتقال إلى الدفعة التالية.

