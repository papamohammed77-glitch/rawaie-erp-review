# RAWAEA ERP

# DOMAIN_EXECUTION_ORDER.md

## دستور ترتيب وتنفيذ Domains — المرحلة الثالثة

**الحالة:** ACTIVE
**المرحلة:** Phase 3 — Immediate Domain Execution
**النطاق:** Inventory → Accounting → Ledger → Sales → Purchasing → Delivery/Runsheet → AI
**طبيعة الوثيقة:** تنفيذية وملزمة
**القاعدة العليا:** إصلاح وتطوير النظام الموجود — وليس بناء نظام ERP جديد من الصفر.

---

# 1. الغرض من هذه الوثيقة

هذه الوثيقة تحدد **الترتيب الإجباري لتنفيذ Domains الروائع** بعد انتهاء مرحلة الفحص والاستكشاف السابقة.

الهدف ليس إنشاء أنظمة منفصلة، وإنما إعادة تنظيم النظام الحالي حول مفهوم:

> **One Core — One Source of Truth — One Transactional Reality**

أي أن كل Domain يجب أن يعمل فوق حقيقة بيانات موحدة، وأن تتغذى الـ Domains من بعضها بطريقة منضبطة، دون إنشاء نسخ متعارضة من نفس الحقيقة.

---

# 2. القرار التنفيذي الأساسي

ترتيب التنفيذ الإجباري هو:

```text
1. INVENTORY
        ↓
2. ACCOUNTING
        ↓
3. LEDGER
        ↓
4. SALES
        ↓
5. PURCHASING
        ↓
6. DELIVERY / RUNSHEET
        ↓
7. AI LAYER
```

**لا يجوز تغيير هذا الترتيب بشكل عشوائي.**

أي تغيير في الترتيب يجب أن يكون له سبب معماري واضح، ويجب أن يتم توثيقه قبل التنفيذ.

---

# 3. لماذا Inventory أولاً؟

Inventory ليس مجرد شاشة مخزون.

هو أحد أهم مصادر الحقيقة في النظام كله.

البيع يعتمد على المخزون.

المشتريات تغير المخزون.

المرتجعات تغير المخزون.

تحميل السيارة يغير موقع المخزون.

التفريغ يعيد المخزون.

الجرد يتحقق من المخزون.

COGS يعتمد على حركة المخزون.

الربحية تعتمد على تكلفة البضاعة.

التقارير التجارية تعتمد على حركة المخزون.

لذلك:

```text
Inventory
    ↓
COGS
    ↓
Accounting
    ↓
Ledgers
    ↓
Sales / Purchasing / Delivery
    ↓
AI
```

إذا تم بناء Accounting أو Sales فوق Inventory غير منضبط، فسيتم تثبيت أخطاء المخزون داخل بقية النظام.

لذلك Inventory هو أول Domain يجب تثبيت حقيقته.

---

# 4. قاعدة مهمة: لا نعيد بناء النظام

هذه المرحلة لا تعني:

```text
Delete old system
        ↓
Build new ERP
```

بل:

```text
Existing RAWAEA System
        ↓
Understand existing behavior
        ↓
Identify authoritative data
        ↓
Preserve valid behavior
        ↓
Repair contradictions
        ↓
Introduce unified domain logic
        ↓
Migrate consumers gradually
```

أي تعديل يجب أن يحترم النظام الموجود ما لم يثبت أن الجزء الحالي يتعارض مع الـ Architecture Constitution.

---

# 5. قاعدة عدم التخمين

المساعد التنفيذي ممنوع من:

* اختراع جدول جديد دون ضرورة.
* اختراع Business Rule غير مثبت.
* تغيير معنى عمود موجود بالافتراض.
* حذف Edge Function لأنها تبدو قديمة فقط.
* إعادة تسمية جدول لمجرد تحسين الاسم.
* تغيير transaction flow دون فهم المستهلكين.
* استبدال Function بدون معرفة جميع الـ callers.
* افتراض أن اسم الجدول يمثل مصدر الحقيقة.
* افتراض أن وجود عمود يعني أنه مستخدم.
* افتراض أن عدم وجود Function يعني عدم وجود Business Logic.
* تنفيذ Migration خطرة دون Backup / Rollback.
* دمج Domainين لمجرد تقليل عدد الملفات.

عند وجود غموض:

```text
UNKNOWN
```

وليس:

```text
ASSUMPTION
```

---

# 6. قاعدة مصدر الحقيقة

لكل مفهوم تجاري يجب تحديد:

```text
SOURCE OF TRUTH
```

قبل تعديل أي Consumer.

مثال:

```text
Product
    ↓
Stock
    ↓
Stock Movement
    ↓
Cost
    ↓
COGS
```

لا يجوز أن يكون:

```text
sales table = stock truth
warehouse table = stock truth
vehicle table = stock truth
ledger table = stock truth
```

في الوقت نفسه لنفس الكيان دون reconciliation واضح.

---

# 7. DOMAIN 1 — INVENTORY

## الهدف

إنشاء/إصلاح Inventory Domain باعتباره المحرك المركزي لحقيقة المخزون.

## الأولويات

### Sprint INV-001 — Inventory Reality Map

تحديد:

* المنتجات.
* الوحدات.
* الكميات.
* مواقع التخزين.
* الفروع.
* المخازن.
* السيارات/Van inventory.
* الحركات.
* التحميل.
* التفريغ.
* البيع.
* المرتجع.
* الجرد.
* التسويات.

الناتج:

```text
Inventory Reality Map
```

---

## Sprint INV-002 — Inventory Source of Truth

تحديد:

* الجدول/الجداول المصدرية.
* الجداول المشتقة.
* الجداول التاريخية.
* الـ Edge Functions التي تغير المخزون.
* الـ Functions التي تقرأ المخزون فقط.
* التقارير التي تعتمد عليه.

لا يبدأ Refactor قبل إتمام هذه الخريطة.

---

## Sprint INV-003 — Movement Model

توحيد مفهوم حركة المخزون:

```text
PURCHASE
SALE
RETURN_IN
RETURN_OUT
TRANSFER
LOAD
UNLOAD
ADJUSTMENT
COUNT_ADJUSTMENT
```

مع تحديد:

* quantity
* direction
* source
* destination
* reference
* timestamp
* user
* company
* branch

بحسب ما تثبته البنية الحالية.

---

## Sprint INV-004 — Six Quantities

تثبيت نموذج الكميات الستة الموجود في رؤية الروائع وعدم إلغائه أو تبسيطه قبل فهمه بالكامل.

يجب تحديد معنى كل كمية، ومتى تتغير، وما إذا كانت:

* Physical
* Available
* Reserved
* Loaded
* Delivered
* Returned

أو غير ذلك بحسب النموذج الفعلي المعتمد في المشروع.

**ممنوع افتراض المعنى النهائي دون الرجوع إلى نتائج الفحص السابقة.**

---

## Sprint INV-005 — Cost Layer

تحديد كيفية انتقال التكلفة عبر:

```text
Purchase
    ↓
Inventory Cost
    ↓
Sale
    ↓
COGS
```

والتعامل مع:

* purchase cost
* adjustments
* returns
* stock valuation
* COGS

وفق النموذج الموجود والمثبت.

---

## Sprint INV-006 — Inventory Engine

بناء/إصلاح المحرك المركزي الذي يجعل عمليات المخزون متسقة.

المبدأ:

```text
Transaction
      ↓
Inventory Engine
      ↓
Stock Movement
      ↓
Current Stock State
      ↓
Accounting / Reports / Ledgers
```

لا يتم السماح لكل تطبيق بإجراء تعديل مستقل على الكميات.

---

## Sprint INV-007 — Consumers Migration

بعد تثبيت المحرك:

* Sales consumers.
* Purchasing consumers.
* Van consumers.
* Warehouse consumers.
* Delivery consumers.
* Reports.

يتم نقلها تدريجيًا إلى Inventory Engine.

**لا يتم كسر النظام دفعة واحدة.**

---

# 8. DOMAIN 2 — ACCOUNTING

بعد تثبيت Inventory ينتقل التنفيذ إلى Accounting.

السبب:

Accounting يحتاج إلى معرفة الحقيقة التشغيلية.

خصوصًا:

```text
Inventory
    ↓
COGS
    ↓
Revenue
    ↓
Returns
    ↓
Adjustments
    ↓
Journal Entries
```

## Sprint ACC-001

تحديد:

* journal_entries
* journal_lines
* accounts
* posting sources

## Sprint ACC-002

تحديد Posting Rules.

كل حدث تجاري يجب أن تكون له قاعدة واضحة:

```text
Business Event
      ↓
Accounting Event
      ↓
Journal Entry
      ↓
Journal Lines
```

## Sprint ACC-003

ربط:

* Sales
* Purchases
* Inventory
* Returns
* Adjustments

بـ Accounting.

## Sprint ACC-004

إيقاف أي Posting مكرر أو متناقض.

---

# 9. DOMAIN 3 — LEDGER

بعد Accounting تأتي طبقة الـ Ledger.

السبب:

Ledger يجب ألا يصبح مصدرًا مستقلًا للحقيقة.

بل يكون انعكاسًا منضبطًا للمعاملات.

```text
Business Transaction
        ↓
Accounting
        ↓
Ledger
```

يشمل:

* Customer Ledger
* Supplier Ledger
* Driver Ledger

مع تحديد ما هو:

```text
source transaction
```

وما هو:

```text
derived ledger record
```

---

# 10. DOMAIN 4 — SALES

بعد تثبيت:

```text
Inventory
Accounting
Ledger
```

يتم إصلاح Sales.

يشمل:

* Orders
* Sales invoices
* POS
* Sales returns
* Customer balances
* Stock deduction
* Revenue posting
* COGS posting

القاعدة:

```text
Sale
 ├── Inventory impact
 ├── Accounting impact
 └── Ledger impact
```

وليس ثلاثة أنظمة منفصلة تحاول تفسير نفس البيع.

---

# 11. DOMAIN 5 — PURCHASING

Purchasing يعتمد مباشرة على Inventory وAccounting.

التدفق المستهدف:

```text
Purchase
    ↓
Receipt
    ↓
Inventory
    ↓
Supplier Payable
    ↓
Accounting
    ↓
Supplier Ledger
```

يشمل:

* Purchase Orders
* Receiving
* Purchase invoices
* Purchase returns
* Supplier balances
* Inventory cost

---

# 12. DOMAIN 6 — DELIVERY / RUNSHEET

هذا Domain تشغيلي متقدم ولذلك يأتي بعد تثبيت الأساس.

يشمل:

* Runsheet
* Driver
* Vehicle / Van
* Loading
* Delivery
* Partial delivery
* Return
* Unloading
* Settlement

التدفق:

```text
Sales / Orders
      ↓
Runsheet
      ↓
Driver / Vehicle
      ↓
Load
      ↓
Field Sales / Delivery
      ↓
Returns
      ↓
Unload
      ↓
Settlement
      ↓
Inventory + Accounting + Ledger
```

يجب منع أي منطق خاص بالـ Van من إنشاء حقيقة مخزون مستقلة.

---

# 13. DOMAIN 7 — AI LAYER

الـ AI يأتي **أخيرًا**.

ليس لأن AI غير مهم.

بل العكس.

لأن AI فوق بيانات خاطئة = ذكاء اصطناعي ينتج قرارات خاطئة بسرعة أكبر.

الترتيب:

```text
Clean Transactions
       ↓
Clean Inventory
       ↓
Clean Accounting
       ↓
Clean Ledgers
       ↓
Reliable Reports
       ↓
AI Intelligence
```

## AI Layer يجب أن تشمل مستقبلًا:

### Management Intelligence

* حالة الشركة.
* اتجاهات المبيعات.
* الربحية.
* السيولة.
* رأس المال العامل.

### Inventory Intelligence

* المنتجات الرابحة.
* المنتجات الراكدة.
* المخزون الزائد.
* نقص المخزون.
* دوران المخزون.
* الموسمية.

### Sales Intelligence

* أداء المندوب.
* العملاء.
* المناطق.
* المنتجات.
* المواسم.

### Purchasing Intelligence

* توقيت الشراء.
* الموردين.
* الأسعار.
* مخاطر التكدس.

### Business Advisory

AI لا يكون Chatbot فقط.

بل:

```text
RAWAEA DATA
    ↓
DOMAIN METRICS
    ↓
BUSINESS CONTEXT
    ↓
AI ANALYSIS
    ↓
RECOMMENDATION
    ↓
MANAGEMENT ACTION
```

---

# 14. ترتيب الـ Sprints

الترتيب التنفيذي الرئيسي:

```text
PHASE 3

INVENTORY
├── INV-001 Reality Map
├── INV-002 Source of Truth
├── INV-003 Movement Model
├── INV-004 Six Quantities
├── INV-005 Cost Layer
├── INV-006 Inventory Engine
└── INV-007 Consumer Migration

ACCOUNTING
├── ACC-001 Accounting Reality Map
├── ACC-002 Posting Model
├── ACC-003 Transaction Integration
└── ACC-004 Posting Cleanup

LEDGER
├── LED-001 Ledger Reality Map
├── LED-002 Source Mapping
└── LED-003 Ledger Reconciliation

SALES
├── SAL-001 Sales Reality Map
├── SAL-002 Order Flow
├── SAL-003 Posting Integration
└── SAL-004 Consumer Migration

PURCHASING
├── PUR-001 Purchasing Reality Map
├── PUR-002 Receiving
├── PUR-003 Cost Integration
└── PUR-004 Supplier Ledger Integration

DELIVERY / RUNSHEET
├── DLV-001 Runsheet Reality Map
├── DLV-002 Loading
├── DLV-003 Field Execution
├── DLV-004 Returns / Unload
└── DLV-005 Settlement

AI
├── AI-001 Data Contract
├── AI-002 Metrics
├── AI-003 Intelligence Layer
└── AI-004 Management Copilot
```

---

# 15. قاعدة عدم التقدم قبل اجتياز Gate

كل Domain له Gate.

لا ينتقل المساعد إلى Domain التالي إلا إذا:

1. تم تحديد Source of Truth.
2. تم تحديد جميع Consumers.
3. تم تحديد جميع Writers.
4. تم تحديد Business Rules.
5. تم تحديد المخاطر.
6. تم اختبار التغييرات.
7. تم توفير Rollback.
8. لم يتم كسر Domain سابق.
9. تم توثيق ما تغير.
10. تم التحقق من عدم وجود duplicate logic.

---

# 16. قاعدة التنفيذ التدريجي

ممنوع:

```text
Mass Rewrite
```

المسموح:

```text
Small Change
    ↓
Test
    ↓
Verify
    ↓
Observe
    ↓
Next Change
```

وكل Change يجب أن يكون قابلاً للعكس.

---

# 17. قاعدة حماية النظام

قبل أي تغيير خطير:

```text
Backup
↓
Branch
↓
Migration Plan
↓
Test
↓
Verification
↓
Deployment
↓
Monitoring
```

ولا يتم تعديل Production مباشرة لمجرد أن التغيير "يبدو صحيحًا".

---

# 18. قاعدة Edge Functions

الـ Edge Functions التي تم فحصها سابقًا لا يعاد تحليلها بلا سبب.

المساعد يستخدم نتائج الفحص السابقة كـ baseline.

عند تعديل Function:

```text
Existing Function
      ↓
Known Purpose
      ↓
Known Callers
      ↓
Known Dependencies
      ↓
Required Domain Change
      ↓
Minimal Modification
```

لا يتم استبدال Function إلا إذا كان هناك سبب معماري مثبت.

---

# 19. قاعدة Git

Git هو طبقة الحماية الأساسية للتنفيذ.

كل Sprint يجب أن يكون معزولًا في Branch واضح.

مثال:

```text
phase3/inventory/inv-001-reality-map
phase3/inventory/inv-002-source-of-truth
phase3/inventory/inv-003-movement-model
```

وعند التغييرات البرمجية:

```text
feature branch
    ↓
tests
    ↓
review
    ↓
merge
```

لا يتم تنفيذ تغييرات كبيرة مباشرة على branch الرئيسي.

---

# 20. قاعدة المساعد التنفيذي

المساعد التنفيذي لا يملك سلطة تغيير الخطة.

دوره:

```text
Read Constitution
        ↓
Read Execution Protocol
        ↓
Read Domain Execution Order
        ↓
Read Sprint Document
        ↓
Inspect Repository
        ↓
Implement
        ↓
Test
        ↓
Report
```

وإذا واجه تعارضًا بين:

* الكود.
* الوثائق.
* النتائج السابقة.
* المتطلبات الجديدة.

فلا يخمّن.

بل يوقف التنفيذ ويبلغ عن:

```text
CONFLICT
```

---

# 21. ما الذي لا يجوز للمساعد فعله؟

ممنوع:

* إعادة تصميم النظام بالكامل.
* إنشاء Inventory جديد منفصل عن الموجود.
* حذف الجداول القديمة دون Migration Plan.
* حذف Functions قديمة دون معرفة Callers.
* تعديل RLS بشكل عشوائي.
* تغيير Auth Model.
* تغيير Schema لأجل "النظافة" فقط.
* تغيير أسماء الأعمدة بلا ضرورة.
* تغيير Business Logic دون توثيق.
* إضافة abstraction لا تحتاجه المرحلة.
* إدخال AI قبل استقرار البيانات.
* تنفيذ عدة Domains في وقت واحد.

---

# 22. قاعدة التركيز

في كل لحظة يوجد Domain واحد فقط:

```text
CURRENT DOMAIN
```

و:

```text
CURRENT SPRINT
```

و:

```text
CURRENT TASK
```

لا يسمح للمساعد بأن يبدأ:

```text
Inventory + Accounting + Sales
```

في نفس الوقت.

---

# 23. تعريف اكتمال Domain

Domain لا يعتبر مكتملًا لأنه "يعمل".

بل يجب أن يتحقق:

```text
Functional Correctness
+
Data Correctness
+
Accounting Correctness
+
Security Correctness
+
Integration Correctness
+
Rollback Safety
+
Observability
```

---

# 24. الهدف النهائي

النتيجة المستهدفة ليست مجرد إصلاح عدد من Functions.

الهدف هو الوصول إلى:

```text
                 RAWAEA CORE
                      │
          ┌───────────┼───────────┐
          │           │           │
      Inventory   Accounting   Security
          │           │
          └──────┬────┘
                 │
              Ledger
                 │
       ┌─────────┴─────────┐
       │                   │
     Sales             Purchasing
       │                   │
       └─────────┬─────────┘
                 │
          Delivery / Runsheet
                 │
                 ▼
              Reports
                 │
                 ▼
             AI Layer
```

كل Domain يجب أن يكون جزءًا من هذه المنظومة، وليس جزيرة مستقلة.

---

# 25. القرار النهائي

**Inventory أولًا.**

ليس لأنه أكبر Domain فقط، وإنما لأنه يمثل الأساس الذي ستُبنى عليه:

* تكلفة البضاعة.
* COGS.
* الربحية.
* المبيعات.
* المشتريات.
* المرتجعات.
* حركة السيارات.
* التسويات.
* التقارير.
* الذكاء الاصطناعي.

ثم:

```text
Inventory
→ Accounting
→ Ledger
→ Sales
→ Purchasing
→ Delivery/Runsheet
→ AI
```

هذا هو **الترتيب التنفيذي الرسمي للمرحلة الثالثة**.

ولا يجوز للمساعد التنفيذي أن يتجاوزه أو يعيد تفسيره من تلقاء نفسه.
