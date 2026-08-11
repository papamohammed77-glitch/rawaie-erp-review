# TASK-INV-004 — FINAL INVENTORY PATCH DESIGN

Branch: `rescue/manual-vouchers-inventory-core`

## Objective
تحويل الـEvidence المكتملة إلى Patch Plan نهائي قابل للتنفيذ لإغلاق Manual Voucher Inventory، مع منع تكرار أخطاء Schema/RPC/Idempotency.

## Hussein
اقرأ TASK-INV-004 وكل Evidence diagnostics الخاصة بالـInventory، خصوصًا:
- Production schema
- All manual-voucher RPC definitions
- RPC privileges
- Inventory-log contract
- Branch/company consistency
- Settings/main-branch consistency
- Stock availability
- التعريفات.csv
- الفهارس الفعلية.csv

حدد Patch النهائي لـ:
1. إصلاح `completed_by` drift دون إضافة عمود غير مطلوب إلا إذا أثبتت Business Rule ضرورته.
2. جعل Partial RECEIVE idempotent وآمنًا عند retry.
3. الحفاظ على atomicity وrow locking.
4. منع stock duplication/loss.
5. الحفاظ على CANCEL semantics المثبتة.
6. منع أي RPC من استخدام columns غير موجودة فعليًا.
7. تحديد أي تعديل Constraints/Indexes ضروري فقط إذا أثبتت الأدلة ضرورته.

**مطلوب:**
- Patch SQL كامل وجاهز للتنفيذ.
- قبل/بعد واضح.
- اختبارات تحقق Self-Cleaning.
- Expected Results.
- Rollback SQL.
- قائمة Production objects التي سيتغير تعريفها.

ممنوع تنفيذ Patch في Production في هذه المهمة.

ضع النتيجة:
`Architecture/CTO/ASSISTANTS/HUSSEIN/OUTBOX/TASK-INV-004.md`

## Morad
بعد ظهور تقرير حسين، راجعه adversarially.
لا تكرر التحليل السابق.
اختبر Patch المقترح ضد:
- duplicate RECEIVE
- partial RECEIVE retry
- concurrent execution
- wrong company
- wrong branch/custody
- CANCEL
- stock conservation
- inventory_log consistency
- privileges/security
- schema drift

لكل اعتراض يجب تقديم **تصحيح عملي**، وليس BLOCKED فقط.

ضع النتيجة:
`Architecture/CTO/ASSISTANTS/MORAD/OUTBOX/TASK-INV-004.md`

## CTO Gate
لا يتم تنفيذ SQL النهائي إلا بعد قراءة تقريري حسين ومراد ومطابقتهما مع Evidence.

بعد إتمام التقرير أرسل للمستخدم فقط:
`تم — TASK-INV-004`
