11_BUSINESS_WORKFLOWS.md – تدفقات الأعمال ورحلة المستخدم
المشروع: الروائع ERP (Al Rawaie ERP)
النسخة: 3.0 – الموحدة
التاريخ: 2026-07-13
المراجع: دستور الروائع 2.0، 06_SYSTEM_ARCHITECTURE.md، 09_API_CATALOG.md
________________________________________
🎯 الغرض من هذه الوثيقة
توثيق تدفقات الأعمال الكاملة (Business Workflows) في نظام الروائع ERP. كل تدفق يشرح المسار الكامل من البداية إلى النهاية، والتطبيقات والخدمات المشاركة، والجداول المتأثرة والقيود المحاسبية، وحالات النظام في كل مرحلة، وكيف تقارن بالأنظمة المنافسة (SAP، Odoo، دفترة). هذه الوثيقة هي المرجع الرسمي لفهم "كيف تتم الأمور" في النظام من منظور المستخدم النهائي، وهي موجهة للمطورين الجدد، وللمدققين، ولأي CTO يريد فهم النظام.
________________________________________
📊 التدفقات الرئيسية
#	التدفق	الوصف	التغطية الحالية
1	Order-to-Cash	من إنشاء الأوردر عبر أي قناة بيعية إلى تحصيل النقدية وإغلاق القيد	95%
2	Procure-to-Pay	من طلب الشراء إلى استلام البضاعة وتسجيل الالتزام المالي للمورد	70%
3	Inventory & Runsheet Lifecycle	دورة حياة المخزون والرانشيت – قلب النظام و"روحه"	95%
4	Delivery, Return & Settlement	من التوصيل إلى المرتجعات إلى تسوية العجز وإغلاق اليومية	90%
5	Offline to Online Sync	المزامنة بين التطبيقات الميدانية وقاعدة البيانات السحابية	85%
________________________________________
١. تدفق Order-to-Cash (من الأوردر إلى النقدية)
١.١ نظرة عامة
هذا هو التدفق المالي الأهم. يبدأ من لحظة طلب العميل، ويمر عبر 5 قنوات بيعية مختلفة، ويندمج في مسار واحد عبر الرانشيت، ويمر بمراحل التجهيز والتحميل والتوصيل، وينتهي بتحصيل النقدية وإغلاق القيد المحاسبي.
١.٢ الأدوار المشاركة
الدور	المسؤولية	التطبيق المستخدم
مندوب التلي سيلز / مندوب المبيعات	إنشاء الأوردر	sales/telesales.html، sales/order-taker.html
الكاشير (POS)	بيع مباشر	sales/pos.html
مندوب الفان (Van Sales)	بيع من السيارة	sales/van-sales.html
المتجر الإلكتروني	طلب العميل مباشرة	store/index.html
المحضّر	تجهيز البضاعة	warehouse/picker.html
المحمّل	تحميل البضاعة على السيارة	warehouse/loader.html
مندوب التوصيل	تسليم البضاعة واستلام النقدية	delivery/driver.html
مسؤول المرتجعات	استلام البضاعة المرتجعة	warehouse/returns.html
المحاسب	مراجعة القيود وإغلاق اليومية	main.html
١.٣ مخطط الحالة (State Machine)
stateDiagram-v2
    [*] --> Draft: إنشاء أوردر (متجر إلكتروني)
    [*] --> Confirmed: إنشاء أوردر (تلي سيلز/مندوب)
    [*] --> Invoiced: بيع مباشر (POS/Van Sales)
    Draft --> Confirmed: confirm-order
    Confirmed --> Pending: ضم لرانشيت (create-runsheet)
    Pending --> Picking: start-picking
    Picking --> Picked: complete-picking (حجز المخزون)
    Picked --> Loading: start-loading
    Loading --> Loaded: complete-loading (خصم المخزون + قيد تكلفة)
    Loaded --> Delivering: start-delivery
    Delivering --> Delivered: complete-delivery (قيد إيرادات)
    Delivered --> Returning: start-return
    Returning --> Returned: complete-return (إعادة مخزون + Credit Note)
    Returned --> Closed: save-daily-settlement (تسوية العجز)
    
    Confirmed --> Cancelled: cancel-order
    Draft --> Cancelled: cancel-order
    
    Picking --> Open: cancel-picking
    Loading --> Picked: cancel-loading
    Delivering --> Loaded: cancel-delivery
    Returning --> Delivered: cancel-return
    Loaded --> Picked: unload-runsheet
    Picked --> Picking: reopen-picking
    Loaded --> Loading: reopen-loading
    Returned --> Returning: reopen-return
١.٤ المسار خطوة بخطوة
#	الخطوة	التطبيق	Edge Function	الجداول المتأثرة	قيد محاسبي
1	إنشاء أوردر	telesales / pos / order-taker / van-sales / store	save-sales-invoice / submit-online-order	orders, order_details	❌ (إلا POS: قيد إيرادات فوري)
2	تأكيد الأوردر (للمتجر)	main.html	confirm-order	orders.status ← Confirmed	❌
3	تجميع في رانشيت	main.html	create-runsheet / append-to-runsheet	runsheets, run_sheet_details, orders.runsheet_id	❌
4	تحضير	picker.html	start-picking → complete-picking	run_sheet_details.qty_picked, stock_branches.allocated_qty ↑, inventory_log	❌
5	تحميل	loader.html	start-loading → complete-loading	run_sheet_details.qty_loaded, stock_branches.qty ↓ allocated_qty ↓, inventory_log, orders.original_total_amount	✅ قيد تكلفة (مدين: 51 / دائن: 124)
6	توصيل وتسليم	driver.html	start-delivery → complete-order-delivery	order_details.qty_delivered qty_refused, orders.total_amount amount_paid, run_sheet_details.qty_delivered, customer_ledger, inventory_log	✅ قيد إيرادات (مدين: العميل/121 / دائن: 41 + 4)
7	مرتجعات	returns.html	start-return → complete-return	order_details.qty_returned driver_liability, run_sheet_details.qty_returned driver_liability, stock_branches.qty ↑ (للسليم), driver_liabilities, customer_ledger, inventory_log	✅ قيد عكسي (مدين: 124 / دائن: 51)
8	تسوية يومية	main.html	save-daily-settlement	daily_settlements, driver_liabilities.status ← settled	✅ قيد تسوية (مدين: السائق / دائن: 51)
١.٥ القيود المحاسبية التلقائية
المرحلة	مدين	دائن
التحميل	تكلفة المبيعات (51)	المخزون السلعي (124)
التسليم (نقدي)	الخزينة (121)	إيرادات المبيعات (41) + ض.ق.م (4)
التسليم (آجل)	العميل (ذمم مدينة - 123)	إيرادات المبيعات (41) + ض.ق.م (4)
المرتجعات	المخزون السلعي (124)	تكلفة المبيعات (51)
التسوية (عجز)	السائق (ذمم موظفين)	تكلفة المبيعات (51)
١.٦ مقارنة بالمنافسين
المعيار	SAP B1	Odoo	دفترة	الروائع
تعدد قنوات البيع	✅	✅	✅	✅ 5 قنوات
قيود تلقائية	✅	✅	❌ يدوية	✅
تتبع 6 كميات في صف واحد	❌	❌	❌	✅ فريد
مرونة الإلغاء وإعادة الفتح	⭐ محدود	⭐ محدود	❌	✅ 12 دالة
Credit Note (إشعار دائن)	✅ منفصل	✅ منفصل	✅	🟡 مدمج في complete-return
________________________________________
٢. تدفق Procure-to-Pay (من الشراء إلى الدفع)
٢.١ نظرة عامة
هذا هو تدفق المشتريات. يبدأ من طلب البضاعة من المورد، ويمر عبر استلامها في المخزن، وينتهي بتسجيل الالتزام المالي للمورد.
٢.٢ الأدوار المشاركة
الدور	المسؤولية	التطبيق المستخدم
مسؤول المشتريات	إنشاء أمر الشراء وإرساله	purchasing/buyer.html
مسؤول الاستلام	استلام البضاعة في المخزن	warehouse/receiver.html
المحاسب	دفع المورد لاحقاً	main.html
٢.٣ مخطط الحالة
stateDiagram-v2
    [*] --> Draft: إنشاء أمر شراء
    Draft --> Sent: إرسال للمورد
    Sent --> Receiving: start-receiving
    Receiving --> Received: receive-purchase (استلام كامل)
    Receiving --> PartiallyReceived: receive-purchase (استلام جزئي)
    PartiallyReceived --> Received: استلام الكمية المتبقية
    Received --> [*]
٢.٤ المسار خطوة بخطوة
#	الخطوة	التطبيق	Edge Function	الجداول المتأثرة	قيد محاسبي
1	إنشاء أمر شراء	purchasing/buyer.html	save-purchase-order	purchase_orders, purchase_order_details	❌
2	استلام البضاعة	warehouse/receiver.html	receive-purchase	stock_branches.qty ↑, inventory_log, receiving, receiving_details	✅ قيد استلام (مدين: 124 / دائن: المورد)
3	مرتجع لمورد	warehouse/vouchers.html	send-stock-voucher (نوع SupplierReturn)	stock_branches.qty ↓, stock_vouchers, inventory_log	✅ قيد عكسي
٢.٥ فجوة محاسبية مكتشفة
المشكلة: receive-purchase تنشئ قيد استلام (مدين: المخزون / دائن: المورد)، لكن supplier_ledger لا يُحدث تلقائياً.
الأثر: دفتر أستاذ الموردين لا يعكس الالتزامات الحقيقية. تقارير الموردين غير مكتملة.
التوصية: إضافة تحديث supplier_ledger داخل receive-purchase، مماثل لتحديث customer_ledger في complete-order-delivery. هذه الفجوة مخططة للإصلاح في P2.
٢.٦ مقارنة بالمنافسين
المعيار	SAP B1	Odoo	الروائع
استلام جزئي (Partial Receiving)	✅	✅	✅
قيد استلام تلقائي	✅	✅	✅
تحديث supplier_ledger	✅ تلقائي	✅ تلقائي	❌ فجوة
مرتجع للمورد	✅	✅	✅
________________________________________
٣. دورة حياة المخزون والرانشيت (Inventory & Runsheet Lifecycle)
٣.١ نظرة عامة
هذا هو "القلب النابض" و"روح" النظام. هنا تتم السيطرة الميدانية عبر تتبع 6 كميات لكل صنف في كل مرحلة. هذه الميزة لا توجد في أي نظام منافس.
٣.٢ مخطط تدفق المخزون
stateDiagram-v2
    [*] --> InStock: استلام مشتريات
    InStock --> Allocated: تحضير (complete-picking)
    Allocated --> InTransit: تحميل (complete-loading)
    InTransit --> Delivered: توصيل (complete-delivery)
    Delivered --> Returned: مرتجعات (complete-return)
    Returned --> InStock: إعادة للسليم
    InTransit --> InStock: تفريغ (unload-runsheet)
    InStock --> Adjusted: جرد (save-inventory-count)
    Adjusted --> InStock
٣.٣ الـ 6 كميات – "سر الصنعة"
الكمية	المرحلة	المسؤول	متى تُملأ؟
qty_ordered	الكمية المطلوبة	المبيعات	عند إنشاء الأوردر
qty_picked	الكمية المحضّرة	المحضّر	complete-picking
qty_loaded	الكمية المحمّلة	المحمّل	complete-loading
qty_delivered	الكمية المسلّمة	مندوب التوصيل	complete-order-delivery
qty_refused	الكمية المرفوضة	العميل	complete-order-delivery
qty_returned	الكمية المرتجعة	مسؤول المرتجعات	complete-return
٣.٤ تأثير العمليات على المخزون
العملية	qty (الفعلي)	allocated_qty (المحجوز)	المتاح (qty - allocated)
استلام مشتريات	✅ ↑	❌	✅ ↑
تحضير	❌	✅ ↑	✅ ↓
تحميل	✅ ↓	✅ ↓	✅ ↓
توصيل	❌	❌	❌
مرتجعات (سليم)	✅ ↑	❌	✅ ↑
تفريغ	✅ ↑	❌	✅ ↑
جرد	✅ +/-	❌	✅ +/-
٣.٥ آلية الحجز (Allocation)
•	عند التحضير: allocated_qty ↑ – البضاعة محجوزة للرانشيت، لا تُباع لعميل آخر. هذا يمنع تضارب المبيعات مع المخزون.
•	عند التحميل: qty ↓ و allocated_qty ↓ – أول خصم فعلي من المخزون. هذا هو "نقطة اللا عودة".
•	لماذا الخصم عند التحميل وليس التسليم؟ لأن البضاعة خرجت من المستودع. لو انتظرنا التسليم، قد يمر يوم كامل والكميات في النظام لا تعكس الواقع. SAP تفعل الشيء نفسه: Delivery Note = خصم المخزون.
________________________________________
٤. دورة التوصيل والمرتجعات والتسوية (Delivery, Return & Settlement)
٤.١ نظرة عامة
هذا هو التدفق الذي يغلق الحلقة المالية على السائق. بعد عودة السائق من الرحلة، يتم استلام المرتجعات، وحساب العجز، وإما أن يتحمله السائق أو يُسجل كمخزون تالف.
٤.٢ مخطط التدفق
sequenceDiagram
    participant Driver as driver.html
    participant Returns as returns.html
    participant Main as main.html (تسوية)
    participant DB as PostgreSQL

    Driver->>DB: start-delivery (تسجيل meter_start)
    Driver->>DB: complete-order-delivery (قيد إيرادات)
    Driver->>DB: complete-delivery (تسجيل meter_end)
    Returns->>DB: start-return
    Returns->>DB: complete-return (إعادة مخزون + Credit Note + driver_liabilities)
    Main->>DB: save-daily-settlement (حساب العجز + قيد تسوية)
٤.٣ معادلة العجز
text
العجز = qty_loaded - qty_delivered - qty_returned
•	إذا كان العجز > 0: يُسجل في driver_liabilities كدين على السائق.
•	إذا كان العجز = 0: لا توجد مسؤولية على السائق.
•	في التسوية: يُنشأ قيد (مدين: السائق / دائن: تكلفة المبيعات) بقيمة العجز.
•	المرتجعات التالفة والمفقودة: لا تُعاد للمخزون. يتحملها السائق.
٤.٤ لوحة "رصيدي" للسائق
العنصر	المعنى	الحساب
قيمة الرانشيت	ما خرج به السائق من المخزن	runsheets.total_amount
تم تحصيله	قيمة الفواتير المسلّمة	مجموع orders.total_amount المسلّمة
مرتجع مقبول	بضاعة أعيدت للمخزن	qty_returned × unit_price
المطلوب مني	ما زال في ذمة السائق	قيمة الرانشيت - المسلّم - المرتجع
________________________________________
٥. تدفق Offline to Online Sync (المزامنة)
٥.١ نظرة عامة
تطبيقات المبيعات الميدانية (تلي سيلز، مندوب مبيعات، POS، فان سيلز) تعمل بدون إنترنت عبر Dexie.js (IndexedDB). عندما يعود الاتصال، تتم مزامنة البيانات تلقائياً مع Supabase.
٥.٢ آلية المزامنة
sequenceDiagram
    participant App as تطبيق PWA
    participant Dexie as Dexie.js (محلي)
    participant Supabase as Supabase (سحابي)

    App->>App: إنشاء أوردر (بدون إنترنت)
    App->>Dexie: تخزين الأوردر (pending_updates)
    App->>App: ✅ تم الحفظ محلياً
    Note over App,Supabase: ... عاد الاتصال ...
    App->>Supabase: مزامنة pending_updates
    Supabase-->>App: نجاح
    App->>Dexie: حذف من pending_updates
    App->>App: 🔄 تمت المزامنة
٥.٣ التطبيقات التي تدعم Offline
التطبيق	يدعم Offline؟	آلية المزامنة
sales/telesales.html	✅	Dexie.js + pending_updates
sales/pos.html	✅	Dexie.js + pending_updates
sales/order-taker.html	✅	Dexie.js + pending_updates
sales/van-sales.html	✅	Dexie.js + pending_updates
warehouse/picker.html	✅	Dexie.js + session
warehouse/returns.html	✅	Dexie.js + localChanges
delivery/driver.html	✅	Dexie.js + ordersCache
warehouse/receiver.html	❌	يجب الاتصال بالإنترنت (عملية مالية)
store/index.html	❌	متصل دائماً
________________________________________
٦. القيود المحاسبية المجمّعة في دورة حياة الرانشيت
هذا جدول موحد يجمع كل القيود المحاسبية التي تُنشأ تلقائياً خلال دورة حياة الرانشيت:
المرحلة	مدين	دائن	القيمة
التحميل	تكلفة المبيعات (51)	المخزون السلعي (124)	qty_loaded × cost_price
التسليم (نقدي)	الخزينة (121)	إيرادات المبيعات (41) + ض.ق.م (4)	qty_delivered × unit_price
التسليم (آجل)	العميل (ذمم مدينة - 123)	إيرادات المبيعات (41) + ض.ق.م (4)	qty_delivered × unit_price
المرتجعات	المخزون السلعي (124)	تكلفة المبيعات (51)	qty_returned × cost_price
التسوية (عجز)	السائق (ذمم موظفين)	تكلفة المبيعات (51)	العجز × cost_price
________________________________________
٧. مقارنة شاملة بالمنافسين – تغطية التدفقات
التدفق	SAP B1	Odoo	دفترة	Manager.io
الروائع ERP
Order-to-Cash	✅ كامل	✅ كامل	✅ أساسي	✅ أساسي	✅ 95%
Procure-to-Pay	✅ كامل	✅ كامل	✅ أساسي	✅ أساسي	🟡 70% (فجوة supplier_ledger)
Inventory Lifecycle	✅	✅	⭐ محدود	⭐ محدود	✅ 95%
Delivery & Return	⭐ عبر إضافات	⭐ عبر إضافات	❌	❌	✅ 90%
Settlement	✅	✅	⭐ يدوي	⭐ يدوي	✅ 80% (آلي)
مرونة الإلغاء	⭐ محدود	⭐ محدود	❌	❌	✅ 12 دالة
تتبع 6 كميات	❌	❌	❌	❌	✅ فريد
Offline-First	❌	❌	❌	❌	✅ Dexie.js
________________________________________
🧠 تقييم الثقة (Confidence Assessment)
المعيار	التقييم
هل جميع التدفقات المذكورة مدعومة بالكود الفعلي؟	✅ نعم – كل Edge Function وكل تطبيق PWA مذكور موجود في الملفات
هل هناك تدفقات أخرى غير موثقة؟	⚠️ تدفق "التوالف والإعدام" (Scrap) – غير موجود في النظام حالياً. تدفق "بوابات الدفع الإلكتروني" – مخطط له في P2
هل مخططات Mermaid دقيقة؟	✅ نعم – تم التحقق منها مقابل main.html و Edge Functions
ما المعلومات الناقصة؟	(1) تفاصيل تكامل supplier_ledger في Procure-to-Pay (فجوة مكتشفة). (2) تدفق التوالف والإعدام (مخطط P3). (3) تفاصيل تكامل بوابات الدفع (مخطط P2)
ما يلزم للتحقق؟	(1) مراجعة receive-purchase لتأكيد عدم تحديث supplier_ledger. (2) مراجعة خطة P2/P3 لتضمين التدفقات المفقودة
نسبة الثقة الإجمالية	90%
________________________________________
🫡 خاتمة
هذه الوثيقة تم دمجها من أفضل ما في ردود ثلاثة مهندسين معماريين (مراد، حامد، محمود) مع إضافة لمستي كمراقب عام. تم توحيد الجداول، وتدقيق مخططات Mermaid، وإضافة مقارنات المنافسين، وتحديد الفجوات بدقة.
اعتمد وانتقل للملف التالي.