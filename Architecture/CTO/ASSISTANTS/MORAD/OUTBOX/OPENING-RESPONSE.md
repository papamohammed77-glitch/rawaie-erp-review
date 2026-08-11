# CTO OPENING RESPONSE — MORAD

## 1. تأكيد الاستلام

تم استلام رسالة الافتتاح وبدأت العمل بصفتي **Adversarial Reviewer** لمرحلة:

- Inventory
- Manual Vouchers
- Van Sales

سأتعامل مع Production Evidence وProduction Schema كمرجع حاكم عند التعارض، ولن أتعامل مع تحليل أي مساعد باعتباره حقيقة لمجرد أنه صادر عنه. fileciteturn220file0

## 2. الملفات التي قرأتها فعليًا

تمت قراءة/مراجعة المواد التي أمكن الوصول إليها على فرع `rescue/manual-vouchers-inventory-core` حتى هذه المرحلة، ومنها:

- `Architecture/CTO/ASSISTANTS/MORAD/INBOX/OPENING-TASK.md` — رسالة الافتتاح. fileciteturn220file0
- `Architecture/RAWAEA — Architectural Constraints & Proven Lessons.md` — القيود والدروس المعمارية الحاكمة.
- `docs/Draft/مساعدة مساعد سابق.md` — تحليل سابق لدورة Manual Voucher وفرضياته. fileciteturn221file0
- `docs/Draft/رد المساعد حسين.md` — تحليل حسين ونتائج الـReconciliation التي قدمها. fileciteturn222file0
- `docs/Draft/رد المساعد مراد.md` — آخر مخرجات Morad السابقة، بما فيها نقاط الـNO GO والتعارضات المحددة. fileciteturn223file0
- `docs/00_REVIEW_START_HERE.md` — نقطة الدخول الرسمية للمراجعة وخريطة المشروع. fileciteturn224file0
- `docs/01_PROJECT_OVERVIEW.md` — نطاق المشروع، مكوناته، وتدفقات العمل العامة. fileciteturn225file0

كما تم الاطلاع ضمن مسار العمل السابق على Production/SQL Evidence والـCurrent/Original/Migration material المتعلقة بـManual Voucher، بما في ذلك نقطة `completed_by` التي سبق إثباتها.

## 3. Facts أعتبرها مثبتة

1. `stock_branches` يمثل حالة المخزون الحالية، و`inventory_log` يمثل سجل حركات المخزون وفق النموذج المعماري الذي تتم مراجعته.
2. Production Schema هو المرجع عند التحقق من وجود الأعمدة والعقود، ولا يجوز اختراع Schema أو RPC signature.
3. يوجد mismatch مثبت بين Production `stock_vouchers` و`complete_manual_stock_voucher_atomic` حول `completed_by`؛ وجود المشكلة لا يعني أن الحل هو إضافة العمود.
4. Current Manual Voucher lifecycle يستخدم CREATE / SEND / RECEIVE / COMPLETE / CANCEL عبر Edge Functions وRPCs مركزية، بحسب الأدلة التي تمت مراجعتها.
5. Current Stock mutation في مسارات Manual Voucher نُقلت إلى RPCs atomic بدل تنفيذها مباشرة في Edge Functions، بينما Original كان يحتوي Stock mutation داخل Edge Functions.
6. `DirectSale` و`DirectReturn` يحتويان تعارضات بين بعض مصادر Architecture/Migration/Production/Current، ولذلك لا أعتبر Target النهائي لهما محسومًا دون Evidence إضافية أو قرار معماري موثق.
7. توجد قاعدة واضحة تمنع الانتقال إلى Patch قبل اكتمال Reconciliation.
8. الـArchitecture العامة للمشروع تؤكد أن Business Logic تنفذ في Backend/Edge Functions وأن الـPWA تمثل طبقة تشغيلية، مع وجود PostgreSQL/RLS كجزء من طبقة البيانات والأمان. fileciteturn224file0turn225file0

## 4. نقاط الخطر التي سأراجعها ضد تحليل حسين

سأهاجم تحليل حسين تحديدًا في النقاط التالية:

- هل كل ادعاء عن Production RPC مدعوم بتعريف Production فعلي، وليس Migration أو Original؟
- هل `completed_by` mismatch مثبت في RPC المنشورة فعلًا، وما علاقته بعقد Audit؟
- هل `DirectSale` هو OUT فقط أم يوجد دليل إنتاجي على OUT + IN؟
- هل `DirectReturn` يحدث عند SEND أم RECEIVE، وما أثر ذلك على Stock وInventory Log؟
- هل CANCEL transitions متطابقة بين Production وCurrent وOriginal وMigration؟
- هل كل Lifecycle transition يمنع تجاوز الحالة المسموح بها؟
- هل Stock movement يحدث مرة واحدة فقط لكل Business Event؟
- هل Inventory Log يطابق كل حركة فعلية مرة واحدة فقط؟
- هل locking/atomicity تمنع partial writes وconcurrency races؟
- هل retry قد يعيد نفس الحركة؟
- هل company/branch context محفوظ ومتحقق منه في كل مسار؟
- هل RLS أو SECURITY DEFINER تغير حدود الأمان؟
- هل نقل المنطق من Original إلى Current أسقط Business Rule مهمًا؟
- وفي Van Sales: هل MAIN → VAN، VanSale، Return، Unload تؤدي إلى أي خصم مزدوج أو حركة مفقودة؟
- هل الاختبارات نفسها self-cleaning ولا تعتمد على بيانات ثابتة أو تتجاوز validation؟

هذه نقاط تدقيق وليست أحكامًا مسبقة.

## 5. UNKNOWN / UNPROVEN

لن أفترض مسبقًا:

- أن `completed_by` يجب إضافته إلى Schema.
- أن `completed_by` يجب حذفه من كل Audit model.
- أن Migration تمثل Production.
- أن Original يمثل Target.
- أن Current يمثل Target النهائي.
- أن DirectSale يجب أن يكون OUT فقط أو OUT + IN دون Evidence حاكمة.
- أن DirectReturn يجب أن يتحرك في SEND أو RECEIVE دون إثبات.
- أن CANCEL له Target نهائي محدد إذا لم تثبته Production/Architecture.
- أن أي RPC موجودة في Migration منشورة في Production.
- أن أي سلوك غير موجود في الملفات يمكن تعويضه من المعرفة العامة.
- أن Van Sales لها حركة مخزنية معينة ما لم يثبتها الكود/SQL/Architecture.

أي نقطة لا أجد لها دليلًا سأصنفها `UNKNOWN / UNPROVEN` بدل ملء الفراغ.

## 6. الالتزام

ألتزم بالآتي:

- لا تخمين.
- لا افتراض.
- لا اختراع Schema أو RPC أو Business Rule.
- Evidence First.
- Production Evidence قبل Migration عند التعارض.
- Original للمقارنة التاريخية، وليس كـTarget تلقائي.
- لا SQL.
- لا تعديل Production.
- لا Patch.
- لا تغيير Schema.
- لا تجاوز RLS.
- لا أوقف تقدم أي مساعد لمجرد اختلاف رأي غير مثبت.
- أي اعتراض سأقدمه يجب أن يكون له دليل مباشر؛ وإلا سأضعه `UNKNOWN / UNPROVEN`.

## الحالة

**OPENING TASK RECEIVED — READY FOR NEXT TASK**

لا أقدم Patch أو SQL أو توصية تنفيذية في هذه الرسالة، وسأنتظر المهمة التالية في INBOX كما طلب CTO.
