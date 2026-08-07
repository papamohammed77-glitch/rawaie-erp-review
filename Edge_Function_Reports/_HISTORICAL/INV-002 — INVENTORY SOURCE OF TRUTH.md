# RAWAEA ERP

# INV-002 — INVENTORY SOURCE OF TRUTH

**Phase:** 3 — Immediate Domain Execution
**Domain:** Inventory
**Sprint:** INV-002
**Priority:** P0
**Status:** EXECUTION
**Previous Sprint:** `INV-001 — Inventory Reality Map`

---

# 1. PURPOSE

الغرض من `INV-002` هو الانتقال من:

> **معرفة كيف يعمل Inventory فعليًا**

إلى:

> **تحديد أين توجد الحقيقة الرسمية للمخزون، وما الذي يُعتبر مصدرًا للحقيقة وما الذي يُعتبر مشتقًا منها.**

هذه الوثيقة لا تعيد فحص النظام من الصفر.

بل تعتمد على:

* نتائج فحص قاعدة البيانات التي تم إنجازها.
* نتائج فحص Edge Functions السابقة.
* تقارير الـ Batches السابقة.
* `RAWAEA_ARCHITECTURE_CONSTITUTION.md`
* `EXECUTION_PROTOCOL.md`
* `DOMAIN_EXECUTION_ORDER.md`
* `INV-001 — Inventory Reality Map`
* أي وثائق معمارية أخرى موجودة تحت `/architecture`.

---

# 2. CORE PRINCIPLE

## ONE INVENTORY TRUTH

الهدف النهائي ليس أن يكون لدينا عدة جداول تستطيع جميعًا الادعاء بأنها تمثل المخزون.

الهدف هو تحديد:

```text
ONE AUTHORITATIVE INVENTORY TRUTH
```

ثم:

```text
Derived Data
Reports
Caches
Views
Summaries
UI State
```

تكون تابعة لهذه الحقيقة ولا تنافسها.

---

# 3. WHAT THIS SPRINT IS NOT

هذا الـ Sprint ليس:

* إعادة تصميم Inventory Engine.
* إنشاء جدول جديد للمخزون لمجرد أنه يبدو أفضل.
* حذف Legacy Tables.
* إعادة كتابة Edge Functions.
* تعديل Business Rules.
* تغيير Accounting.
* تغيير Sales.
* تغيير Purchasing.
* Migration واسعة.

نحن الآن **نحدد الحقيقة** قبل لمس التنفيذ.

---

# 4. INPUTS

يجب على المساعد قراءة واستخدام جميع الوثائق السابقة ذات الصلة.

القاعدة:

> **أي شيء تم إثباته سابقًا لا يُعاد إثباته إلا إذا ظهر تعارض جديد.**

إذا كانت معلومة موجودة في تقرير سابق:

```text
USE IT
```

ولا:

```text
RE-CHECK IT
```

إلا إذا كان هناك دليل جديد يناقضها.

---

# 5. SOURCE OF TRUTH DEFINITION

يجب تعريف Source of Truth للمخزون وفق المعنى التالي:

> الكيان أو مجموعة البيانات التي تمثل الحالة الرسمية التي يجب أن تعتمد عليها بقية Domains عند معرفة الرصيد الحالي للمخزون.

ويجب الفصل بين:

### Current State

الحالة الحالية.

### Transaction History

الأحداث التي أدت إلى الحالة.

### Derived State

حالة محسوبة من مصادر أخرى.

### Cache

نسخة لتحسين الأداء.

### Reporting Data

بيانات مخصصة للعرض والتحليل.

### Legacy Data

بيانات قديمة لا يجوز اعتبارها حقيقة دون إثبات.

---

# 6. SOURCE OF TRUTH CATEGORIES

يجب تصنيف كل جدول/عمود مرتبط بالمخزون إلى:

```text
AUTHORITATIVE
TRANSACTIONAL
DERIVED
CACHE
REPORTING
LEGACY
SUPPORTING
UNKNOWN
CONFLICTING
```

---

# 7. MASTER SOURCE-OF-TRUTH MATRIX

يجب إنشاء Matrix نهائية:

| Inventory Concept  | Physical Source | Authoritative? | Derived? | Legacy? | Writers | Readers | Confidence |
| ------------------ | --------------- | -------------: | -------: | ------: | ------- | ------- | ---------- |
| Product            | ?               |              ? |        ? |       ? | ?       | ?       | ?          |
| Current Stock      | ?               |              ? |        ? |       ? | ?       | ?       | ?          |
| Warehouse Stock    | ?               |              ? |        ? |       ? | ?       | ?       | ?          |
| Branch Stock       | ?               |              ? |        ? |       ? | ?       | ?       | ?          |
| Van Stock          | ?               |              ? |        ? |       ? | ?       | ?       | ?          |
| Available Quantity | ?               |              ? |        ? |       ? | ?       | ?       | ?          |
| Reserved Quantity  | ?               |              ? |        ? |       ? | ?       | ?       | ?          |
| Loaded Quantity    | ?               |              ? |        ? |       ? | ?       | ?       | ?          |
| Returned Quantity  | ?               |              ? |        ? |       ? | ?       | ?       | ?          |
| Damaged Quantity   | ?               |              ? |        ? |       ? | ?       | ?       | ?          |
| Inventory Movement | ?               |              ? |        ? |       ? | ?       | ?       | ?          |
| Inventory Count    | ?               |              ? |        ? |       ? | ?       | ?       | ?          |
| Adjustment         | ?               |              ? |        ? |       ? | ?       | ?       | ?          |
| Cost               | ?               |              ? |        ? |       ? | ?       | ?       | ?          |
| COGS Basis         | ?               |              ? |        ? |       ? | ?       | ?       | ?          |

````

---

# 8. CURRENT INVENTORY STATE

هذا هو السؤال الرئيسي في INV-002:

> **إذا طلبنا من النظام الآن: "كم رصيد هذا المنتج؟" فمن أين تأتي الإجابة؟**

يجب تحديد المسار الفعلي:

```text
User / Application
        ↓
Function / RPC / Query
        ↓
Table / View
        ↓
Column(s)
        ↓
Current Inventory Quantity
````

ويجب تحديد ما إذا كانت الكمية:

```text
STORED
```

أم:

```text
CALCULATED
```

أم:

```text
MIXED
```

---

# 9. STORED VS CALCULATED INVENTORY

لكل Quantity يجب تحديد:

| Quantity      | Stored? | Calculated? | Formula | Source | Confidence |
| ------------- | ------: | ----------: | ------- | ------ | ---------- |
| Current Stock |       ? |           ? | ?       | ?      | ?          |
| Available     |       ? |           ? | ?       | ?      | ?          |
| Reserved      |       ? |           ? | ?       | ?      | ?          |
| Loaded        |       ? |           ? | ?       | ?      | ?          |
| Returned      |       ? |           ? | ?       | ?      | ?          |
| Damaged       |       ? |           ? | ?       | ?      | ?          |

لا يجوز اعتبار كمية مخزنة في جدول ما "مصدر حقيقة" لمجرد أنها موجودة.

---

# 10. INVENTORY TRANSACTION TRUTH

يجب تحديد ما إذا كان Transaction History نفسه:

```text
SOURCE OF TRUTH
```

أم أنه مجرد سجل Audit/History.

مثلاً:

```text
Inventory Movements
        ↓
SUM(Movements)
        ↓
Current Stock
```

أو:

```text
Current Stock
        +
Inventory Movements
```

أو نموذج آخر.

لا يتم اختيار النموذج نظريًا.

يتم توثيق الموجود.

---

# 11. MOVEMENT AUTHORITY

لكل Movement Type:

| Movement         | Authoritative Record | Quantity Effect | Source | Destination | Writer |
| ---------------- | -------------------- | --------------- | ------ | ----------- | ------ |
| Purchase Receipt | ?                    | ?               | ?      | ?           | ?      |
| Sale             | ?                    | ?               | ?      | ?           | ?      |
| Sales Return     | ?                    | ?               | ?      | ?           | ?      |
| Purchase Return  | ?                    | ?               | ?      | ?           | ?      |
| Transfer         | ?                    | ?               | ?      | ?           | ?      |
| Load             | ?                    | ?               | ?      | ?           | ?      |
| Unload           | ?                    | ?               | ?      | ?           | ?      |
| Adjustment       | ?                    | ?               | ?      | ?           | ?      |
| Count Adjustment | ?                    | ?               | ?      | ?           | ?      |

---

# 12. WRITER AUTHORITY

يجب تحديد كل جهة تستطيع تغيير Inventory State.

تصنيفها:

```text
PRIMARY WRITER
SECONDARY WRITER
LEGACY WRITER
INDIRECT WRITER
UNKNOWN WRITER
```

لكل Writer:

| Writer | Event | Table | Columns | Direct/Indirect | Authority |
| ------ | ----- | ----- | ------- | --------------- | --------- |

---

# 13. MULTIPLE WRITERS DETECTION

هذا القسم شديد الخطورة.

يجب اكتشاف الحالات التي يوجد فيها:

```text
Function A → writes stock
Function B → writes stock
Function C → writes stock
Application D → writes stock directly
Trigger E → modifies stock
```

إذا كان أكثر من Writer يغير نفس الحقيقة:

يجب تحديد:

1. هل هذا مقصود؟
2. هل كل Writer يملك Event مختلفًا؟
3. هل هناك Duplicate Business Logic؟
4. هل هناك احتمال Double Mutation؟
5. هل يوجد Writer يتجاوز الـ Domain boundary؟

لا يتم الإصلاح هنا.

يتم تسجيل المشكلة.

---

# 14. DIRECT SQL WRITES

يجب البحث تحديدًا عن أي Application أو Function يقوم بـ:

```text
INSERT
UPDATE
DELETE
```

على Inventory state مباشرة.

ويجب تمييز:

```text
Allowed
Legacy
Dangerous
Unknown
```

الهدف:

> معرفة هل Inventory mutation مركزي أم موزع.

---

# 15. EDGE FUNCTION WRITE MATRIX

استخدم نتائج Batch Reviews السابقة.

لا تعيد مراجعة الـ Functions التي تم تحليلها إلا عند وجود تعارض.

أنشئ:

| Edge Function | Reads Inventory | Writes Inventory | Mutation Type | Called By | Authority |
| ------------- | --------------: | ---------------: | ------------- | --------- | --------- |
| ?             |          YES/NO |           YES/NO | ?             | ?         | ?         |

ثم:

## Primary Inventory Writers

قائمة منفصلة.

## Read-Only Inventory Functions

قائمة منفصلة.

## Mixed Read/Write Functions

قائمة منفصلة.

---

# 16. READ-ONLY FUNCTIONS

يجب فصل Functions التي:

* تقرأ Inventory فقط.
* تحسب تقارير.
* تعرض Availability.
* تستخرج Stock Reports.

هذه لا تعتبر مصادر حقيقة.

لكنها تعتبر **Consumers** للحقيقة.

---

# 17. REPORTING DEPENDENCIES

يجب تحديد التقارير التي تعتمد على Inventory.

مثل:

```text
Stock Report
Inventory Valuation
Warehouse Report
Van Stock Report
Slow Moving
Fast Moving
Inventory Count
COGS Report
Sales Availability
Purchase Planning
```

ولكن لا تفترض وجودها.

يتم إدراج ما هو موجود فعليًا فقط.

---

# 18. VIEW / RPC / QUERY DEPENDENCIES

يجب تحديد:

```text
Views
Materialized Views
RPCs
Stored Procedures
SQL Functions
```

التي تعتمد على Inventory.

لكل واحد:

| Object | Reads | Writes | Derived? | Used By |
| ------ | ----- | ------ | -------- | ------- |

---

# 19. CACHE DETECTION

إذا كان هناك Cache للمخزون:

يجب تحديد:

```text
Primary Truth
      ↓
Cache
```

ومعرفة:

* متى يتم تحديث Cache؟
* من يحدثه؟
* هل يمكن أن يصبح Stale؟
* هل تستخدم التطبيقات Cache بدل المصدر؟
* هل توجد آلية Invalidation؟

---

# 20. VAN INVENTORY SOURCE

يجب تحديد Source of Truth لمخزون السيارة تحديدًا.

لا يجوز افتراض أن:

```text
Van = Warehouse
```

ولا:

```text
Van = Driver
```

ولا:

```text
Runsheet = Inventory
```

بل يجب إثبات:

```text
Van Inventory Source
```

ثم:

```text
Load
Sale
Return
Unload
Settlement
```

وعلاقتها به.

---

# 21. BRANCH INVENTORY SOURCE

بناءً على العلاقة:

```text
Company
   ↓
Branch
```

يجب تحديد هل المخزون:

```text
Company-level
Branch-level
Warehouse-level
Location-level
Mixed
```

وما هو المفتاح الذي يفصل المخزون بين الشركات.

---

# 22. COMPANY ISOLATION

يجب إثبات أن Inventory لا يختلط بين:

```text
Company A
Company B
```

ويجب تحديد:

```text
company_id
```

أو أي mechanism آخر فعلي.

---

# 23. SIX QUANTITIES — SOURCE OF TRUTH

بعد خريطة INV-001، يجب الآن الانتقال من مجرد تعريف الكميات إلى:

> أين توجد كل كمية من الكميات الستة فعليًا؟

Matrix:

| Quantity | Current Source | Stored/Derived | Writer | Reader | Authoritative |
| -------- | -------------- | -------------- | ------ | ------ | ------------- |
| Q1       | ?              | ?              | ?      | ?      | ?             |
| Q2       | ?              | ?              | ?      | ?      | ?             |
| Q3       | ?              | ?              | ?      | ?      | ?             |
| Q4       | ?              | ?              | ?      | ?      | ?             |
| Q5       | ?              | ?              | ?      | ?      | ?             |
| Q6       | ?              | ?              | ?      | ?      | ?             |

إذا كان أحدها غير واضح:

```text
UNKNOWN
```

وليس تخمينًا.

---

# 24. SOURCE OF TRUTH CONFLICTS

يجب اكتشاف الحالات التالية:

### Conflict A

جدولان يمثلان Current Stock.

### Conflict B

Function يحسب Quantity بطريقة مختلفة عن Table.

### Conflict C

Report يستخدم مصدرًا مختلفًا عن Application.

### Conflict D

Van Stock له أكثر من مصدر.

### Conflict E

Sales وWarehouse يعتمدان على مصدرين مختلفين.

### Conflict F

Accounting/COGS يستخدم Quantity أو Cost من مصدر مختلف.

كل Conflict يحصل على:

```text
ID
Description
Sources
Evidence
Impact
Severity
```

---

# 25. SOURCE OF TRUTH DECISION

في نهاية التحليل يجب تصنيف كل مفهوم إلى:

```text
CONFIRMED SINGLE SOURCE
CONFIRMED MULTIPLE SOURCES
DERIVED FROM CONFIRMED SOURCE
LEGACY SOURCE
CONFLICTED
UNKNOWN
```

---

# 26. WHAT WE ARE ALLOWED TO CHANGE

في INV-002:

**لا يتم تغيير Production behavior لمجرد اكتشاف مشكلة.**

إذا اكتشفنا:

```text
Multiple Truth
```

فلا نحذف أحدها.

إذا اكتشفنا:

```text
Duplicate Writer
```

فلا نحذف Function.

إذا اكتشفنا:

```text
Wrong Source
```

فلا نغيره مباشرة.

يتم تسجيله كـ:

```text
SOURCE_OF_TRUTH_VIOLATION
```

ليتم علاجه في Sprint التنفيذ المناسب.

---

# 27. ARCHITECTURAL TARGET

يجب أن تنتهي الوثيقة بتعريف:

```text
CURRENT REALITY
        ↓
TARGET AUTHORITY
```

لكن:

> Target Authority يجب أن تكون مستمدة من الدستور المعماري ونتائج الفحص، وليست تصميمًا منفصلًا عن الواقع.

الهدف المستقبلي هو الوصول إلى:

```text
One Inventory Domain Authority
```

بحيث تكون mutations محكومة ومعلومة المصدر.

---

# 28. INVENTORY DOMAIN BOUNDARY

يجب تحديد الحدود:

```text
Inventory owns:
    Stock State
    Inventory Movements
    Inventory Availability
    Inventory Adjustments
    Inventory Counts
```

لكن لا يتم افتراض أن هذا هو التنفيذ الحالي.

يجب فصل:

```text
CURRENT IMPLEMENTATION
```

عن:

```text
TARGET DOMAIN RESPONSIBILITY
```

---

# 29. CROSS-DOMAIN BOUNDARIES

يجب توثيق العلاقة مع:

```text
Sales
Purchasing
Accounting
Ledger
Delivery
Runsheet
AI
```

والقاعدة:

> Domain آخر لا يجب أن يمتلك Inventory Truth.

بل يرسل Event أو يستدعي Domain API وفق المعمارية المستهدفة.

---

# 30. INVENTORY → ACCOUNTING

يجب تسجيل:

```text
Inventory Event
       ↓
Accounting Event
```

وليس:

```text
Accounting modifies Inventory
```

إلا إذا كان هذا موجودًا فعليًا، وفي هذه الحالة يسجل كـ violation أو legacy behavior.

---

# 31. INVENTORY → LEDGER

Ledger ليس مصدر Inventory.

لكن يجب تحديد أي بيانات Inventory تؤثر في:

```text
Customer Ledger
Supplier Ledger
Driver Ledger
```

ويتم توثيق العلاقة دون نقل مسؤولية Inventory إلى Ledger.

---

# 32. INVENTORY → AI

لا يتم بناء AI في INV-002.

لكن يجب تحديد:

```text
AI future consumers
```

مثل:

```text
Slow Moving
Stock Risk
Demand
Seasonality
Reorder
Profitability
Inventory Capital Lock
```

والقاعدة:

> AI يقرأ Inventory Truth ولا يصبح مصدر الحقيقة.

---

# 33. REQUIRED DOCUMENT

يجب إنشاء:

```text
architecture/inventory/INV-002_INVENTORY_SOURCE_OF_TRUTH.md
```

ويجب أن تحتوي الوثيقة على:

```text
1. Current Source of Truth
2. Quantity Sources
3. Movement Sources
4. Writer Authority
5. Reader Map
6. Edge Function Matrix
7. Application Consumers
8. Reports
9. Views / RPCs
10. Cache
11. Van Inventory
12. Branch Inventory
13. Company Isolation
14. Six Quantities Source Map
15. Conflicts
16. Violations
17. Target Authority
18. Cross-Domain Boundaries
19. Unknowns
20. INV-003 Entry Gate
```

---

# 34. INV-002 EXIT GATE

لا يعتبر INV-002 مكتملًا إلا إذا أصبح لدينا جواب واضح عن:

### السؤال الأول

> ما هو مصدر الحقيقة الحالي لـ Current Inventory؟

### السؤال الثاني

> أين توجد كل كمية من الكميات الست؟

### السؤال الثالث

> ما هي الـ Writers الحقيقية؟

### السؤال الرابع

> ما هي الـ Readers؟

### السؤال الخامس

> ما هي الـ Tables التي تمثل الحقيقة؟

### السؤال السادس

> ما هي Tables المشتقة أو التاريخية أو Legacy؟

### السؤال السابع

> أين توجد مصادر حقيقة متعددة؟

### السؤال الثامن

> ما هي أخطر الانحرافات؟

---

# 35. INV-003 ENTRY GATE

بعد إغلاق INV-002، ننتقل إلى:

```text
INV-003
```

ولا يتم الانتقال إلا بعد إثبات:

```text
CURRENT SOURCE OF TRUTH
        +
TARGET SOURCE OF TRUTH
        +
WRITER AUTHORITY
        +
MOVEMENT AUTHORITY
        +
CROSS-DOMAIN BOUNDARY
```

---

# 36. EXECUTION MODEL

المساعد يجب أن يعمل بهذا التسلسل:

```text
READ ALL EXISTING EVIDENCE
            ↓
READ INV-001
            ↓
REUSE COMPLETED FINDINGS
            ↓
BUILD SOURCE-OF-TRUTH MATRIX
            ↓
MAP WRITERS
            ↓
MAP READERS
            ↓
MAP MOVEMENTS
            ↓
MAP SIX QUANTITIES
            ↓
DETECT CONFLICTS
            ↓
CLASSIFY VIOLATIONS
            ↓
DEFINE TARGET AUTHORITY
            ↓
STOP
            ↓
REPORT
```

---

# 37. ABSOLUTE PROHIBITION

المساعد ممنوع من قول:

> "أعتقد أن هذا الجدول هو مصدر الحقيقة."

الصيغة الصحيحة:

> "الأدلة التالية تشير إلى أن هذا الجدول هو مصدر الحقيقة."

أو:

> "لا توجد أدلة كافية لإثبات مصدر الحقيقة."

---

# 38. FINAL PRINCIPLE

`INV-001` أجاب:

> **كيف يعمل Inventory الآن؟**

`INV-002` يجب أن يجيب:

> **أين توجد الحقيقة الآن؟**

وبعد ذلك فقط نستطيع الانتقال إلى المرحلة التالية بثقة.

```text
INV-001
Inventory Reality
      ↓
INV-002
Inventory Source of Truth
      ↓
INV-003
[Next Original Inventory Sprint]
      ↓
INV-004
      ↓
INV-005
      ↓
INV-006
      ↓
Inventory Domain Execution
```

**لا نعيد ما تم فحصه.
لا نعيد ما تم إثباته.
لا نبني نظامًا موازيًا.
لا نخمن.
لا نحذف Legacy قبل فهمه.**

**نحن الآن نحدد الحقيقة التي سيُبنى عليها الإصلاح.**
