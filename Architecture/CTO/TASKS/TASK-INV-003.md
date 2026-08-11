# TASK-INV-003 — INVENTORY FINALIZATION: EVIDENCE → SOLUTION → EXECUTION PLAN

Branch: `rescue/manual-vouchers-inventory-core`

## Mission
إنهاء مرحلة Inventory بأسرع طريق آمن، وتحويل كل blocker حالي إلى حل قابل للتنفيذ.

## Hussein
اقرأ أحدث تقارير Phase 1/2 الموجودة فعليًا في الفرع، ثم:
1. حدد الحالة الفعلية لكل blocker.
2. لكل blocker اقترح حلًا محددًا قابلًا للتنفيذ.
3. إذا كان الحل يحتاج SQL، أنشئ SQL جاهزًا للتنفيذ، self-cleaning عندما يكون اختبارًا، مع نتيجة متوقعة.
4. حدد Patch scope النهائي لإغلاق Inventory.
5. لا تنفذ schema/production changes إلا إذا كان المطلوب صراحة في المهمة اللاحقة.

ضع النتيجة في:
`Architecture/CTO/ASSISTANTS/HUSSEIN/OUTBOX/TASK-INV-003.md`

## Morad
اقرأ نتيجة حسين عند وجودها، وراجع الحلول لا لتكرار التحليل بل لكسرها:
1. هل كل حل يعالج السبب الحقيقي؟
2. هل يسبب stock duplication/loss أو custody ambiguity أو partial write أو retry duplication؟
3. هل SQL المقترحة آمنة وقابلة للإثبات؟
4. اقترح تصحيحًا عمليًا لكل اعتراض، وليس BLOCKED فقط.

ضع النتيجة في:
`Architecture/CTO/ASSISTANTS/MORAD/OUTBOX/TASK-INV-003.md`

## Mandatory rules
- NO GUESSING.
- NO endless BLOCKED loop.
- Every blocker MUST have a proposed solution or exact SQL evidence needed to prove the solution.
- Verify actual table/column/function names before using them.
- No patch until CTO reconciliation.
- No destructive Production change.
- Test data must self-clean.

## Completion
After writing and verifying the OUTBOX result, send the user only:
`تم — TASK-INV-003`

Do not paste the report into chat.
