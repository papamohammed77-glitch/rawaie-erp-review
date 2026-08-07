Batch:
Batch09

Category:
Accounting Engine

Contains:

save-journal-entry

save-payment-voucher تم النقل

save-receipt-voucher تم النقل



Project Version:
Architecture Constitution v1
Date: 2026-08-06

نعم، أرى نفس الملاحظة تقريبًا، وBatch09 يكشف لنا مشكلة معمارية مهمة، وليس مجرد مشكلة في الكود.
التقييم العام
Batch09 = 6.8 / 10
الحالة الحالية:
Needs Major Refactor
ليس لأنه مليء بالأخطاء البرمجية، بل لأنه يخلط أكثر من Bounded Context داخل نفس الـBatch.
________________________________________
أولاً: مشكلة التصنيف
هذا الـBatch اسمه
Accounting Engine
لكن فعليًا يحتوي على ثلاثة Domains مختلفة.
________________________________________
Domain 1
Accounting
ويشمل:
•	save-journal-entry
•	save-payment-voucher
•	save-receipt-voucher
وهذه فعلاً محاسبة.
________________________________________
Domain 2
Treasury
ويشمل:
•	save-transfer-voucher
لأنه يتعامل مع:
treasury
cash_box
current_balance
وهذا ليس Accounting مباشرة.
بل Cash Management.
________________________________________
Domain 3
Driver Operations
ويشمل:
update-driver-ledger
وهذا ليس محاسبة.
ولا خزينة.
بل جزء من
Delivery / Settlement
وبالتالي وجوده هنا مخالف للمعمارية الجديدة.
________________________________________
Architecture Finding 09-01
يجب فصل
Driver Ledger
عن
Accounting Engine
ونقله إلى
Settlement Engine
أو
Driver Service
حسب التصميم النهائي.
Severity
P1
________________________________________
الآن مراجعة كل Function
________________________________________
1
save-journal-entry
الحالة
🟢 جيد جداً.
يفعل شيئاً واحداً فقط:
Create Journal Entry
وهذا ممتاز.
لكن توجد مشاكل.
________________________________________
Finding 09-02
لا يوجد
Balance Validation
لا يتحقق أن
Debit == Credit
قبل الحفظ.
هذه من أخطر قواعد المحاسبة.
Severity
P0
________________________________________
Finding 09-03
لا يوجد Transaction
لو فشل إدراج
journal_lines
يبقى
journal_entry
يتيم.
P0
________________________________________
Finding 09-04
لا يوجد Posting Service
الـFunction تنشئ القيد مباشرة.
المفروض:
Journal Service
↓
Validation
↓
Posting Engine
↓
Ledger
________________________________________
2
save-payment-voucher
هذه Function أخطر بكثير.
لماذا؟
لأنها تنفذ:
Cash Box
•	
Journal
•	
Treasury
كلها معاً.
وهذا يخلق
Three Sources of Truth
في نفس اللحظة.
________________________________________
Finding 09-05
تحديث current_balance مباشرة.
هذا يخالف فلسفة Ledger-Based Accounting.
الرصيد يجب أن يكون مشتقاً.
وليس Stored Value.
P0
________________________________________
Finding 09-06
لا يوجد Rollback.
لو:
نجح Journal
وفشل Treasury
سيصبح النظام غير متوازن.
P0
________________________________________
Finding 09-07
Account IDs
مثل
"CASH-01"
و
"5"
Hardcoded.
يجب استخدام
Chart Of Accounts Lookup
وليس Strings ثابتة.
P1
________________________________________
3
save-receipt-voucher
تقريباً نفس المشاكل.
لكن أضاف
driver_ledger
داخله.
وهنا الخطر أكبر.
________________________________________
Finding 09-08
Receipt Voucher
لا يجب أن يعرف شيئاً عن Driver Ledger.
هذا Coupling.
المفروض:
Receipt
↓
Accounting Event
↓
Settlement Event
↓
Driver Ledger
وليس داخل نفس Function.
P1
________________________________________
4
save-transfer-voucher
وظيفياً جيدة.
لكن معمارياً ليست داخل Accounting.
بل داخل
Treasury.
________________________________________
Finding 09-09
ينبغي نقلها إلى
Treasury Engine.
P2
________________________________________
5
update-driver-ledger
هذه Function بسيطة.
لكن مكانها خاطئ.
وأيضاً:
________________________________________
Finding 09-10
لا تحسب Balance.
فقط تضيف:
Debit
Credit
بدون Running Balance.
إذا كانت فلسفة النظام تعتمد على رصيد جاري، فيجب تحديثه أو اشتقاقه بطريقة موحدة. وإذا كان الرصيد سيصبح مشتقًا من القيود فقط، فينبغي إزالة أي اعتماد على حقل رصيد مخزن.
P1
________________________________________
أكبر مشكلة في Batch09
وجود
Accounting
Treasury
Driver Ledger
داخل Batch واحد.
وهذا مخالف تماماً لفلسفة
Architecture Constitution
التي نعتمدها.
________________________________________
المطلوب مستقبلاً
يفصل إلى:
Accounting Engine
•	Journal
•	Payment Voucher
•	Receipt Voucher
Treasury Engine
•	Transfer Voucher
•	Cash Movement
Settlement Engine
•	Driver Ledger
•	Driver Settlement
________________________________________
نتيجة الفحص
البند	الحالة
جودة الكود	8.7/10
الالتزام بالـ ES5	✅ ممتاز
الالتزام بـ Supabase	✅ جيد
الالتزام بالمعمارية	❌ يحتاج إعادة فصل
إدارة المعاملات	❌ ناقصة
Validation	⚠️ ناقص
Atomicity	❌ ناقصة
________________________________________
Final Batch Status
Batch09 = NOT CLOSED
الحالة:
Needs Refactor (P0 + P1)
________________________________________
الملاحظات الجديدة المسجلة
•	Finding 09-01: فصل Driver Ledger عن Accounting Engine ونقله إلى Settlement/Driver Service (P1).
•	Finding 09-02: إضافة التحقق من توازن القيد (Debit = Credit) قبل الحفظ (P0).
•	Finding 09-03: تنفيذ العمليات داخل Transaction واحدة لضمان الذرية (P0).
•	Finding 09-04: إنشاء Posting Service مستقل بدلاً من النشر المباشر (P1).
•	Finding 09-05: إلغاء تحديث current_balance مباشرة والاعتماد على Ledger كمصدر للحقيقة (P0).
•	Finding 09-06: إضافة Rollback كامل عند فشل أي خطوة (P0).
•	Finding 09-07: إزالة الحسابات المرمزة (Hardcoded Account IDs) والاعتماد على Chart of Accounts (P1).
•	Finding 09-08: فصل تحديث Driver Ledger عن سند القبض عبر أحداث (Events) أو خدمة مستقلة (P1).
•	Finding 09-09: نقل save-transfer-voucher إلى Treasury Engine (P2).
•	Finding 09-10: توحيد سياسة احتساب رصيد Driver Ledger (Running Balance أو Ledger-derived) (P1).
أوافق أيضًا على ملاحظتك: Batch09 يكشف أن حدود المحركات (Engines) الحالية ليست نظيفة بالكامل، وهذه نقطة معمارية سنعالجها ضمن مرحلة إعادة التنظيم بعد اكتمال الفحص، وليس أثناءه، حتى لا نقطع سير المراجعة.
نعم، وبعد مراجعة Batch09 مع الهيكل الجديد MTP v2.0، أرى أن هناك دوالًا مكانها ليس داخل Accounting Engine، ويجب نقلها حتى تصبح الحدود بين المحركات (Bounded Contexts) نظيفة.
النقل المقترح
الدالة	موجودة حالياً	يجب نقلها إلى	السبب
save-transfer-voucher	Batch09 – Accounting	Batch12 – Infrastructure Services (أو Treasury Engine مستقبلاً إذا أنشأناه)	تتعامل مع حركة الخزائن وإدارة السيولة أكثر من المحاسبة العامة. لا يوجد Treasury Engine حالياً.
update-driver-ledger	Batch09 – Accounting	Batch07 – Settlement Engine	دفتر المندوب جزء من التسويات (Settlement) وليس من المحاسبة العامة.
________________________________________
ملاحظة مهمة
save-payment-voucher
تبقى في Batch09.
لكن يجب أن تتوقف عن تحديث:
•	treasury.current_balance
مباشرة.
بل تنشر حدثًا (Event) أو تستدعي خدمة مستقلة لاحقًا.
________________________________________
save-receipt-voucher
تبقى أيضًا في Batch09.
لكن يجب إزالة هذا الجزء منها:
driver_ledger
لأنه يجب أن يصبح داخل Settlement Engine.
أي يصبح التسلسل:
Receipt Voucher

↓

Accounting Entry

↓

Settlement Event

↓

Driver Ledger
وليس:
Receipt Voucher

↓

Driver Ledger مباشرة
________________________________________
إذن النقل الفعلي الوحيد الآن
Batch07
يضاف إليه
update-driver-ledger
________________________________________
Batch09
يحذف منه
update-driver-ledger
________________________________________
Batch12 (مؤقتًا)
يضاف إليه
save-transfer-voucher
إلى أن ننشئ لاحقًا:
Treasury Engine
فيصبح:
Batch13 – Treasury Engine
ويُنقل إليه مستقبلًا دون أي تعديل في المنطق.
________________________________________
Architecture Decision
أقترح تسجيل قرار معماري جديد:
AD-018 – Treasury Separation
القرار:
•	Driver Ledger يتبع Settlement Engine.
•	Transfer Voucher يتبع Treasury Domain وليس Accounting.
•	Accounting Engine مسؤول فقط عن القيود المحاسبية (Journal & Financial Vouchers).
________________________________________
وأضيف ملاحظة صغيرة يا صديقي: بعد هذه المراجعة، بدأ يتضح أن المشروع لا ينقصه فقط فحص الدوال، بل أيضًا استخراج الـDomains الحقيقية. وهذا بالضبط ما سيجعل الروائع ERP أسهل بكثير في التطوير والصيانة خلال السنوات القادمة.

ممتاز، والخطوة التي قمت بها صحيحة جدًا.
•	✅ نقل save-transfer-voucher إلى Batch13 – Treasury Engine قرار صحيح.
•	✅ سنبقي update-driver-ledger داخل Batch09 مؤقتًا حتى ننهي فحصه ثم ننقله رسميًا إلى Batch07.
________________________________________
أولاً: فحص update-driver-ledger
التقييم
النتيجة: 8.8 / 10
الكود بسيط ونظيف، لكنه ناقص من ناحية قواعد العمل.
________________________________________
الإيجابيات
✅ مسؤولية واحدة فقط (Single Responsibility)
يقوم فقط بإضافة قيد في
driver_ledger
ولا يحاول تحديث محاسبة أو خزينة.
________________________________________
✅ لا يحتوي على Side Effects
لا يعدل أي جداول أخرى.
________________________________________
✅ بسيط وسهل الاختبار.
________________________________________
Findings
________________________________________
Finding 09-11
لا يوجد تحقق من وجود السائق.
يستقبل:
driver_email
ثم يكتب مباشرة.
يفترض أولاً:
drivers

أو

users
ثم يتأكد أن السائق موجود.
Severity
P1
________________________________________
Finding 09-12
لا يوجد Company Isolation
لا يكتب
company_id
وهذا يخالف الدستور المعماري.
P1
________________________________________
Finding 09-13
لا يوجد Running Balance
إذا كانت فلسفة المشروع تعتمد على الرصيد الجاري، فهذه الدالة لا تقوم بحسابه.
أما إذا أصبح الرصيد مشتقًا من القيود فقط، فيجب توثيق ذلك بوضوح.
P2
________________________________________
Finding 09-14
لا يوجد Ledger Type
مثل:
Collection

Settlement

Advance

Expense

Shortage

Overage
كلها تتحول إلى:
description
وهذا سيصعب التقارير.
P2
________________________________________
Finding 09-15
لا يوجد منع للقيم السالبة.
يمكن إرسال:
debit = -100
أو
credit = -50
ولا يوجد تحقق.
P1
________________________________________
القرار
بعد الفحص...
يمكن نقلها إلى Batch07
لأنها لا تعتمد فعليًا على أي شيء داخل Accounting.
بل هي جزء من Settlement بالكامل.
________________________________________
التقرير النهائي لـ Batch09
الحالة العامة
البند	الحالة
جودة الكود	8.8 / 10
الالتزام بالـ ES5	✅ ممتاز
الالتزام بالدستور	⚠️ متوسط
الفصل بين Domains	❌ يحتاج تحسين
Transaction Safety	❌ ناقصة
Validation	⚠️ ناقص
Atomicity	❌ ناقصة
________________________________________
نتائج الفحص
الدوال المعتمدة
•	✅ save-journal-entry
•	✅ save-payment-voucher (بعد إصلاحات P0 لاحقًا)
•	✅ save-receipt-voucher (بعد إزالة Driver Ledger منها لاحقًا)
________________________________________
الدوال المنقولة
إلى Batch07 – Settlement Engine
update-driver-ledger
________________________________________
إلى Batch13 – Treasury Engine
save-transfer-voucher
________________________________________
الملاحظات المسجلة
ID	الوصف	الأولوية
09-01	فصل Driver Ledger عن Accounting	P1
09-02	التحقق من توازن القيد (Debit = Credit)	P0
09-03	تنفيذ Transaction كاملة	P0
09-04	إنشاء Posting Service مستقل	P1
09-05	منع تعديل current_balance مباشرة	P0
09-06	إضافة Rollback عند الفشل	P0
09-07	إزالة الحسابات المرمزة (Hardcoded Accounts)	P1
09-08	فصل Driver Ledger عن Receipt Voucher	P1
09-09	نقل Transfer Voucher إلى Treasury Engine	تم التنفيذ ✅
09-10	توحيد سياسة رصيد Driver Ledger	P1
09-11	التحقق من وجود السائق	P1
09-12	إضافة Company Isolation	P1
09-13	تحديد سياسة Running Balance	P2
09-14	إضافة Ledger Type	P2
09-15	منع القيم السالبة	P1
________________________________________
الحالة النهائية
Batch09 – Accounting Engine
الحالة: 🟡 Conditionally Approved
بعد النقل أصبح محتواه المنطقي هو:
•	save-journal-entry
•	save-payment-voucher
•	save-receipt-voucher
أما:
•	save-transfer-voucher → Batch13 ✅
•	update-driver-ledger → Batch07 ✅
وبهذا أصبح Batch09 أقرب بكثير إلى أن يمثل Accounting Engine الحقيقي وفق معمارية المشروع.

