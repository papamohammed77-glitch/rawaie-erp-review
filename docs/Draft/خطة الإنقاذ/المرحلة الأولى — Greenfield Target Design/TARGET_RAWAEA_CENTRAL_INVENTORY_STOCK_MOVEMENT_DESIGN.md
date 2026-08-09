# TARGET — RAWAEA CENTRAL INVENTORY & STOCK MOVEMENT DESIGN

**Target Design Reference — Inventory Domain**

**Status:** DESIGN BASELINE — قبل العودة إلى الكود  
**Scope:** Central Inventory + Manual Stock Vouchers + Direct Custody Movement

---

## 1. Purpose

هذه الوثيقة هي المرجع التصميمي المستهدف لنطاق المخزون المركزي وحركات المخزون والأذونات المخزنية اليدوية قبل تعديل أي Edge Function أو Migration. الهدف هو تثبيت النموذج الصحيح أولاً، ثم إثبات توافق الـSchema والكود معه، ثم التنفيذ والاختبار.

المنهج المعتمد هو:

**Understand → Prove → Design → Implement → Validate → Close**

النظام تحت الإنشاء، ولا توجد بيانات تشغيلية فعلية يجب الحفاظ عليها؛ لذلك لا يُعتبر السلوك التاريخي الخاطئ مرجعًا للحفاظ عليه. المرجع هو Target Design، مع استخدام الكود والـSchema لإثبات ما هو موجود فعليًا.

---

## 2. Design Principles

- Inventory movement is a domain operation, not UI-owned logic.
- There is one central business core for stock movement. Applications initiate business intent; they do not implement independent inventory rules.
- A stock movement must produce its physical stock effect and inventory audit record atomically.
- Movement types are a closed domain vocabulary, not free-form text.
- `allocated_qty` is reservation state, not a physical stock movement, and is handled separately.
- Manual Stock Vouchers represent custody/stock movements between defined parties or locations; they are not a Runsheet.
- `DirectSale` is a custody-loading movement to a vehicle/representative, not the customer sale itself.
- The subsequent `VanSale` consumes stock from the vehicle/representative custody.
- `DirectReturn` represents the return of remaining/returned custody stock from vehicle/representative to the warehouse.
- No application may become a second source of truth for stock quantities or movement history.

---

## 3. Central Inventory Business Core

الهدف هو Business Core واحد لحركات المخزون، ممثلًا بعملية مركزية من نوع `post_stock_movement`. هو حد التنفيذ الموثوق للحركات الفيزيائية.

| Responsibility | Target Owner |
|---|---|
| Validate movement request | Central Inventory Business Core |
| Check source availability | Central Inventory Business Core |
| Apply physical qty changes | Central Inventory Business Core |
| Write inventory movement/audit record | Central Inventory Business Core |
| Enforce movement semantics | Central Inventory Business Core + DB constraints |
| Reservation / `allocated_qty` | Separate reservation operation |
| UI workflow/state transitions | Voucher/domain functions subject to domain rules |

Applications such as warehouse, van-sales, purchasing, returns, and voucher screens collect intent and request domain actions; they do not reproduce stock mutation logic.

---

## 4. Target Inventory State Model

| Field | Target Meaning |
|---|---|
| `stock_branches.qty` | Physical quantity held by the branch/custody location. |
| `stock_branches.allocated_qty` | Reserved quantity; not itself a physical movement. |
| `available_qty` | Derived availability: physical quantity minus reserved quantity. |
| `inventory_log` | Auditable record of posted inventory movements. |

لا يجوز لأي حركة أن تتعامل مع `allocated_qty` باعتبارها كمية حركة مخزون فعلية.

---

## 5. Target Movement Vocabulary

| Movement Type | Target Business Meaning |
|---|---|
| `PurchaseIn` | Stock enters inventory from purchasing/receiving. |
| `TransferOut` | Stock leaves the source location as part of a transfer. |
| `TransferIn` | Stock enters the destination location as part of a transfer. |
| `Loading` | Stock is loaded into operational custody/location when explicitly modeled as loading. |
| `Unloading` | Stock returns from operational custody/location when explicitly modeled as unloading. |
| `POSSale` | Point-of-sale sale consumes stock from the selling location. |
| `VanSale` | Vehicle/representative sale consumes stock from vehicle custody. |
| `SalesReturn` | Customer sales return adds stock back according to the return event. |
| `PurchaseReturn` | Stock returned to supplier leaves inventory. |
| `InventoryIncrease` | Authorized inventory increase. |
| `InventoryDecrease` | Authorized inventory decrease. |
| `Adjustment` | Authorized stock adjustment. |

> الاستخدام الدقيق لـ`Loading` / `Unloading` مقابل `TransferOut` / `TransferIn` داخل أي workflow محدد يجب تثبيته من خلال Event Contract قبل التنفيذ. لا يجوز للتطبيقات اختراع semantics بديلة للحركات.

---

## 6. Manual Stock Voucher Domain

Manual Stock Voucher هو مستند رسمي لتحريك المخزون/العهدة بين أطراف أو مواقع محددة. وهو **ليس جزءًا من Domain الرانشيت**.

| Voucher Type | Target Meaning |
|---|---|
| `Transfer` | Movement from one branch/location to another. |
| `DirectSale` | Direct custody issue: warehouse → vehicle/representative custody for field selling; not the customer sale. |
| `DirectReturn` | Direct custody return: vehicle/representative custody → warehouse. |
| `SupplierReturn` | Stock returned from warehouse to supplier. |
| `Scrap` | Authorized disposal/destruction movement. |
| `Adjustment` | Authorized stock adjustment/count reconciliation. |

---

## 7. Voucher Lifecycle

### Target Lifecycle

**Create → Send → Receive → Complete → Cancel**

| Stage | Target Responsibility | Inventory Effect |
|---|---|---|
| Create | Create a valid voucher in a pre-posting state. | No physical stock movement. |
| Send | Validate and initiate the movement workflow. | Only the defined posting event may create the movement. |
| Receive | Receiving party confirms receipt where required. | Only the defined receiving event creates the receiving-side effect. |
| Complete | Finalize the document after required confirmations. | No second physical movement merely because status becomes Complete. |
| Cancel | Cancel only when business rules permit. | No movement if cancelled before posting; reversal semantics must be explicitly defined after posting. |

**Target invariant:** A status transition must not accidentally become a second stock movement. Each physical movement is posted once by the central inventory engine.

---

## 8. Target Flows

### 8.1 Transfer

**Source Branch → Transfer Voucher → Destination Branch**

النتيجة المستهدفة:

- المصدر ينخفض.
- الوجهة تزيد.
- الحركة تسجل في سجل المخزون.
- طرفا الحركة جزء من business transaction/effect واحد.

### 8.2 Direct Sale / Custody Issue

**Warehouse → DirectSale Voucher → Vehicle/Representative Custody → Field Sale**

`DirectSale` هو حدث تحميل العهدة، وليس فاتورة العميل.

السيارة/المندوب يمثلان **operational stock custody** مؤقتة، بحيث يمكن ربط المخزون الموجود بحوزة المندوب بالمسؤول عنه.

الـ`VanSale` اللاحق هو حدث بيع مستقل يستهلك من هذه العهدة.

### 8.3 Direct Return

**Vehicle/Representative Custody → DirectReturn Voucher → Warehouse**

`DirectReturn` هو إعادة المتبقي/المرتجع من عهدة السيارة/المندوب إلى المخزن، وهو منفصل عن **Customer Sales Return**.

### 8.4 Supplier Return

**Warehouse → SupplierReturn → Supplier**

`SupplierReturn` هو حدث خروج مخزون له آثاره التجارية والمحاسبية الخاصة، ولا يجوز أن تنفذ واجهة المستخدم mutation مستقلة للمخزون.

---

## 9. Source of Truth

| Domain | Target Source of Truth |
|---|---|
| Physical branch/custody quantity | `stock_branches.qty` |
| Reserved quantity | `stock_branches.allocated_qty` |
| Available quantity | Derived from physical minus reserved quantity |
| Posted inventory movement history | `inventory_log` |
| Voucher document/header | `stock_vouchers` |
| Voucher line quantities | `stock_voucher_details` |
| Customer/sales transaction | Sales domain tables — outside this movement-engine scope |
| Runsheet | Runsheet domain — outside Manual Voucher ownership |

التفاصيل النهائية الخاصة بملكية الأرصدة المحاسبية ليست جزءًا من هذه الوثيقة إلا إذا تم اعتمادها صراحةً في Target Design مستقل للمحاسبة.

---

## 10. Atomicity and Transaction Boundary

الحركة المخزنية المنشورة يجب أن تكون **Atomic**:

**Validation + Stock Mutation + Inventory Log**

إما أن تنجح معًا أو تفشل معًا.

حد التنفيذ المستهدف هو database-level atomic operation/RPC ممثل في:

`post_stock_movement`

ولا يجوز لطبقة التطبيق تقسيم تحديث المخزون وتسجيل `inventory_log` إلى طلبات مستقلة يمكن أن تنجح أو تفشل بشكل منفصل.

كما يجب أن يستخدم المحرك المركزي آلية مناسبة للـlocking/concurrency control حتى لا تستطيع حركتان متزامنتان استهلاك نفس الكمية المتاحة بشكل غير صحيح.

---

## 11. Reservation Boundary

`allocated_qty` ليس بديلًا عن posting لحركة مخزون.

Reservation وRelease هما domain actions مستقلة عن حركة المخزون الفيزيائية.

- Movement Engine → يغير الكمية الفعلية.
- Reservation Operation → يدير `allocated_qty`.

---

## 12. Application Boundaries

| Application / Domain | May Do | Must Not Own |
|---|---|---|
| Manual Stock Voucher UI | Collect voucher data; request lifecycle actions. | Independent stock mutation rules. |
| Van Sales | Perform van-sales workflows and request domain operations. | Independent inventory movement rules. |
| Warehouse | Perform warehouse workflows and invoke approved inventory actions. | A second inventory engine. |
| Purchasing | Initiate purchase receipt/return business events. | Ad-hoc stock mutations. |
| Returns | Initiate approved return events. | Independent stock truth. |

---

## 13. Accounting Boundary

Inventory movement والمحاسبة مجالان مرتبطان لكنهما مسؤوليتان منفصلتان.

Inventory Engine يملك:

- Physical Stock Effect
- Inventory Audit

أما Accounting Posting فيجب أن يتم من خلال Accounting Domain Engine المعتمد، وألا يتم تكراره داخل:

- Voucher
- Sales
- Settlement
- UI Functions

هذه الوثيقة لا تثبت تفاصيل Chart of Accounts أو Journal Line Mapping؛ هذه التفاصيل يجب تثبيتها في Target Design الخاص بالمحاسبة قبل التنفيذ.

---

## 14. Van Sales Boundary

الفصل المستهدف هو:

1. `DirectSale` = Load Custody.
2. `VanSale` = Sell From Custody.
3. `DirectReturn` = Return Remaining/Returned Custody.
4. `Settlement` = Reconcile the operational result of Van Sales activity.

هذه أحداث تجارية مستقلة.

**Van Sales لا يجوز أن يفسر DirectSale على أنه Customer Sale.**

كما أن **Runsheet Domain مستقل** ولا يجب أن يصبح المالك الخفي لحركات `DirectSale` / `DirectReturn`.

---

## 15. Core Invariants

- Every physical stock mutation has one authoritative inventory posting path.
- Every posted movement has an auditable `inventory_log` record.
- A movement is never posted twice because two voucher statuses changed.
- `DirectSale` never means customer sale; it means custody issue.
- `DirectReturn` never means customer sales return; it means custody return.
- `VanSale` consumes vehicle/representative custody; it does not create that custody.
- `allocated_qty` is reservation state, not physical movement.
- Applications cannot become alternative sources of truth for `qty`.
- Runsheet does not own Manual Stock Voucher semantics.
- No implementation proceeds until required Schema and code evidence is mapped to this Target.

---

## 16. Validation Contract Before Implementation

قبل تعديل أي كود يجب إثبات الآتي:

1. Mapping جميع Edge Functions المؤثرة في المخزون إلى Target Movement Vocabulary.
2. تحديد جميع الكتابات إلى `stock_branches.qty`.
3. تحديد جميع الكتابات إلى `stock_branches.allocated_qty` بشكل منفصل.
4. تحديد جميع الكتابات إلى `inventory_log`.
5. تحديد جميع Functions الخاصة بدورة حياة الـVoucher.
6. إثبات مسارات `DirectSale` و`DirectReturn` end-to-end.
7. إثبات استهلاك `VanSale` للمخزون بشكل منفصل عن تحميل العهدة.
8. فصل حركات Runsheet عن ملكية Manual Voucher.
9. Mapping جميع الآثار المحاسبية دون افتراض أن التنفيذ الحالي هو الـTarget.
10. إثبات Atomicity وConcurrency behavior قبل التنفيذ.

أي معلومة لا يمكن إثباتها من:

- Database Schema
- Edge Functions
- Applications
- Approved Target Design

تبقى:

**UNKNOWN**

ولا يتم ملء الفراغ بالافتراض.

---

## 17. Implementation Gate

لا يتم تعديل Edge Function لمجرد أن سلوكها الحالي غير صحيح.

قبل تعديل أي Function يجب إثبات:

- Intended Domain Event
- Source of Truth
- Movement Type
- Transaction Boundary
- Inputs
- Outputs
- Side Effects

ثم مقارنتها بهذا Target Design.

### التنفيذ

**Target Design → Evidence Matrix → Schema Verification → Function Mapping → Implementation → Test Contract → Validation → Close**

---

## 18. Explicit Out-of-Scope

هذه الوثيقة لا تعيد تعريف:

- Detailed Sales Order Architecture
- Detailed Runsheet Architecture
- Full Accounting Chart and Journal Design
- Driver Ledger Target Design
- UI Redesign
- PWA Implementation Details
- Historical Data Migration/Cleanup
- Performance Tuning unrelated to Inventory Movement Boundary

هذه المجالات قد تتفاعل مع Inventory، لكنها ليست مملوكة لهذه الوثيقة.

---

## 19. Design Decision Summary

| Decision | Target |
|---|---|
| Inventory Core | One central business core. |
| Physical Movement Authority | Central inventory movement operation. |
| Physical Stock Truth | `stock_branches.qty` |
| Reservation Truth | `stock_branches.allocated_qty` |
| Movement Audit | `inventory_log` |
| Voucher Header | `stock_vouchers` |
| Voucher Details | `stock_voucher_details` |
| Voucher Lifecycle | Create → Send → Receive → Complete → Cancel |
| DirectSale | Custody issue to vehicle/representative. |
| VanSale | Separate sale consuming custody stock. |
| DirectReturn | Custody return to warehouse. |
| Runsheet | Separate operational domain. |
| Implementation Method | Prove → Design → Implement → Validate. |

---

## 20. Final Target Principle

> **RAWAEA inventory must have one authoritative business core for physical stock movement. Applications express business intent; they do not own independent inventory logic. Manual Stock Vouchers manage formal custody/stock movements, while Van Sales consumes and reconciles the custody created by those movements. The target is established before code repair so no function is repaired against an unstable or accidental business model.**

---

## 21. Evidence Basis

تم بناء هذه الوثيقة استنادًا إلى:

- `Architecture/الأذونات المخزنية اليدوية.md`
- `Edge_Function_Reports/_HISTORICAL/van-sales report.md`
- Target Design direction التي تم تثبيتها للمحرك المركزي للمخزون.
- توجيه المشروع بأن النظام ما زال تحت الإنشاء وأن **Target Design** هو المرجع وليس الحفاظ على Legacy Behavior.

حيث لم تثبت المصادر تفصيلًا تنفيذيًا نهائيًا، تُترك النقطة مفتوحة لمرحلة **Prove** التالية بدل اختراع قاعدة غير مثبتة.

---

**Document Status: TARGET DESIGN BASELINE**
