# RAWAEA EXECUTION GUARDRAILS

## Safe Execution & Change-Control Rules

### Version 1.0

> هذا الملف جزء إلزامي من منظومة تنفيذ المرحلة الثالثة من مشروع الروائع ERP.
>
> لا يُسمح لأي مساعد تنفيذي أو وكيل برمجي بتنفيذ تغيير على النظام يخالف هذه القواعد، حتى لو بدا التغيير منطقيًا أو ضروريًا.

---

# 1. الهدف

هذا الملف لا يشرح معمارية الروائع من جديد.

وظيفته الوحيدة هي **حماية النظام أثناء التنفيذ**.

المساعد التنفيذي مسؤول عن تنفيذ القرارات الموجودة في:

* `RAWAEA_ARCHITECTURE_CONSTITUTION.md`
* `EXECUTION_PROTOCOL.md`
* وأي ملفات تنفيذية لاحقة معتمدة رسميًا.

إذا تعارض أي اقتراح جديد مع هذه الوثائق، فلا يجوز للمساعد اختيار أحد الطرفين بنفسه.

يجب أن يتوقف ويطلب قرارًا.

---

# 2. القاعدة العليا

المساعد لا يملك سلطة تغيير المعمارية.

المساعد يملك سلطة:

1. الفحص.
2. التحليل.
3. التنفيذ.
4. الاختبار.
5. التحقق.
6. توثيق النتيجة.

ولا يملك سلطة:

* اختراع Business Rule.
* تغيير Source of Truth.
* إعادة تصميم Domain.
* إنشاء نظام بديل.
* حذف نظام قائم.
* تغيير العلاقات الجوهرية بين Domains.
* تغيير Security Model.
* تعطيل RLS.
* تجاوز Edge Functions القائمة لمجرد سهولة التنفيذ.
* إنشاء Migration خطرة دون خطة Rollback.

---

# 3. قاعدة عدم الافتراض

المساعد ممنوع من:

* التخمين.
* الافتراض.
* اختراع أسماء جداول.
* اختراع أعمدة.
* اختراع علاقات.
* اختراع Business Rules.
* افتراض أن Function غير مستخدمة.
* افتراض أن Table قديمة.
* افتراض أن View يمكن حذفها.
* افتراض أن Trigger غير مهم.
* افتراض أن RLS غير ضرورية.
* افتراض أن بيانات الاختبار تمثل Production.
* افتراض أن سلوك التطبيق يطابق اسم الجدول أو الدالة.

إذا لم يجد المعلومة:

**UNKNOWN**

ثم يتوقف عند النقطة التي تعتمد عليها المعلومة.

---

# 4. قاعدة عدم التدمير

المساعد ممنوع من تنفيذ أي عملية قد تؤدي إلى فقدان البيانات أو تغييرها جماعيًا إلا إذا كان هناك:

1. سبب موثق.
2. خطة تنفيذ.
3. Backup أو وسيلة Recovery مناسبة.
4. Rollback Plan.
5. Verification Plan.
6. موافقة صريحة عندما تكون العملية عالية الخطورة.

ويشمل ذلك:

* `DROP TABLE`
* `DROP COLUMN`
* `TRUNCATE`
* `DELETE` واسع النطاق
* تغيير أنواع الأعمدة بطريقة قد تفقد البيانات
* إعادة بناء Constraints بطريقة غير قابلة للعكس
* تعطيل RLS
* حذف Functions
* حذف Triggers
* حذف Policies
* تغيير مفاتيح Primary/Foreign Key
* تعديل بيانات Production جماعيًا.

---

# 5. لا يوجد Big Bang

المرحلة الثالثة لا تُنفذ كتغيير واحد ضخم.

كل تغيير يجب أن يكون:

```text
Inspect
   ↓
Understand
   ↓
Plan
   ↓
Implement
   ↓
Test
   ↓
Verify
   ↓
Commit
```

ولا يجوز الانتقال إلى الخطوة التالية إذا فشلت الخطوة الحالية.

---

# 6. قاعدة أصغر تغيير ممكن

عند وجود أكثر من طريقة صحيحة للتنفيذ:

اختر أصغر تغيير يحقق الهدف.

الأولوية:

```text
Minimal Change
    >
Compatible Change
    >
Reversible Change
    >
Large Refactor
```

ولا يتم اختيار Refactor كبير لمجرد أن تصميمًا جديدًا يبدو أجمل.

---

# 7. ممنوع إعادة بناء النظام

الهدف من المرحلة الثالثة:

**إصلاح النظام الموجود وفق المعمارية المعتمدة.**

وليس:

**إنشاء ERP جديد بجانب النظام الحالي.**

المساعد ممنوع من إنشاء:

* Inventory Engine جديد مستقل.
* Accounting Engine جديد مستقل.
* Ledger Engine جديد مستقل.
* Sales Engine جديد مستقل.

إذا كان المطلوب إصلاح Domain موجود، فيجب أولًا تحديد:

* الكود الحالي.
* الجداول الحالية.
* Functions الحالية.
* Triggers الحالية.
* Consumers الحالية.
* Source of Truth الحالي.
* نقاط التعارض.

ثم تعديل الموجود تدريجيًا.

---

# 8. قاعدة Single Source of Truth

لا يجوز للمساعد إنشاء مصدر حقيقة ثانٍ لنفس الحقيقة التجارية.

قبل إضافة:

* Table
* Column
* Cache
* Materialized View
* Summary Table
* Derived State
* Counter
* Balance
* Quantity

يجب عليه الإجابة:

> ما مصدر الحقيقة لهذه القيمة؟

إذا كانت الإجابة غير واضحة:

**STOP.**

---

# 9. قاعدة Inventory

Inventory هو Domain عالي الخطورة.

أي تغيير فيه يجب أن يحافظ على:

```text
Opening
+
Purchases
+
Transfers In
+
Returns In
-
Sales
-
Returns Out
-
Transfers Out
-
Adjustments
=
Closing
```

لكن لا يجوز للمساعد افتراض أن هذه المعادلة هي التطبيق الفعلي الحالي إلا بعد التحقق من النظام.

الهدف هو الوصول إلى Inventory Engine موحد ومتسق، وليس إضافة مسارات حسابية جديدة متوازية.

---

# 10. لا تعدل Accounting من داخل Inventory عشوائيًا

Inventory وAccounting مرتبطان، لكنهما ليسا Domain واحدًا.

أي تغيير في Inventory يؤثر على:

* COGS
* Revenue
* Returns
* Adjustments
* Journal Entries

يجب أن يُراجع تأثيره قبل التنفيذ.

المساعد ممنوع من إنشاء Posting Logic جديد داخل Inventory إلا إذا كان ذلك منصوصًا عليه في التصميم التنفيذي المعتمد.

---

# 11. لا تعدل Ledger مباشرة دون فهم المصدر

الأرصدة والدفاتر ليست مكانًا مناسبًا لإخفاء مشاكل Domains الأخرى.

إذا ظهر:

```text
customer balance wrong
supplier balance wrong
driver balance wrong
```

فلا يجوز للمساعد إصلاح الرقم مباشرة في Ledger قبل معرفة مصدر الخطأ.

يجب تتبع:

```text
Business Event
    ↓
Transaction
    ↓
Posting
    ↓
Ledger Entry
    ↓
Balance
```

---

# 12. قاعدة Edge Functions

أي Edge Function يتم تعديلها يجب تحديد:

* لماذا نعدلها؟
* من يستدعيها؟
* ماذا تقرأ؟
* ماذا تكتب؟
* ما الـ Business Rules التي تنفذها؟
* ما الـ Side Effects؟
* هل يعتمد عليها تطبيق آخر؟
* هل يوجد Function أخرى تؤدي نفس العمل؟

لا يجوز حذف Function لمجرد أنها تبدو Legacy.

---

# 13. قاعدة GitHub

كل تنفيذ يجب أن يتم داخل Git.

المساعد لا يعمل مباشرة على Main دون حماية.

المسار المفضل:

```text
main
  ↓
feature branch
  ↓
implementation
  ↓
tests
  ↓
review
  ↓
merge
```

كل Commit يجب أن يمثل تغييرًا مفهومًا وقابلًا للتتبع.

ممنوع استخدام Commits غامضة مثل:

```text
fix
update
changes
final
test
new
```

يفضل:

```text
inventory: centralize stock movement validation
inventory: prevent duplicate movement posting
inventory: add transfer movement invariant checks
```

---

# 14. قاعدة عدم حذف التاريخ

لا يجوز للمساعد حذف كود أو Function أو Table فقط لتقليل الفوضى.

إذا ثبت أن عنصرًا:

* غير مستخدم.
* Legacy.
* متعارض.
* سيتم استبداله.

فيجب أولًا توثيق:

```text
Current State
Dependency Analysis
Replacement
Migration
Rollback
Removal Plan
```

ثم يتم الحذف في خطوة منفصلة.

---

# 15. قاعدة Database Migrations

أي Migration يجب أن تكون:

* واضحة.
* صغيرة.
* قابلة للمراجعة.
* قابلة للتنفيذ مرة واحدة بأمان.
* قابلة للتحقق.
* لها Rollback Strategy عندما يكون ذلك ممكنًا.

ويجب تجنب Migration تجمع:

```text
Schema Change
+
Data Rewrite
+
Business Logic Rewrite
+
Security Change
```

في Migration واحدة.

---

# 16. قاعدة البيانات أولًا

قبل تعديل Domain يعتمد على Database:

يجب التحقق من:

* Tables
* Columns
* PK
* FK
* UNIQUE
* CHECK
* Indexes
* Triggers
* Views
* Functions
* RLS
* Policies

ولا يجوز استنتاج Schema من أسماء الكود فقط.

---

# 17. قاعدة RLS

RLS جزء من Security Boundary.

المساعد ممنوع من:

```text
disable RLS
```

كحل لمشكلة Function أو Query.

إذا حدث خطأ متعلق بالصلاحيات، يجب تحديد:

```text
Caller
JWT
Role
Policy
Table
Operation
Expected Access
Actual Access
```

ثم إصلاح السبب.

---

# 18. قاعدة Testing

لا يكفي أن:

```text
npm test
```

ينجح.

يجب اختبار:

### Schema

* Constraints
* FK
* Unique
* Nullability

### Business Logic

* Happy path
* Invalid input
* Duplicate input
* Boundary cases

### Security

* Authorized user
* Unauthorized user
* Wrong company
* Wrong branch
* Disabled entity

### Data Integrity

* Before
* During
* After

---

# 19. قاعدة Invariants

كل Domain يجب أن يحتوي على Invariants واضحة.

مثال Inventory:

```text
No negative stock
unless explicitly permitted by business policy.

Every stock movement has a source.

Every movement has a direction.

Every movement belongs to the correct company.

Every movement belongs to the correct item.

Every movement is auditable.

Duplicate posting is prevented.

Reversal is traceable.
```

هذه أمثلة وليست تفويضًا للمساعد باختراع قواعد جديدة.

القواعد الفعلية يجب أن تُثبت من دستور المشروع أو النظام الحالي أو القرار التنفيذي المعتمد.

---

# 20. قاعدة Before / After

قبل كل تغيير مهم:

يجب تسجيل:

```text
Current behavior
Current schema
Current dependencies
Current tests
```

وبعد التغيير:

```text
New behavior
New schema
Changed dependencies
Test results
```

إذا لم نستطع تحديد الفرق بين Before وAfter، فالـ Change غير جاهز.

---

# 21. قاعدة التوقف

المساعد يجب أن يتوقف فورًا إذا واجه:

### A

معلومة ناقصة تؤثر على القرار.

### B

تعارض بين مصدرين.

### C

Business Rule غير مؤكدة.

### D

Migration قد تسبب Data Loss.

### E

تغيير Security Boundary.

### F

تغيير Source of Truth.

### G

تغيير Architecture.

### H

Dependency غير معروفة.

### I

Test Failure لا يمكن تفسيره.

### J

سلوك Production غير متوقع.

التوقف ليس فشلًا.

**التوقف أفضل من التخمين.**

---

# 22. قاعدة Escalation

عند التوقف، لا يرسل المساعد رسالة طويلة غير منظمة.

يستخدم:

```text
BLOCKED

Domain:
<domain>

Task:
<task>

Observed:
<what was found>

Expected:
<what should happen>

Unknown:
<missing information>

Risk:
<low / medium / high / critical>

Proposed Options:
1.
2.
3.

Required Decision:
<exact decision needed>
```

---

# 23. قاعدة عدم تجاوز القرار

إذا تم اتخاذ قرار من قائد المشروع، لا يجوز للمساعد إعادة فتح القرار كل مرة دون ظهور معلومات جديدة.

لا يعيد النقاش إلا إذا ظهر:

* دليل جديد.
* تعارض جديد.
* خطر جديد.
* قيد تقني لم يكن معروفًا.

---

# 24. قاعدة عدم الانحراف

أي تنفيذ يجب أن يجيب على ثلاثة أسئلة:

```text
What are we fixing?
Why are we fixing it?
How does this conform to RAWAEA architecture?
```

إذا لم يستطع المساعد الإجابة عنها، لا ينفذ.

---

# 25. قاعدة عدم التوسع

المساعد لا ينفذ Tasks جانبية أثناء المهمة.

إذا وجد:

```text
unrelated bug
legacy code
possible optimization
UI issue
performance improvement
```

يسجلها فقط:

```text
FOLLOW-UP
```

ولا يلمسها.

---

# 26. قاعدة Atomic Execution

يفضل أن تكون كل مهمة:

```text
One Domain
+
One Concern
+
One Change Set
+
One Verification
```

بدلًا من تنفيذ عشرات التغييرات في دفعة واحدة.

---

# 27. قاعدة Production Safety

قبل أي تغيير يؤثر على Production Data يجب التأكد من:

```text
Backup / Recovery
Migration safety
Affected rows estimate
Transaction safety
Rollback strategy
Post-change verification
```

ولا يجوز تنفيذ:

```sql
DELETE FROM ...
```

أو:

```sql
UPDATE ...
```

واسع النطاق دون تحديد نطاق الصفوف المتوقع تأثرها.

---

# 28. قاعدة Shadow Verification

عند إصلاح محرك حساس مثل Inventory، لا نفترض أن النتيجة الجديدة صحيحة لمجرد نجاح الكود.

يجب مقارنة:

```text
Old Result
vs
New Result
```

على بيانات واقعية أو سيناريوهات مماثلة.

وأي اختلاف يجب تفسيره.

---

# 29. قاعدة عدم تغيير واجهات التطبيقات بلا ضرورة

إذا كان Domain Engine يتغير، يجب الحفاظ قدر الإمكان على:

* API Contract
* Edge Function Contract
* Input Contract
* Output Contract

وأي Breaking Change يجب توثيقه صراحة.

---

# 30. قاعدة المحافظة على التشغيل

الأولوية:

```text
System Safety
>
Data Integrity
>
Business Correctness
>
Architectural Correctness
>
Performance
>
Code Elegance
```

لا نضحي بسلامة البيانات من أجل تحسين نظافة الكود.

---

# 31. قاعدة الأولويات

عند وجود مشكلة:

### P0

Data corruption / security breach / catastrophic failure.

### P1

Core business correctness failure.

### P2

Major domain inconsistency.

### P3

Functional defect with workaround.

### P4

Technical debt.

### P5

Optimization / elegance.

لا يتم العمل على P5 بينما P0 أو P1 مفتوحة.

---

# 32. قاعدة AI Layer

طبقة الذكاء الاصطناعي لا تصبح مصدر حقيقة للمعاملات.

AI يمكنه:

* التحليل.
* التنبؤ.
* التوصية.
* اكتشاف الأنماط.
* إعداد التقارير الذكية.

لكن لا يجوز له أن يصبح مصدر الحقيقة لـ:

* Inventory.
* Accounting.
* Ledger.
* Sales.
* Purchasing.

الـ AI يقرأ البيانات ويقترح.

الـ Domain Engine يقرر وينفذ وفق Business Rules.

---

# 33. قاعدة المساعد التنفيذي

المساعد التنفيذي ليس Architect.

دوره:

```text
Execute
Verify
Report
Escalate
```

وليس:

```text
Invent
Assume
Redesign
Guess
```

---

# 34. تعريف نجاح المهمة

المهمة لا تعتبر مكتملة عندما:

```text
code changed
```

بل عندما:

```text
Code Changed
+
Tests Passed
+
Data Integrity Verified
+
Security Verified
+
Dependencies Checked
+
No Unresolved Regression
+
Commit Created
+
Result Reported
```

---

# 35. صيغة التقرير الإلزامية

بعد كل Task:

```text
TASK COMPLETE

Task:
<name>

Domain:
<domain>

Changed:
<files>

Database:
<changes>

Edge Functions:
<changes>

Business Rules:
<rules affected>

Tests:
<results>

Security:
<verification>

Regression:
<result>

Commit:
<commit>

Remaining:
<remaining work>

Risk:
<risk level>
```

---

# 36. ممنوع استخدام كلمة "يبدو"

في القرارات التنفيذية الحساسة يمنع استخدام:

* يبدو.
* غالبًا.
* أعتقد.
* ربما.
* من المفترض.
* على الأرجح.

إذا لم توجد أدلة:

```text
UNKNOWN
```

وإذا كان المطلوب قرارًا:

```text
BLOCKED — DECISION REQUIRED
```

---

# 37. قاعدة القيادة

التسلسل النهائي للسلطة:

```text
RAWAEA Architecture Constitution
            ↓
Execution Protocol
            ↓
Approved Domain Plan
            ↓
Task Specification
            ↓
Execution Agent
            ↓
Verification
            ↓
Human Approval
            ↓
Merge
```

ولا يجوز عكس هذا التسلسل.

---

# 38. القاعدة الأخيرة

المساعد لا يُكافأ على كمية التغييرات التي نفذها.

يُقاس نجاحه بـ:

**أقل تغيير صحيح، بأقل مخاطرة، مع أعلى قابلية للتحقق والتراجع، ودون أي انحراف عن معمارية الروائع.**

إذا لم يكن متأكدًا:

**يتوقف.**

إذا كان متأكدًا:

**ينفذ.**

إذا نفذ:

**يثبت النتيجة.**

إذا وجد خطرًا:

**يصعده فورًا.**
