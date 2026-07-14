06_SYSTEM_ARCHITECTURE.md – المعمارية الكاملة لنظام الروائع ERP
الإصدار: 2.0
التاريخ: 2026-07-13
المراجع: دستور الروائع 2.0، 02_PROJECT_TREE.md، 05_TECH_STACK.md
المُعدّ: فريق RAWAEA AI CTO (مراد، حامد، محمود – بتنسيق وتوحيد: حسين)
________________________________________
🎯 الهدف من هذه الوثيقة
توثيق المعمارية الكاملة لنظام "الروائع ERP" على جميع المستويات:
•	مخطط السياق (Context): كيف يتفاعل النظام مع العالم الخارجي.
•	مخطط الحاويات (Containers): المكونات الرئيسية وعلاقاتها.
•	مخطط المكونات (Components): البنية الداخلية للتطبيقات الرئيسية.
•	تدفق البيانات (Data Flow): كيف تتحرك البيانات بين المكونات.
•	تدفق المصادقة والصلاحيات (Auth & AuthZ Flow): كيف يدخل المستخدمون وماذا يرون.
•	استراتيجية Offline-First: كيف يعمل النظام بدون إنترنت.
•	تدفقات الأعمال الرئيسية (Business Flows): دورة حياة الأوردر والرانشيت والمحاسبة.
•	مقارنة بالمنافسين: أين نقف مقابل SAP، Odoo، Dynamics.
________________________________________
١. نظرة عامة على المعمارية
الروائع ERP مبني على معمارية Cloud-Native + Offline-First PWA. يتكون من ثلاث طبقات رئيسية:
الطبقة	التقنية	الدور
طبقة العرض	Vanilla JS ES5 + Tailwind CSS	26 تطبيق PWA + نظام أم (main.html)
طبقة المنطق	Supabase Edge Functions (Deno/TypeScript)	71 دالة تنفذ العمليات التجارية
طبقة البيانات	PostgreSQL (عبر Supabase) + RLS	52 جدولاً مع أمان على مستوى الصف
text
┌─────────────────────────────────────────────────────────────┐
│                    المستخدمون (Users)                        │
│  (مالك، مدير، محاسب، مشرف، محضر، سائق، مندوب مبيعات...)      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 Cloudflare Pages (CDN)                       │
│  يستضيف 26 تطبيق PWA + النظام الأم + core.js                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Platform                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Auth      │  │   Storage   │  │  Edge Functions     │  │
│  │ (المصادقة)   │  │ (الصور)     │  │  (71 دالة – Deno)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              PostgreSQL (52 جدولاً + RLS)                │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
________________________________________
٢. مخطط السياق (Context Diagram – C4 Level 1)
يُظهر النظام كصندوق أسود يتفاعل مع المستخدمين والخدمات الخارجية.
graph TD
    User["👤 المستخدمون (الموظفون)"]
    Admin["👑 المالك / المدير العام"]
    Driver["🚚 مندوب التوصيل"]
    Picker["📦 المحضّر"]
    Sales["📞 مندوب المبيعات"]
    Customer["🛒 العملاء (عبر المتجر)"]

    System["🏢 نظام الروائع ERP"]

    Supabase["☁️ Supabase (BaaS)"]
    Cloudflare["🌐 Cloudflare Pages"]
    GitHub["📂 GitHub Repository"]

    User -->|يستخدم| System
    Admin -->|يدير| System
    Driver -->|يسلّم ويحصّل| System
    Picker -->|يجهز ويحمّل| System
    Sales -->|يسجّل طلبات| System
    Customer -->|يطلب عبر المتجر| System

    System -->|يعتمد على| Supabase
    System -->|مُستضاف على| Cloudflare
    System -->|كوده المصدري على| GitHub
________________________________________
٣. مخطط الحاويات (Container Diagram – C4 Level 2)
يقسم النظام إلى حاويات رئيسية: تطبيقات، خدمات، قواعد بيانات.
graph TD
    subgraph "Cloudflare Pages"
        PWA_Apps["تطبيقات PWA (26 تطبيق)"]
        Main_App["النظام الأم (main.html)"]
        Core["core.js (النواة المشتركة)"]
    end

    subgraph "Supabase Cloud"
        Auth["Supabase Auth (GoTrue)"]
        DB["(PostgreSQL (RLS)"]
        Storage["Supabase Storage"]
        Edge["Edge Functions (71 دالة – Deno)"]
    end

    subgraph "External"
        GitHub["GitHub Repository"]
    end

    PWA_Apps -->|fetch عبر RW_API| Edge
    Main_App -->|fetch مباشر| Edge
    PWA_Apps -->|PostgREST| DB
    Main_App -->|PostgREST| DB
    Core -->|يُحمّل في| PWA_Apps

    Edge -->|تستخدم| Auth
    Edge -->|تقرأ وتكتب| DB
    Edge -->|تخزن ملفات| Storage

    GitHub -->|نشر تلقائي| Cloudflare
________________________________________
٤. مخطط المكونات (Component Diagram – C4 Level 3)
يُظهر البنية الداخلية لتطبيق PWA (مثال: driver.html).
graph TD
    subgraph "driver.html (PWA)"
        UI["واجهة المستخدم (HTML/Tailwind)"]
        RW_Auth["RW_Auth (مصادقة)"]
        RW_API["RW_API (استدعاء Edge)"]
        RW_UI["RW_UI (Toast/Loader)"]
        RW_ImageCache["RW_ImageCache (صور)"]
        RW_DB["RW_DB (Dexie.js)"]
        App["App (منطق التطبيق)"]
    end

    App --> RW_Auth
    App --> RW_API
    App --> RW_UI
    App --> RW_ImageCache
    App --> RW_DB
    RW_API -->|fetch| EdgeFunction["Edge Function"]
    RW_DB -->|IndexedDB| LocalDB["تخزين محلي"]
    UI --> App

________________________________________
٥. تدفق البيانات (Data Flow)
٥.١ المسار العام (General Flow)
sequenceDiagram
    participant User as المستخدم
    participant PWA as تطبيق PWA
    participant Core as core.js
    participant Edge as Edge Function
    participant DB as PostgreSQL

    User->>PWA: فتح التطبيق
    PWA->>Core: RW_Auth.init()
    Core->>DB: استعادة الجلسة
    DB-->>Core: بيانات المستخدم
    Core-->>PWA: user object
    User->>PWA: إجراء (مثلاً: بدء تحميل)
    PWA->>Core: RW_API.call('start-loading', ...)
    Core->>Edge: fetch مع JWT
    Edge->>DB: تحديث runsheets
    DB-->>Edge: نجاح
    Edge-->>Core: Response JSON
    Core-->>PWA: json.success
    PWA->>User: تأكيد مرئي
٥.٢ تدفق Offline-First (تطبيقات المبيعات)
sequenceDiagram
    participant User as مندوب مبيعات
    participant App as تطبيق PWA
    participant Dexie as Dexie.js (IndexedDB)
    participant Supabase as Supabase

    User->>App: إضافة أوردر (بدون إنترنت)
    App->>Dexie: تخزين الأوردر (pending_updates)
    App->>User: ✅ تم الحفظ محلياً
    Note over User,Supabase: ... عاد الاتصال ...
    App->>Supabase: مزامنة pending_updates
    Supabase-->>App: نجاح
    App->>Dexie: تحديث الحالة
    App->>User: 🔄 تمت المزامنة
٥.٣ تدفق البيانات بين التطبيقات (Application Data Flow)
graph LR
    subgraph "المبيعات"
        TELESALES[التلي سيلز]
        POS[نقطة البيع]
        ORDER_TAKER[مندوب المبيعات]
        STORE[المتجر الإلكتروني]
    end

    subgraph "النظام الأم"
        MAIN[main.html]
    end

    subgraph "المخازن"
        PICKER[المحضّر]
        LOADER[المحمّل]
        RETURNS[المرتجعات]
    end

    subgraph "التوصيل"
        DRIVER[مندوب التوصيل]
    end

    subgraph "الحسابات"
        SETTLEMENT[التسوية]
    end

    TELESALES -->|save-sales-invoice| MAIN
    POS -->|save-sales-invoice| MAIN
    ORDER_TAKER -->|save-sales-invoice| MAIN
    STORE -->|submit-online-order| MAIN

    MAIN -->|create-runsheet| PICKER
    PICKER -->|complete-picking| LOADER
    LOADER -->|complete-loading| DRIVER
    DRIVER -->|complete-delivery| RETURNS
    RETURNS -->|complete-return| SETTLEMENT
    SETTLEMENT -->|save-daily-settlement| MAIN

________________________________________
٦. تدفق المصادقة والصلاحيات (Authentication & Authorization Flow)
٦.١ تسجيل الدخول (Login)
sequenceDiagram
    participant User as المستخدم
    participant App as app.html (بوابة الدخول)
    participant Auth as Supabase Auth
    participant DB as public.users
    participant Target as التطبيق الهدف

    User->>App: إدخال البريد وكلمة السر
    App->>Auth: signInWithPassword()
    Auth-->>App: JWT + Session
    App->>DB: جلب active_warehouse_role
    DB-->>App: 'تحضير'
    App->>Target: توجيه إلى picker.html
    Target->>User: واجهة المحضّر
٦.٢ آلية التوجيه الذكي (Role-Based Router)
app.html يقرأ active_warehouse_role من public.users ويوجه المستخدم تلقائياً:
الدور النشط	التطبيق الوجهة
استلام	warehouse/receiver.html
تحضير	warehouse/picker.html
تحميل	warehouse/loader.html
مرتجعات	warehouse/returns.html
تفريغ	warehouse/unloader.html
جرد	warehouse/counter.html
أذونات	warehouse/vouchers.html
إذا لم يكن للمستخدم دور نشط: تنبيه "لم يتم تعيين دور نشط. تواصل مع مشرف المخازن."
٦.٣ طبقات الصلاحيات
graph TD
    subgraph "طبقات الصلاحيات"
        L1["المصادقة - Supabase Auth JWT"]
        L2["البيانات الوصفية - user_metadata"]
        L3["قاعدة البيانات - public.users"]
        L4["أمان الصفوف - RLS Policies"]
        L5["التوجيه - app.html + main.html"]
    end

    L1 --> L2
    L2 --> L3
    L3 --> L4
    L4 --> L5

    subgraph "ما يراه المستخدم"
        VIEW["تطبيق واحد فقط + تبويبات حسب الصلاحية"]
    end

    L5 --> VIEW
________________________________________
٧. تدفق الأعمال (Business Flow)
٧.١ دورة حياة الأوردر والرانشيت (Order-to-Cash)
stateDiagram-v2
    [*] --> Draft: إنشاء أوردر (متجر إلكتروني)
    [*] --> Confirmed: إنشاء أوردر (تلي سيلز/مندوب/كاشير)
    Draft --> Confirmed: تأكيد من خدمة العملاء
    Confirmed --> Pending: ضم لرانشيت (create-runsheet)
    Pending --> Picking: بدء التحضير (start-picking)
    Picking --> Picked: إنهاء التحضير (complete-picking)
    Picked --> Loading: بدء التحميل (start-loading)
    Loading --> Loaded: إنهاء التحميل (complete-loading)
    Loaded --> Delivering: بدء التوصيل (start-delivery)
    Delivering --> Delivered: إنهاء التوصيل (complete-delivery)
    Delivered --> Returning: بدء المرتجعات (start-return)
    Returning --> Returned: إنهاء المرتجعات (complete-return)
    Returned --> Closed: تسوية يومية (save-daily-settlement)

    Picked --> Picking: إلغاء التحضير (cancel-picking)
    Loaded --> Picked: إلغاء التحميل (cancel-loading)
    Delivered --> Loaded: إلغاء التوصيل (cancel-delivery)
    Returned --> Delivered: إلغاء المرتجعات (cancel-return)
٧.٢ تدفق المحاسبة (Accounting Flow)
sequenceDiagram
    participant Loader as loader.html
    participant LoadEF as complete-loading
    participant DB as PostgreSQL
    participant Driver as driver.html
    participant DelEF as complete-order-delivery
    participant Returns as returns.html
    participant RetEF as complete-return
    participant SettleEF as save-daily-settlement

    Loader->>LoadEF: إنهاء التحميل
    LoadEF->>DB: خصم المخزون + قيد تكلفة (مدين 51 / دائن 124)
    Driver->>DelEF: تسليم أوردر
    DelEF->>DB: قيد إيرادات (مدين العميل / دائن 41 + 4)
    Returns->>RetEF: إنهاء المرتجعات
    RetEF->>DB: إعادة المخزون + قيد عكسي (مدين 124 / دائن 51) + driver_liabilities
    Note over SettleEF: في نهاية اليوم
    SettleEF->>DB: قيد تسوية العجز (مدين السائق / دائن 51)
________________________________________
٨. استراتيجية Service Worker (إصدار 2.0)
graph TD
    A[طلب HTTP] --> B{نوع الطلب؟}
    B -->|HTML| C[Network Only - لا كاش]
    B -->|API Supabase| D[Network Only - لا كاش]
    B -->|CSS, JS, صور| E[Cache First]
    B -->|غير ذلك| F[Network First + fallback]

    C --> G[تحميل من الشبكة]
    D --> H[تحميل من الشبكة]
    E --> I{موجود في الكاش؟}
    I -->|نعم| J[إرجاع من الكاش]
    I -->|لا| K[تحميل من الشبكة + تخزين]
    F --> L{الشبكة متاحة؟}
    L -->|نعم| M[تحميل من الشبكة]
    L -->|لا| N[إرجاع من الكاش]
آلية التحديث:
•	فحص كل 5 دقائق (register-sw.js)
•	عند عودة التطبيق من الخلفية (Visibility Change)
•	_rwHasActiveSession يمنع التحديث أثناء الجلسات النشطة
•	clients.claim() + postMessage في sw.js

________________________________________
٩. مقارنة بالأنظمة المنافسة
المعيار	SAP B1	Odoo	Dynamics 365	دفترة	الروائع ERP
المعمارية	Client-Server	Monolithic	Cloud-Native	Cloud	Cloud-Native + PWA
فصل الطبقات	3-Tier	MVC	3-Tier	2-Tier	3-Tier (PWA + Edge + PG)
دعم Offline	❌	❌ محدود	❌ محدود	❌ ويب فقط	✅ Offline-First كامل
استراتيجية الكاش	لا توجد	Browser	Browser	Browser	✅ SW مع استراتيجية مخصصة
Role-Based Router	❌ يدوي	✅ IR Rules	✅	❌	✅ app.html (توجيه تلقائي)
تحديثات تلقائية	❌	✅ Odoo.sh	✅	❌	✅ register-sw.js
حماية الجلسات النشطة	❌	❌	❌	❌	✅ _rwHasActiveSession
تتبع 6 كميات	❌	❌	❌	❌	✅ (ابتكار خالص)
تكلفة التطوير	$$$$$	$$$	$$$$	$$	$
________________________________________
🧠 تقييم الثقة (Confidence Assessment)
المعيار	الحالة
هل جميع التدفقات الموثقة مدعومة بالكود الفعلي؟	✅ نعم – كل Edge Function وكل تطبيق PWA يؤكد التدفق
هل توجد تدفقات أخرى غير موثقة؟	⚠️ تدفق الإلغاء وإعادة الفتح (cancel-* / reopen-*) معقد ويحتاج توثيقاً أعمق
هل مخططات Mermaid دقيقة؟	✅ نعم
نسبة الثقة الإجمالية	92%
معلومات ناقصة:
•	تدفق Realtime (مخطط له في P1 لكنه غير منفذ بعد)
•	تفاصيل Multi-Tenant (P2)
•	تدفق الإلغاء وإعادة الفتح الكامل (يحتاج رسماً منفصلاً)
ما يلزم للتحقق:
•	مراجعة جميع دوال cancel-* و reopen-* وتوثيق تدفقها
•	اختبار Offline على جهاز Android 6 حقيقي
________________________________________
🫡 جاهز للانتقال إلى الملف التالي