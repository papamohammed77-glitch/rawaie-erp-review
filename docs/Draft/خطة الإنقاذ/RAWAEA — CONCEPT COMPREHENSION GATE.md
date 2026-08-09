# RAWAEA — CONCEPT COMPREHENSION GATE
## اختبار الفهم الإجباري قبل أي إصلاح

### التعليمات العليا

أنت عضو في فريق CTO المسؤول عن إصلاح نظام RAWAEA ERP.

**ممنوع كتابة أي كود.**  
**ممنوع اقتراح Migration.**  
**ممنوع تعديل Edge Function.**  
**ممنوع اقتراح حل لمشكلة لم يُطلب منك حلها.**

هذه المرحلة اختبار **فهم المفاهيم فقط**.

أي إجابة مبنية على افتراض أو تخمين تعتبر **FAIL**.

إذا لم تعرف الإجابة، اكتب صراحة:

> UNKNOWN — لا أملك Evidence كافيًا.

لا تحاول ملء الفراغ بالمنطق الشخصي.

---

# أولًا — مصادر الاختبار

يجب أن تعتمد إجاباتك على:

1. `Architecture/`
2. `docs/`
3. وثائق Greenfield Target Design
4. `Edge_Functions/original/`
5. `Edge_Functions/current/`
6. `Edge_Function_Reports/`
7. `SQL_Evidence/`
8. `supabase/migrations/`

ولا يجوز تجاهل المصدر الحاكم عند وجود تعارض.

---

# ثانيًا — الاختبار

## القسم A — فلسفة النظام

1. ما الفرق بين **Master System** و **Operational App**؟
2. من يملك Master Data؟
3. هل التطبيق التشغيلي يملك الحقيقة؟
4. ما المقصود بأن التطبيق التشغيلي **Event Source**؟
5. ما المقصود بـ **Central Business/Data Heart**؟
6. لماذا يعتبر Distributed Business Logic خطرًا؟
7. هل كل Business Logic يجب أن يكون داخل PostgreSQL؟
8. ما الفرق بين:
   - Domain Decision
   - Atomic Database Primitive؟

---

# القسم B — Inventory

9. ما هو Inventory في RAWAEA؟
10. هل `stock_branches` وحده يمثل الحقيقة الكاملة للمخزون؟
11. ما العلاقة بين:
   - Business Event
   - Document
   - Stock Movement
   - Inventory Log
   - Audit؟
12. متى يتحرك Physical Stock؟
13. متى يتحرك Allocated Stock؟
14. ما الفرق بين Physical Stock و Allocated Stock؟
15. ما الذي يجب أن يمنع:
   `qty < allocated_qty`؟

---

# القسم C — Manual Stock Vouchers

16. ما هي الأذونات المخزنية اليدوية الستة؟
17. ما وظيفة كل نوع؟
18. ما المقصود بـ Direct Issue؟
19. Direct Issue إلى من؟
20. ما المقصود بـ Direct Return؟
21. Direct Return من من؟
22. ما المقصود بـ Transfer؟
23. Transfer من أين؟
24. Transfer إلى أين؟
25. ما الفرق بين Manual Voucher و Runsheet؟
26. ما الأذونات اليدوية التي لا تعتمد على Runsheet؟
27. لماذا لا يجوز اعتبار كل Functions داخل `08_inventory` Manual Stock Vouchers؟

---

# القسم D — Voucher Lifecycle

اشرح بدقة الفرق والمسؤولية في:

28. `create-stock-voucher`
29. `send-stock-voucher`
30. `receive-stock-voucher`
31. `complete-stock-voucher`
32. `cancel-stock-voucher`

ثم أجب:

33. متى ينشأ المستند؟
34. متى يصبح الالتزام التشغيلي حقيقيًا؟
35. متى يتحرك المخزون؟
36. هل Create يحرك المخزون؟
37. هل Send يحرك المخزون؟
38. هل Receive يحرك المخزون؟
39. هل Complete يحرك المخزون؟
40. ماذا يحدث عند Cancel؟
41. هل يمكن Cancel بعد حدوث Stock Posting؟
42. إذا كان ذلك ممكنًا، فما القاعدة الصحيحة؟
43. ما الفرق بين Document State وStock State؟

---

# القسم E — Van Sales

44. ما دور سيارة البيع المباشر؟
45. هل السيارة مخزن فعلي أم Custody/Operational Stock؟
46. من المسؤول عن المخزون الموجود على السيارة؟
47. ما دور مندوب البيع؟
48. ما العلاقة بين:
   Warehouse → Vehicle → Salesperson → Customer؟
49. هل Van Sales جزء من Runsheet بالضرورة؟
50. ما الفرق بين:
   - Loading
   - Van Custody
   - Sales
   - Return
   - Settlement؟
51. هل كل حركة إلى السيارة تعتبر Runsheet؟
52. هل Direct Sale Voucher يمثل نفس مفهوم Runsheet؟

---

# القسم F — Loading / Unloading

53. ما وظيفة `complete-loading.ts`؟
54. ما أثرها على `stock_branches`؟
55. ما أثرها على `inventory_log`؟
56. ما وظيفة `unload-runsheet.ts`؟
57. ما الفرق بين Unloading وTransfer؟
58. متى تكون الحركة مجرد أثر تشغيلي لمسار آخر؟
59. لماذا لا يجوز تصنيف Inventory Functions حسب المجلد فقط؟

---

# القسم G — Returns

60. ما الفرق بين:
   - Supplier Return
   - Customer Return
   - Direct Return
   - Runsheet Return؟
61. أيها يخصم المخزون؟
62. أيها يعيد المخزون؟
63. من هو الطرف المقابل لكل نوع؟
64. ما أثر كل نوع على Inventory Log؟

---

# القسم H — Central Inventory Engine

65. لماذا نحتاج Central Inventory Engine؟
66. ماذا يجب أن يستقبل؟
67. ماذا يجب أن ينفذ؟
68. ماذا يجب ألا يسمح للتطبيقات بتنفيذه مباشرة؟
69. هل يجوز لـ POS تعديل `stock_branches` مباشرة؟
70. هل يجوز لـ Van Sales تعديل `stock_branches` مباشرة؟
71. هل يجوز لـ Voucher Function تعديل `stock_branches` خارج القلب؟
72. أين يجب تسجيل Inventory Log؟
73. كيف نمنع إنشاء عدة مصادر حقيقة للمخزون؟

---

# القسم I — Company / Branch / Item Isolation

74. من أين يأتي `company_id`؟
75. هل يسمح للعميل بإرساله؟
76. كيف يجب إثبات ملكية Branch للشركة؟
77. ما العلاقة:

`Company → Branch → Warehouse → Stock`

78. لماذا لا تكفي مجرد Foreign Key منفردة لإثبات العزل؟
79. ما العلاقة الصحيحة بين Voucher وBranch؟
80. ما العلاقة الصحيحة بين Item وCompany؟
81. لماذا `item_code` وحده غير كافٍ للعزل؟

---

# القسم J — Atomicity

82. ما العمليات التي يجب أن تقع داخل Transaction واحدة في Stock Voucher؟
83. ماذا يحدث إذا فشل Item رقم 2 بعد نجاح Item رقم 1؟
84. هل يجوز بقاء Inventory Log بعد Rollback؟
85. هل يجوز أن يصبح Voucher `Sent` إذا فشل Stock Mutation؟
86. ما الفرق بين:
   - Transaction
   - Row Lock
   - CAS؟
87. هل `FOR UPDATE` وحدها تثبت أن النظام آمن من Concurrency؟
88. ما الاختبار المطلوب لإثبات ذلك؟

---

# القسم K — Original / Current / Target

89. ما الفرق بين Original وCurrent وTarget؟
90. هل Original هي الحقيقة التي يجب الحفاظ عليها؟
91. هل Current هو التصميم الصحيح بالضرورة؟
92. ما الذي نأخذه من Original؟
93. ما الذي نأخذه من Current؟
94. متى نرفض Original؟
95. كيف نقرر أن Current يحتاج إزالة وليس تعديلًا؟
96. ما دور Evidence في القرار؟

---

# القسم L — الاختبارات

97. ما الفرق بين:
   PASS / FAIL / NOT RUN / MISSING EVIDENCE؟
98. هل "يبدو أنه يعمل" نتيجة اختبار؟
99. لماذا نستخدم Rollback Fixtures؟
100. لماذا لا ننشئ Failure Hooks دائمة في قاعدة البيانات؟
101. كيف تختبر Duplicate Send؟
102. كيف تختبر Multi-item Atomicity؟
103. كيف تختبر Company Isolation؟
104. كيف تختبر Concurrency؟

---

# القسم M — اختبار الفهم العميق

أجب عن السيناريوهات التالية بدون كتابة كود:

### Scenario 1

مخزن مركزي لديه 100 وحدة.

تم تحميل 40 وحدة إلى سيارة بيع مباشر.

كمية السيارة أصبحت جزءًا من مسؤولية من؟

وما نوع الحدث المستندي الذي يمثل الانتقال؟

---

### Scenario 2

مندوب باع 10 وحدات من السيارة.

هل هذه العملية:

- Transfer؟
- Loading؟
- Sale؟
- Return؟

ولماذا؟

---

### Scenario 3

السيارة أعادت 3 وحدات سليمة إلى المخزن.

ما الحدث؟

من هو الطرف المقابل؟

ما أثره على المخزون؟

---

### Scenario 4

يوجد Voucher متعدد الأصناف:

Item A نجح خصمه.

Item B لا يوجد له Stock كافٍ.

ما النتيجة الصحيحة؟

---

### Scenario 5

مستخدمان نفذا Send لنفس Voucher في نفس اللحظة.

ما النتيجة الصحيحة؟

---

### Scenario 6

Function وجدت أول `company_id` في `app_settings` واستخدمته.

هل هذا مقبول؟

لماذا؟

---

### Scenario 7

وجدت Function داخل `08_inventory` لكنها لا تعدل `stock_branches` ولا `inventory_log` وإنما تستلم Purchase.

هل هي Manual Stock Voucher Function؟

---

### Scenario 8

وجدت Function داخل `03_loading` تخصم من `stock_branches` وتكتب `inventory_log`.

هل هي Inventory Function من ناحية المسؤولية؟

---

# القسم N — اختبار اكتشاف النقص

أجب فقط:

### ما المفاهيم التي لا تزال غير واضحة لك؟

اكتبها صراحة.

لا تحاول إخفاء النقص.

---

# القسم O — ممنوعات الاختبار

يعتبر الاختبار **FAIL فورًا** إذا قام المساعد بـ:

- كتابة كود.
- اقتراح SQL.
- اقتراح Migration.
- اقتراح تعديل Function.
- اختراع Schema.
- افتراض Business Rule غير مثبت.
- اعتبار Original هي Target.
- اعتبار Current هو Target لمجرد أنه أحدث.
- تصنيف Function بناءً على اسم المجلد فقط.
- الخلط بين Van Sales وRunsheet.
- الخلط بين Transfer وLoading.
- الخلط بين Direct Sale وTransfer.
- الخلط بين Physical Stock وAllocated Stock.
- اعتبار `FOR UPDATE` وحدها ضمانًا للتزامن.
- الإجابة على نقطة غير معروفة بالتخمين.

---

# OUTPUT FORMAT

أخرج النتيجة بهذا الشكل فقط:

## CONCEPT TEST RESULT

**Overall:** PASS / FAIL

### Strong Concepts
- ...

### Weak Concepts
- ...

### Unknown Concepts
- ...

### Critical Misunderstandings
- ...

### Dangerous Assumptions
- ...

### Readiness for Target Design
- READY
- NOT READY

### CTO Decision

**هل يسمح لهذا المساعد بالمشاركة في تصميم أو تعديل Inventory؟**

YES / NO

مع سبب مختصر وحاسم.

لا تقترح إصلاحات.

هذا اختبار فهم فقط.