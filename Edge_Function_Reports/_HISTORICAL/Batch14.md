Batch:
Batch14

Category:
Treasury
Contains:
save-payment-voucher

save-receipt-voucher

save-transfer-voucher

Project Version:
Architecture Constitution v1
Date: 2026-08-07
راجعت دوال Batch 14 كدفعة مستقلة، مع الأخذ في الاعتبار قراراتنا المعمارية الحالية (Constitution v1)، وعدم إعادة فتح نقاشات Batch السابقة.
نتيجة المراجعة
Batch ID
Batch 14
Category
Treasury Engine
Functions
•	save-payment-voucher
•	save-receipt-voucher
•	save-transfer-voucher
________________________________________
التقييم العام
الحالة:
🟢 Batch 14 = PASS
هذه الدفعة تعتبر مستقرة معمارياً، وجميع الدوال تنتمي لنفس الـDomain (الخزينة).
لا يوجد أي تضارب معماري يمنع اعتمادها.
________________________________________
مراجعة كل دالة
1) save-payment-voucher
الوظيفة
إنشاء سند صرف.
يقوم بـ
•	إنشاء حركة Cash Box.
•	إنشاء Journal Entry.
•	إنشاء Journal Lines.
•	تحديث رصيد الخزينة.
•	التحقق من المستخدم.
نقاط القوة
✔ Authentication
✔ فصل بين Header وLines
✔ Journal Entry منفصل
✔ Journal Lines صحيحة
✔ تحديث Treasury
✔ Reference Number
ملاحظات
الدالة تعتمد على:
account_code
كمفتاح للخزينة.
وهذا متوافق مع قرارنا الحالي.
لا توجد مشكلة.
________________________________________
2) save-receipt-voucher
الوظيفة
إنشاء سند قبض.
يقوم بـ
•	Cash Box
•	Journal Entry
•	Journal Lines
•	Treasury Update
•	Driver Ledger Update
نقاط القوة
✔ أفضل من سند الصرف.
إضافة:
driver_ledger
قرار ممتاز.
________________________________________
ملاحظة صغيرة
يوجد:
collectedByDriverEmail
داخل Header.
وهذا مناسب.
لكن مستقبلاً يفضل أن يكون:
driver_id
بدلاً من Email.
ليس Bug.
فقط تحسين.
________________________________________
3) save-transfer-voucher
الوظيفة
تحويل بين خزينتين.
يقوم بـ
•	Cash Out Voucher
•	Cash In Voucher
•	Journal Entry
•	Journal Lines
•	خصم Treasury
•	إضافة Treasury
________________________________________
نقاط القوة
هذه أفضل دالة في Batch.
لأنها:
✔ تنفذ التحويل بالكامل.
✔ تحافظ على Double Entry.
✔ تحدث الخزنتين.
________________________________________
Architecture Review
الدوال لا تقوم بأي:
Inventory
Sales
Runsheets
Orders
Stock
Ledger
COGS
Posting Engine
إذن لا يوجد Coupling.
________________________________________
Database Usage
تتعامل مع:
Cash Box
Journal Entries
Journal Lines
Treasury
Driver Ledger
ولا تخرج خارج نطاقها.
________________________________________
Security
كل الدوال تستخدم:
auth.getUser(token)
إذن:
✔ يوجد Authentication.
________________________________________
Business Rules
الدوال تطبق:
سند قبض
سند صرف
تحويل خزائن
ولا تحتوي منطق أعمال خارج اختصاصها.
________________________________________
المشاكل المعروفة
لا يوجد Bugs معمارية.
الملاحظات الوحيدة:
1
يفضل استخدام:
driver_id
بدلاً من Email.
مستقبلاً.
________________________________________
2
تحديث Treasury يتم بواسطة:
current_balance
وهو القرار الحالي للنظام.
مقبول.
________________________________________
Technical Debt
يوجد دين تقني بسيط فقط.
Debt 1
استخدام Email داخل Driver Ledger.
الأفضل:
driver_id
________________________________________
Compatibility
متوافقة مع:
✔ Batch 8
✔ Batch 9
✔ Batch 10
✔ Batch 12
✔ Batch 13
ولا تكسر أي Batch.
________________________________________
Decision
البند	النتيجة
Architecture	✅ PASS
Security	✅ PASS
Treasury Logic	✅ PASS
Journal Logic	✅ PASS
Inventory Isolation	✅ PASS
Reporting Compatibility	✅ PASS
Ready For Constitution v1	✅ YES
________________________________________
القرار النهائي
🟢 Batch 14 معتمد بالكامل (APPROVED).
لا أوصي بنقل أي دالة منه إلى Batch آخر، وتصنيفه الحالي تحت Treasury صحيح ومنطقي.

