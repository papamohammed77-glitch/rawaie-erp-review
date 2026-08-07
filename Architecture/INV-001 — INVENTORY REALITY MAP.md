# RAWAEA ERP

# INV-001 — INVENTORY REALITY MAP

**Phase:** 3 — Immediate Domain Execution
**Domain:** Inventory
**Sprint:** INV-001
**Status:** EXECUTION
**Priority:** P0
**Depends On:**

* `RAWAEA_ARCHITECTURE_CONSTITUTION.md`
* `EXECUTION_PROTOCOL.md`
* `DOMAIN_EXECUTION_ORDER.md`
* نتائج فحص Edge Functions السابقة
* نتائج فحص قاعدة البيانات السابقة

---

# 1. PURPOSE

الغرض من هذا الـ Sprint هو إنتاج **خريطة الحقيقة الفعلية للمخزون في النظام الحالي**.

هذه ليست محاولة لتصميم Inventory جديد.

وليست محاولة لاقتراح Schema جديد.

وليست إعادة بناء Inventory Engine.

المطلوب هو معرفة:

> **كيف يعمل Inventory فعليًا الآن؟**

وليس:

> كيف نعتقد أنه يعمل.

---

# 2. PRIMARY OBJECTIVE

يجب أن نصل في نهاية `INV-001` إلى إجابة دقيقة وقابلة للتنفيذ عن السؤال:

> **ما هي الحقيقة الفعلية للمخزون داخل RAWAEA ERP، وأين توجد، ومن يقرأها، ومن يغيرها، وكيف تتغير؟**

ويجب أن يستطيع مساعد آخر قراءة هذه الوثيقة وفهم Inventory Domain دون الاعتماد على الذاكرة أو التخمين.

---

# 3. GOVERNING PRINCIPLE

## EXISTING SYSTEM FIRST

النظام الحالي هو نقطة الانطلاق.

لا يجوز:

* إعادة بناء Inventory من الصفر.
* إنشاء نموذج جديد لمجرد أنه يبدو أفضل.
* افتراض أن التصميم النظري هو التصميم الفعلي.
* حذف Legacy behavior قبل فهم أثره.
* تغيير Schema أثناء هذا الـ Sprint إلا إذا كان ذلك ضروريًا للغاية للفحص.

---

# 4. HARD NO-GUESSING RULE

أي معلومة يجب تصنيفها إلى واحدة من الحالات التالية:

```text
CONFIRMED
INFERRED
UNKNOWN
CONFLICT
```

## CONFIRMED

المعلومة مثبتة من:

* Database schema.
* Constraints.
* Indexes.
* Edge Function code.
* Application code.
* SQL.
* نتائج فحص سابقة موثقة.

## INFERRED

استنتاج منطقي من أكثر من دليل.

يجب كتابة الدليل الذي أدى إليه.

## UNKNOWN

لا توجد أدلة كافية.

يجب عدم ملء الفراغ بالافتراض.

## CONFLICT

مصدران أو أكثر يعطيان معنيين مختلفين.

يجب إيقاف القرار وعدم اختيار أحدهما عشوائيًا.

---

# 5. INVENTORY REALITY MAP — REQUIRED OUTPUT

يجب أن تحتوي الوثيقة النهائية على الأقسام التالية:

```text
1. Inventory Entities
2. Inventory Tables
3. Inventory Quantities
4. Inventory Locations
5. Inventory Movements
6. Inventory Writers
7. Inventory Readers
8. Inventory Business Events
9. Inventory State Transitions
10. Inventory + Sales
11. Inventory + Purchasing
12. Inventory + Returns
13. Inventory + Warehouse
14. Inventory + Van Sales
15. Inventory + Loading
16. Inventory + Unloading
17. Inventory + Runsheet
18. Inventory + Counting
19. Inventory + Adjustments
20. Inventory + Accounting / COGS
21. Inventory Edge Functions
22. Inventory Application Consumers
23. Source of Truth Matrix
24. Contradictions
25. Unknowns
26. Risks
27. Migration Constraints
28. INV-002 Entry Gate
```

---

# 6. INVENTORY ENTITIES

يجب تحديد جميع الكيانات التي لها علاقة مباشرة أو غير مباشرة بالمخزون.

على الأقل يجب البحث عن:

```text
Product
Item
SKU
Unit
Quantity
Warehouse
Branch
Location
Stock
Inventory
Movement
Transfer
Purchase
Sale
Return
Vehicle
Van
Driver
Load
Unload
Runsheet
Count
Adjustment
Cost
COGS
```

لكن:

> وجود الاسم لا يعني أن الكيان موجود بهذا المعنى.

يجب إثبات كل كيان.

---

# 7. INVENTORY TABLE MAP

أنشئ جدولًا بالشكل التالي:

| Entity    | Table | Role        | Read | Write | Confidence |
| --------- | ----- | ----------- | ---- | ----- | ---------- |
| Product   | ?     | Master      | ?    | ?     | ?          |
| Stock     | ?     | State       | ?    | ?     | ?          |
| Movement  | ?     | Transaction | ?    | ?     | ?          |
| Warehouse | ?     | Location    | ?    | ?     | ?          |
| ...       | ...   | ...         | ...  | ...   | ...        |

إذا كان للكيان أكثر من جدول:

```text
PRIMARY
DERIVED
LEGACY
SUPPORTING
UNKNOWN
```

---

# 8. INVENTORY QUANTITIES

هذا قسم حرج.

يجب تحديد **كل كمية مرتبطة بالمخزون**.

لا يكفي البحث عن عمود اسمه:

```text
quantity
```

بل يجب البحث عن جميع الأسماء التي قد تمثل كمية، مثل:

```text
qty
quantity
stock
available
reserved
loaded
delivered
returned
damaged
opening
closing
counted
system
physical
```

ويجب تسجيل:

| Quantity | Table | Column | Meaning | Changed By | Confidence |
| -------- | ----- | ------ | ------- | ---------- | ---------- |

---

# 9. SIX QUANTITIES MODEL

رؤية الروائع تتضمن مفهوم **6 كميات**.

يجب التعامل معه كـ **مفهوم معماري موجود مسبقًا**، وليس إعادة اختراعه.

لكن يجب إثبات التطبيق الفعلي لكل كمية.

استخدم:

| Quantity # | Business Name | Actual Column/Table | Meaning | Increase Events | Decrease Events | Confidence |
| ---------- | ------------- | ------------------- | ------- | --------------- | --------------- | ---------- |
| 1          | UNKNOWN       | UNKNOWN             | UNKNOWN | UNKNOWN         | UNKNOWN         | UNKNOWN    |
| 2          | UNKNOWN       | UNKNOWN             | UNKNOWN | UNKNOWN         | UNKNOWN         | UNKNOWN    |
| 3          | UNKNOWN       | UNKNOWN             | UNKNOWN | UNKNOWN         | UNKNOWN         | UNKNOWN    |
| 4          | UNKNOWN       | UNKNOWN             | UNKNOWN | UNKNOWN         | UNKNOWN         | UNKNOWN    |
| 5          | UNKNOWN       | UNKNOWN             | UNKNOWN | UNKNOWN         | UNKNOWN         | UNKNOWN    |
| 6          | UNKNOWN       | UNKNOWN             | UNKNOWN | UNKNOWN         | UNKNOWN         | UNKNOWN    |

**ممنوع تخمين أسماء أو معاني الكميات الستة من الذاكرة إذا لم يكن الدليل الحالي مثبتًا.**

---

# 10. INVENTORY LOCATIONS

يجب تحديد مفهوم المكان الفعلي للمخزون.

هل يوجد:

```text
Company
 └── Branch
      └── Warehouse
           └── Location
```

أم نموذج مختلف؟

ويجب تحديد مكان مخزون السيارة:

```text
Warehouse
     ↓
Vehicle / Van
```

هل السيارة:

* Location؟
* Temporary warehouse؟
* Inventory bucket؟
* مجرد reference؟

لا يتم الإجابة إلا بالدليل.

---

# 11. INVENTORY MOVEMENT MODEL

يجب اكتشاف جميع الحركات الفعلية التي تؤثر على المخزون.

على الأقل ابحث عن:

```text
Purchase
Purchase Receipt
Sale
Sale Return
Purchase Return
Transfer
Load
Unload
Adjustment
Inventory Count
Opening Balance
Damage
Loss
Correction
```

ثم أنشئ:

| Event | Writer Function | Tables Written | Quantity Changed | From | To | Accounting Impact |
| ----- | --------------- | -------------- | ---------------- | ---- | -- | ----------------- |

---

# 12. INVENTORY STATE TRANSITION MAP

لكل حركة يجب تحديد:

```text
BEFORE
  ↓
EVENT
  ↓
WRITER
  ↓
TABLE CHANGE
  ↓
AFTER
```

مثال فقط على الشكل:

```text
Warehouse Stock
      ↓
LOAD
      ↓
Load Function
      ↓
Warehouse quantity decreases
Vehicle quantity increases
```

**هذا المثال ليس إثباتًا لسلوك النظام.**

يجب استبداله بالسلوك الفعلي.

---

# 13. INVENTORY WRITERS

هذا القسم من أخطر أجزاء الـ Sprint.

يجب استخراج **كل Function أو Application أو Trigger أو SQL path يكتب على Inventory state**.

لكل Writer:

| Writer | Type | Tables | Columns | Operation | Caller | Business Event | Confidence |
| ------ | ---- | ------ | ------- | --------- | ------ | -------------- | ---------- |

والـ Type يكون:

```text
EDGE_FUNCTION
TRIGGER
RPC
DIRECT_SQL
APPLICATION
UNKNOWN
```

---

# 14. INVENTORY READERS

بعد تحديد Writers، يتم تحديد Readers.

ابحث عن:

* Edge Functions.
* PWA applications.
* Reports.
* RPCs.
* SQL views.
* dashboards.
* accounting functions.
* ledger functions.
* warehouse screens.
* sales screens.
* purchasing screens.
* delivery screens.

لكل Reader:

| Reader | Source | Columns Used | Purpose | Domain | Confidence |
| ------ | ------ | ------------ | ------- | ------ | ---------- |

---

# 15. INVENTORY EDGE FUNCTIONS

لا نعيد فحص كل Edge Functions التي تم الانتهاء من فحصها سابقًا.

نستخدم نتائج الـ Batch Reviews السابقة كـ baseline.

المطلوب هنا فقط:

> استخراج Functions المرتبطة فعليًا بـ Inventory.

لكل Function:

```text
Name
Purpose
Reads
Writes
Called By
Calls
Business Event
Inventory Impact
Accounting Impact
Known Issues
```

---

# 16. INVENTORY APPLICATION CONSUMERS

حدد التطبيقات التي تعتمد على Inventory.

على الأقل:

```text
Warehouse
Store
POS
Sales
Purchasing
Van Sales
Delivery
Runsheet
Admin
Reports
Accounting
```

لكن لا تفترض أن جميعها تستخدم Inventory فعليًا.

كل علاقة يجب إثباتها.

---

# 17. SALES → INVENTORY

يجب رسم التدفق الحقيقي:

```text
Order
   ↓
Sale
   ↓
?
   ↓
Inventory
```

ويجب تحديد:

* متى يتم خصم المخزون؟
* من يقوم بالخصم؟
* هل يتم الحجز؟
* هل يتم الخصم عند Order أم Invoice أم Delivery؟
* كيف يتم التعامل مع Cancel؟
* كيف يتم التعامل مع Return؟

إذا كانت الإجابة غير مثبتة:

```text
UNKNOWN
```

---

# 18. PURCHASING → INVENTORY

يجب تحديد:

```text
Purchase Order
      ↓
Receiving
      ↓
Inventory
```

والإجابة عن:

* متى تدخل الكمية؟
* من يكتبها؟
* هل الـ PO يغير المخزون؟
* هل Receiving هو الحدث؟
* هل Invoice يغير المخزون؟
* كيف تدخل التكلفة؟

---

# 19. RETURNS → INVENTORY

يجب فصل:

```text
Sales Return
Purchase Return
```

وتحديد:

```text
From
To
Quantity
Condition
Cost
Accounting
Ledger
```

---

# 20. WAREHOUSE → INVENTORY

يجب تحديد:

* Stock receiving.
* Internal transfer.
* Picking.
* Loading.
* Counting.
* Adjustment.

ومعرفة ما إذا كانت كل هذه العمليات تمر من خلال نفس Inventory mechanism أم توجد عدة آليات.

---

# 21. VAN SALES → INVENTORY

يجب تحديد الحقيقة الفعلية للنموذج:

```text
Warehouse
   ↓
Loading
   ↓
Van Inventory
   ↓
Field Sale
   ↓
Return
   ↓
Unloading
```

لكل انتقال:

```text
Writer
Source
Destination
Quantity
Reference
```

---

# 22. LOADING

يجب تحديد:

* مصدر المخزون.
* وجهة المخزون.
* لحظة تسجيل الحركة.
* هل التحميل نهائي؟
* هل يمكن إلغاؤه؟
* هل يمكن تعديل الكمية؟
* هل يتم إنشاء حركة Inventory؟
* هل يتم إنشاء Accounting entry؟

---

# 23. UNLOADING

يجب تحديد العكس بدقة:

```text
Van
 ↓
Unload
 ↓
Warehouse
```

لكن يجب عدم افتراض أن هذه هي الحقيقة.

ابحث عن التنفيذ الفعلي.

---

# 24. RUNSHEET

يجب تحديد علاقة:

```text
Runsheet
    ↓
Driver
    ↓
Vehicle
    ↓
Load
    ↓
Delivery
    ↓
Return
    ↓
Unload
```

وتحديد ما إذا كان Runsheet نفسه يملك Inventory state أم أنه مجرد orchestration entity.

---

# 25. INVENTORY COUNT

يجب تحديد:

```text
System Quantity
      ↓
Physical Count
      ↓
Difference
      ↓
Adjustment
```

والسؤال الأساسي:

> أين تصبح نتيجة الجرد مصدرًا رسميًا للحقيقة؟

---

# 26. ADJUSTMENTS

يجب تحديد جميع أنواع Adjustment.

لكل Adjustment:

* سبب.
* Writer.
* Authorization.
* Quantity impact.
* Cost impact.
* Accounting impact.
* Audit impact.

---

# 27. INVENTORY → ACCOUNTING

يجب تحديد نقاط الاتصال مع Accounting.

خصوصًا:

```text
Inventory Receipt
Inventory Issue
COGS
Returns
Adjustments
```

ويجب تحديد هل Inventory نفسه ينشئ Journal Entry أم Accounting Domain يستقبل Event.

هذه نقطة معمارية مهمة جدًا.

---

# 28. SOURCE OF TRUTH MATRIX

هذا هو أهم مخرج في INV-001.

يجب إنتاج Matrix بهذا الشكل:

| Concept         | Current Source of Truth | Secondary Sources | Writers | Readers | Status |
| --------------- | ----------------------- | ----------------- | ------- | ------- | ------ |
| Product         | ?                       | ?                 | ?       | ?       | ?      |
| Current Stock   | ?                       | ?                 | ?       | ?       | ?      |
| Stock Movement  | ?                       | ?                 | ?       | ?       | ?      |
| Warehouse Stock | ?                       | ?                 | ?       | ?       | ?      |
| Van Stock       | ?                       | ?                 | ?       | ?       | ?      |
| Cost            | ?                       | ?                 | ?       | ?       | ?      |
| COGS            | ?                       | ?                 | ?       | ?       | ?      |
| Count           | ?                       | ?                 | ?       | ?       | ?      |
| Adjustment      | ?                       | ?                 | ?       | ?       | ?      |

---

# 29. DUPLICATE TRUTH DETECTION

ابحث عن الحالات التالية:

```text
Table A says stock = 100
Table B says stock = 95
Function C calculates stock = 98
```

أو:

```text
Inventory quantity
+
Sales quantity
+
Warehouse quantity
```

وكل واحد يتصرف وكأنه الحقيقة.

هذه الحالات يجب تسجيلها تحت:

```text
CONTRADICTIONS
```

وليس إصلاحها أثناء INV-001.

---

# 30. LEGACY INVENTORY LOGIC

كل Logic قديم يجب تصنيفه:

```text
ACTIVE
LEGACY-BUT-USED
LEGACY-UNUSED
DUPLICATE
CONFLICTING
UNKNOWN
```

ممنوع الحذف في هذا Sprint.

---

# 31. DATABASE CONSTRAINTS

يجب استخدام نتائج فحص قاعدة البيانات السابقة.

لا تعيد إرسال نتائج Schema التي تم الحصول عليها بالفعل.

لكن عند الحاجة يجب ربطها بالـ Inventory Domain.

خصوصًا:

* Primary Keys.
* Foreign Keys.
* Unique constraints.
* Check constraints.
* Indexes.

الهدف ليس تكرار تقرير قاعدة البيانات.

الهدف هو معرفة تأثير القيود على Inventory.

---

# 32. SECURITY

يجب تحديد:

* RLS على Inventory tables.
* Company isolation.
* Branch isolation.
* User roles.
* Service-role access.
* Edge Function privileged writes.

السؤال:

> من يستطيع تغيير المخزون؟

يجب أن تكون له إجابة مثبتة.

---

# 33. AUDITABILITY

يجب تحديد هل كل Inventory change يمكن تتبعه إلى:

```text
WHO
WHEN
WHAT
WHY
REFERENCE
BEFORE
AFTER
```

وإذا لم يكن ذلك ممكنًا حاليًا، يسجل كـ Gap.

لا يتم إصلاحه تلقائيًا في INV-001.

---

# 34. RECONCILIATION CHECK

يجب البحث عن إمكانية التحقق من:

```text
Opening
+
Increases
-
Decreases
=
Closing
```

إذا كان النموذج الحالي مختلفًا، يتم توثيق النموذج الفعلي.

---

# 35. INVENTORY RISKS

يجب تصنيف المخاطر:

### P0

قد تؤدي إلى:

* فساد المخزون.
* فساد التكلفة.
* اختلاف أرصدة الشركات.
* فقدان حركات المخزون.
* Duplicate writes.

### P1

تؤثر على:

* العمليات.
* التقارير.
* التسويات.

### P2

تحسينات أو Technical Debt.

---

# 36. ممنوعات INV-001

خلال هذا Sprint:

**ممنوع تنفيذ:**

* Inventory rewrite.
* Schema redesign.
* حذف Tables.
* حذف Functions.
* تغيير RLS.
* Migration واسعة.
* تغيير Business Rules.
* تغيير Accounting.
* تغيير Sales.
* تغيير Van Sales.

إلا إذا كان هناك سبب ضروري لحماية النظام أثناء الفحص، ويجب توثيقه.

---

# 37. REQUIRED FILE OUTPUT

يجب أن ينتج المساعد الملف:

```text
architecture/inventory/INV-001_INVENTORY_REALITY_MAP.md
```

ويمكن إضافة ملفات Supporting إذا احتاج التنفيذ، مثل:

```text
architecture/inventory/
├── INV-001_INVENTORY_REALITY_MAP.md
├── INV-001_SOURCE_OF_TRUTH.md
├── INV-001_MOVEMENT_MAP.md
└── INV-001_WRITERS_READERS.md
```

لكن لا يتم إنشاء ملفات إضافية لمجرد زيادة التوثيق.

---

# 38. REQUIRED EXECUTION REPORT

في نهاية Sprint يجب أن يرسل المساعد تقريرًا مختصرًا يحتوي:

```text
SPRINT
INV-001

STATUS
PASS / BLOCKED

CONFIRMED
...

UNKNOWN
...

CONFLICTS
...

INVENTORY WRITERS
...

INVENTORY READERS
...

SOURCE OF TRUTH
...

CRITICAL RISKS
...

FILES CHANGED
...

CODE CHANGED
YES / NO

DATABASE CHANGED
YES / NO

ROLLBACK REQUIRED
YES / NO

READY FOR INV-002
YES / NO
```

---

# 39. INV-001 EXIT GATE

لا يعتبر Sprint مكتملًا إلا إذا أصبح لدينا:

```text
[ ] Inventory entities mapped
[ ] Inventory tables mapped
[ ] Quantities mapped
[ ] Six-quantity model mapped
[ ] Locations mapped
[ ] Movements mapped
[ ] Writers mapped
[ ] Readers mapped
[ ] Edge Functions mapped
[ ] Application consumers mapped
[ ] Sales relationship mapped
[ ] Purchasing relationship mapped
[ ] Returns relationship mapped
[ ] Warehouse relationship mapped
[ ] Van relationship mapped
[ ] Loading mapped
[ ] Unloading mapped
[ ] Runsheet relationship mapped
[ ] Count mapped
[ ] Adjustments mapped
[ ] Accounting relationship mapped
[ ] Source-of-truth matrix completed
[ ] Contradictions listed
[ ] Unknowns listed
[ ] Security boundaries identified
[ ] Critical risks identified
[ ] No destructive changes performed
```

---

# 40. INV-002 ENTRY CONDITION

لا يبدأ:

```text
INV-002 — Inventory Source of Truth
```

إلا بعد أن نستطيع الإجابة بثقة عن:

> **أين توجد الحقيقة الحالية للمخزون؟**

و:

> **من يستطيع تغييرها؟**

و:

> **ما الأحداث التي تغيرها؟**

و:

> **ما الأنظمة التي تعتمد عليها؟**

إذا لم نستطع الإجابة، يبقى INV-001 مفتوحًا.

---

# 41. EXECUTIVE RULE

المساعد التنفيذي يجب أن يتعامل مع هذا الـ Sprint كالتالي:

```text
DO NOT DESIGN
       ↓
DO NOT GUESS
       ↓
DO NOT REBUILD
       ↓
MAP REALITY
       ↓
PROVE SOURCES
       ↓
IDENTIFY CONFLICTS
       ↓
IDENTIFY GAPS
       ↓
STOP
       ↓
REPORT
```

---

# 42. FINAL PRINCIPLE

`INV-001` لا يبني Inventory Engine.

إنه يحدد **الحقيقة التي سيُبنى عليها Inventory Engine**.

وهذا الفرق جوهري.

إذا كانت الخريطة خاطئة، فكل ما بعدها سيكون خاطئًا.

أما إذا كانت الخريطة صحيحة، فإن:

```text
INV-002
    ↓
INV-003
    ↓
INV-004
    ↓
INV-005
    ↓
INV-006
```

يمكن تنفيذها تدريجيًا وبأقل مخاطرة ممكنة.

**Inventory Reality أولًا.
Architecture ثانيًا.
Implementation بعد إثبات الحقيقة.**
