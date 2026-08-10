<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>المحمّل | الروائع ERP</title>
    <link rel="manifest" href="../manifest.json">
    <meta name="theme-color" content="#ea580c">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="https://cdn.jsdelivr.net/npm/dexie@3/dist/dexie.min.js"></script>
    <script src="../core.js"></script>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Cairo',sans-serif;background:#f8fafc;-webkit-tap-highlight-color:transparent}
        .auth-container{background:linear-gradient(135deg,#7c2d12 0%,#9a3412 40%,#ea580c 100%)}
        .card{background:#fff;border-radius:24px;padding:1.25rem;box-shadow:0 1px 3px rgba(0,0,0,0.02),0 8px 24px rgba(0,0,0,0.03);transition:all 0.2s ease}
        .card:active{transform:scale(0.985);background:#fafafa}
        .btn-primary{background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;padding:1rem 1.5rem;border-radius:16px;font-weight:700;border:none;cursor:pointer;width:100%;box-shadow:0 4px 12px rgba(234,88,12,0.25)}
        .btn-primary:active{transform:scale(0.97)}
        .btn-danger{background:linear-gradient(135deg,#ef4444,#f87171);color:#fff;padding:0.75rem 1.25rem;border-radius:14px;font-weight:700;border:none;cursor:pointer;transition:all 0.2s ease;box-shadow:0 4px 12px rgba(239,68,68,0.2)}
        .btn-reopen{background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#fff;padding:0.75rem 1.25rem;border-radius:14px;font-weight:700;border:none;cursor:pointer;transition:all 0.2s ease;box-shadow:0 4px 12px rgba(245,158,11,0.2)}
        .tab-btn{transition:all 0.2s ease}
        .progress-bar{transition:width 0.4s ease}
        .slide-in{animation:slideIn 0.3s ease}
        @keyframes slideIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .skeleton{background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:12px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    </style>
</head>
<body class="h-screen flex flex-col overflow-hidden">

<div id="loginScreen" class="fixed inset-0 z-[100] flex items-center justify-center auth-container p-4">
    <div class="bg-white rounded-[36px] shadow-2xl p-6 w-[92%] max-w-md slide-in">
        <div class="text-center mb-6">
            <div class="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-700 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-orange-200 mb-5">
                <i class="fa-solid fa-truck-ramp-box text-white text-3xl"></i>
            </div>
            <h1 class="font-black text-2xl text-slate-800">الروائع</h1>
            <p class="text-sm text-slate-400 font-semibold mt-1">المحمّل</p>
        </div>
        <div class="space-y-4">
            <div><input id="loginEmail" type="email" placeholder="البريد الإلكتروني" class="w-full p-3.5 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-orange-500 outline-none font-semibold text-sm"></div>
            <div class="relative"><input id="loginPass" type="password" placeholder="كلمة السر" class="w-full p-3.5 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-orange-500 outline-none font-semibold text-sm pr-12"><button type="button" onclick="togglePass()" class="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-slate-300"><i id="passIcon" class="fa-solid fa-eye"></i></button></div>
        </div>
        <button onclick="doLogin()" class="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg mt-6">تسجيل الدخول</button>
        <p id="loginMsg" class="text-center text-xs text-red-500 font-bold mt-4 hidden"></p>
    </div>
</div>

<div id="mainApp" class="hidden flex flex-col h-full">
    <header class="bg-gradient-to-r from-orange-700 to-orange-600 text-white p-4 flex items-center justify-between sticky top-0 z-30 shadow-md flex-shrink-0">
        <span class="font-black text-base">🚛 المحمّل</span>
        <div class="flex items-center gap-2"><span class="text-xs font-bold" id="headerUserName"></span><button onclick="doLogout()" class="bg-white/15 w-9 h-9 rounded-full"><i class="fa-solid fa-arrow-right-from-bracket text-xs"></i></button></div>
    </header>

    <div class="flex gap-1.5 p-2 bg-white border-b border-slate-100 overflow-x-auto flex-shrink-0">
        <button onclick="switchTab('pending')" class="tab-btn whitespace-nowrap px-5 py-2.5 rounded-2xl font-bold text-sm bg-orange-600 text-white shadow-sm shadow-orange-200" id="tab-pending">🚛 قيد التحميل</button>
        <button onclick="switchTab('completed')" class="tab-btn whitespace-nowrap px-5 py-2.5 rounded-2xl font-bold text-sm text-slate-400" id="tab-completed">✅ مكتملة</button>
        <button onclick="switchTab('account')" class="tab-btn whitespace-nowrap px-5 py-2.5 rounded-2xl font-bold text-sm text-slate-400" id="tab-account">⚙️ حسابي</button>
    </div>

    <main id="mainContent" class="flex-1 overflow-y-auto p-4"></main>
</div>

<script>
var App = {
    currentUser: null, pubUserId: null, currentTab: 'pending',
    session: null, timerInterval: null, searchTimer: null,
    allRunsheets: [], searchResults: [], completedRunsheets: [],

    init: function() {
        var self = this;
        RW_Auth.init(function(user, err) {
            if (err || !user) { if (err !== 'NO_SESSION') RW_UI.showError('فشل استعادة الجلسة'); return; }
            var isOwner = user.isOwner, perms = user.permissions;
            if (!isOwner && (!perms || perms.indexOf('warehouse') === -1)) { RW_UI.showError('غير مصرح'); RW_Auth.doLogout(); return; }
            self.currentUser = user;
            if (!isOwner && user.activeWarehouseRole !== 'تحميل') { RW_UI.showError('دورك النشط هو "' + (user.activeWarehouseRole || 'غير محدد') + '"', function() { RW_Auth.doLogout(); }); return; }
            RW_UI.safeText(RW_UI.byId('headerUserName'), user.name);
            RW_UI.byId('loginScreen').classList.add('hidden'); RW_UI.byId('mainApp').classList.remove('hidden');
            RW_ImageCache.loadAll(); self.switchTab('pending');
        });
    },

    switchTab: function(tab) {
        this.currentTab = tab;
        ['pending','completed','account'].forEach(function(t) { var b = RW_UI.byId('tab-'+t); if(b) { b.classList.remove('bg-orange-600','text-white','shadow-sm','shadow-orange-200'); b.classList.add('text-slate-400'); } });
        var a = RW_UI.byId('tab-'+tab); if(a) { a.classList.add('bg-orange-600','text-white','shadow-sm','shadow-orange-200'); a.classList.remove('text-slate-400'); }
        if (tab === 'pending') this.renderPendingTab();
        else if (tab === 'completed') this.renderCompletedTab();
        else if (tab === 'account') this.renderAccount();
    },

    renderPendingTab: function() {
        var self = this; RW_UI.showSkeleton('mainContent', 3, 'card');
        Promise.all([
            supabase.from('runsheets').select('runsheet_code, status, run_date, loader_id, run_sheet_details(count)').eq('status','Loading').eq('loader_id',this.currentUser.id||this.currentUser.email).order('run_date',{ascending:false}).limit(20),
            supabase.from('runsheets').select('runsheet_code, status, run_date, run_sheet_details(count)').eq('status','Picked').order('run_date',{ascending:false}).limit(50)
        ]).then(function(r) { self.allRunsheets = (r[0].data||[]).concat(r[1].data||[]); self.renderRunsheetLists(r[0].data||[], r[1].data||[]); })
          .catch(function() { RW_UI.showEmptyState('mainContent','فشل تحميل البيانات','📡'); });
    },

    renderRunsheetLists: function(my, av) {
        var h = '', u = this.currentUser.name||'زميل', hr = new Date().getHours();
        h += '<div class="mb-4"><p class="text-slate-400 text-sm">' + (hr<12?'صباح الخير':(hr<18?'مساء الخير':'مساء الخير')) + '، <span class="font-bold text-slate-700">' + u + '</span> 👋</p></div>';
        h += '<div class="relative mb-6"><input type="text" id="searchRunsheet" placeholder="🔍 ابحث عن رقم رانشيت..." class="w-full p-4 bg-white rounded-2xl border-2 border-slate-100 focus:border-orange-400 outline-none font-semibold text-sm shadow-sm" oninput="App.onSearchInput(this.value)"><div id="searchDropdown" class="absolute top-full left-0 right-0 bg-white rounded-2xl mt-2 hidden z-40 shadow-lg max-h-60 overflow-y-auto"></div></div>';
        if (my.length) { h += '<h2 class="text-lg font-black text-slate-800 mb-3">📌 مهامي النشطة</h2>'; for (var i=0;i<my.length;i++) h += this._card(my[i],true); h += '<hr class="my-6 border-slate-100">'; }
        h += '<h2 class="text-lg font-black text-slate-800 mb-3">📋 مهام متاحة للتحميل</h2>';
        if (!av.length) h += '<div class="text-center py-12"><div class="text-6xl mb-4">☕</div><p class="text-slate-400 font-bold">لا توجد رانشيتات جاهزة للتحميل.</p><p class="text-slate-300 text-sm mt-1">استمتع بقهوتك حتى تجهز مهمة جديدة!</p></div>';
        else for (var j=0;j<av.length;j++) h += this._card(av[j],false);
        RW_UI.safeHTML(RW_UI.byId('mainContent'), h);
    },

    _card: function(rs, act) {
        var c = rs.runsheet_code||'', n = (rs.run_sheet_details&&rs.run_sheet_details[0])?rs.run_sheet_details[0].count:0;
        var icon = act?'🔄':'📦', lbl = act?'قيد التحميل':'جاهز', clr = act?'bg-amber-50 text-amber-600':'bg-blue-50 text-blue-600';
        var btn = act ? '<button onclick="event.stopPropagation();App.cancelLoading(\''+c+'\')" class="btn-danger mt-3 text-xs px-3 py-1.5"><i class="fa-solid fa-xmark ml-1"></i> إلغاء التحميل</button>' : '';
        return '<div class="card mb-3 cursor-pointer slide-in" onclick="App.openRunsheet(\''+c+'\')"><div class="flex justify-between items-center"><div class="flex items-center gap-3"><span class="text-2xl">'+icon+'</span><div><span class="font-black text-base text-slate-800">'+c+'</span><p class="text-xs text-slate-400 mt-0.5">'+(rs.run_date||'')+' | عدد الأصناف: <span class="font-bold text-slate-600">'+n+'</span></p></div></div><div class="flex items-center gap-2"><span class="px-2.5 py-0.5 rounded-full text-xs font-bold '+clr+'">'+lbl+'</span><i class="fa-solid fa-chevron-left text-slate-300 text-xs"></i></div></div>'+btn+'</div>';
    },

    onSearchInput: function(q) {
        var s = this; if(this.searchTimer) clearTimeout(this.searchTimer);
        if(!q||!q.trim()) { var d=RW_UI.byId('searchDropdown'); if(d)d.classList.add('hidden'); return; }
        this.searchTimer = setTimeout(function() {
            supabase.from('runsheets').select('runsheet_code,status,run_date,loader_id,run_sheet_details(count)').or('status.eq.Picked,status.eq.Loading').ilike('runsheet_code','%'+q.trim()+'%').limit(10).then(function(r) { s.searchResults=r.data||[]; s.renderSearchDropdown(); });
        },300);
    },

    renderSearchDropdown: function() {
        var d = RW_UI.byId('searchDropdown'); if(!d) return;
        if(!this.searchResults.length) { RW_UI.safeHTML(d,'<div class="p-4 text-center text-slate-400 text-sm">🔍 لا يوجد رانشيت بهذا الرقم.</div>'); d.classList.remove('hidden'); return; }
        var h = '';
        for(var i=0;i<this.searchResults.length;i++) { var r=this.searchResults[i], n=(r.run_sheet_details&&r.run_sheet_details[0])?r.run_sheet_details[0].count:0, ic=r.status==='Loading'?'🔄':'📦', lb=r.status==='Loading'?'قيد التحميل':'جاهز', bg=r.status==='Loading'?'bg-amber-50':'bg-blue-50', tc=r.status==='Loading'?'text-amber-600':'text-blue-600';
            h += '<div onclick="App.openRunsheet(\''+r.runsheet_code+'\')" class="p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer flex justify-between items-center"><div><span class="font-bold text-slate-700">'+r.runsheet_code+'</span><br><span class="text-xs text-slate-400">'+(r.run_date||'')+' | '+n+' صنف</span></div><span class="px-2 py-0.5 rounded-full text-xs font-bold '+bg+' '+tc+'">'+ic+' '+lb+'</span></div>'; }
        RW_UI.safeHTML(d,h); d.classList.remove('hidden');
    },

    openRunsheet: function(code) {
        var self = this; var dd = RW_UI.byId('searchDropdown'); if(dd) dd.classList.add('hidden');
        RW_UI.showSkeleton('mainContent',3,'card');
        supabase.from('runsheets').select('*').eq('runsheet_code',code).maybeSingle().then(function(rsRes) {
            if(!rsRes.data) { RW_UI.toast('الرانشيت غير موجود','error'); self.renderPendingTab(); return; }
            var rs = rsRes.data;
            supabase.from('run_sheet_details').select('*').eq('runsheet_id',rs.id).then(function(detRes) {
                var items = detRes.data||[], isActive = (rs.status==='Loading'&&(rs.loader_id===self.currentUser.id||rs.loader_id===self.currentUser.email)), isAvail = (rs.status==='Picked');
                if(isActive) { self._startSession(code,rs,items); return; }
                if(isAvail) { self._showPreviewModal(code,rs,items); return; }
                self._renderReadonly(code,items);
            });
        });
    },

    _startSession: function(code, rs, items) {
        this.session = { runsheet_code:code, runsheet_id:rs.id, start_time:rs.loader_start||new Date().toISOString(), items:[] };
        for(var i=0;i<items.length;i++) { var it=items[i]; this.session.items.push({ item_code:it.item_code, item_name:it.item_name||'', unit:it.unit||'حبة', qty_ordered:Number(it.qty_ordered)||0, qty_picked:Number(it.qty_picked)||0, qty_loaded:Number(it.qty_loaded)||0, notes:it.notes||'' }); }
        this.renderActiveSession();
    },

    _showPreviewModal: function(code, rs, items) {
        var self = this, totalQty = 0, totalValue = 0;
        var h = '<div class="text-right space-y-4" style="max-height:70vh;overflow-y:auto;">';
        h += '<div class="bg-blue-50 p-4 rounded-2xl"><h3 class="font-black text-xl text-blue-800">'+code+'</h3><p class="text-xs text-slate-500">التاريخ: '+(rs.run_date||'')+' | الحالة: جاهز للتحميل</p></div>';
        h += '<table class="w-full text-sm border"><thead class="bg-slate-100"><tr><th class="p-2">الصنف</th><th class="p-2 text-center">الوحدة</th><th class="p-2 text-center">المحضّرة</th><th class="p-2 text-center">السعر</th><th class="p-2 text-center">الإجمالي</th></tr></thead><tbody>';
        for(var i=0;i<items.length;i++) { var it=items[i], q=Number(it.qty_picked)||0, p=Number(it.unit_price)||0, lt=q*p; totalQty+=q; totalValue+=lt;
            h += '<tr class="border-t"><td class="p-2 font-semibold">'+(it.item_name||'')+'</td><td class="p-2 text-center">'+(it.unit||'حبة')+'</td><td class="p-2 text-center font-bold">'+q+'</td><td class="p-2 text-center">'+RW_UI.formatNumber(p)+'</td><td class="p-2 text-center font-bold">'+RW_UI.formatNumber(lt)+'</td></tr>'; }
        h += '</tbody></table>';
        h += '<div class="bg-slate-50 rounded-2xl p-4 mt-3"><div class="grid grid-cols-2 gap-3 text-sm"><div><span class="text-slate-400">عدد الأصناف</span><p class="font-bold">'+items.length+'</p></div><div><span class="text-slate-400">إجمالي الكمية</span><p class="font-bold">'+totalQty+'</p></div><div><span class="text-slate-400">القيمة التقديرية</span><p class="font-bold text-blue-600">'+RW_UI.formatNumber(totalValue)+' EGP</p></div></div></div>';
        h += '<button onclick="App._startLoadingFromPreview(\''+code+'\')" class="btn-primary mt-4"><i class="fa-solid fa-play ml-2"></i> 🚛 بدء التحميل</button>';
        h += '</div>';
        Swal.fire({ title:'معاينة الرانشيت قبل التحميل', html:h, width:'700px', showCloseButton:true, showConfirmButton:false, customClass:{popup:'!rounded-3xl'} });
    },

    _startLoadingFromPreview: function(code) {
        Swal.close(); this.startLoading(code);
    },

    _renderReadonly: function(code, items) {
        var h = '<div class="flex items-center gap-3 mb-6"><button onclick="App.renderPendingTab()" class="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-orange-600 shadow-sm"><i class="fa-solid fa-arrow-right"></i></button><span class="font-black text-xl text-slate-800">'+code+' | '+items.length+' صنف</span></div>';
        for(var k=0;k<items.length;k++) { var it=items[k]; h += '<div class="card mb-2"><div class="flex items-center gap-4">'+RW_ImageCache.getImageHTML(it.item_code)+'<div><p class="font-bold text-slate-700">'+(it.item_name||'')+'</p><p class="text-xs text-slate-400">'+(it.item_code||'')+' | محضّر: <span class="font-bold text-slate-600">'+(Number(it.qty_picked)||0)+'</span> '+(it.unit||'حبة')+'</p></div></div></div>'; }
        RW_UI.safeHTML(RW_UI.byId('mainContent'), h);
    },

    startLoading: function(code) {
        var self = this; if(!navigator.onLine) { RW_UI.toast('أنت غير متصل','warning'); return; }
        RW_UI.showLoader(); RW_API.call('start-loading',{runsheet_code:code},function(json) { RW_UI.hideLoader();
            if(json.success) { RW_UI.toast('تم بنجاح','success'); self.openRunsheet(code); }
            else { if(json.msg&&json.msg.indexOf('لديك بالفعل')!==-1) Swal.fire({title:'تنبيه',text:json.msg,icon:'info',customClass:{popup:'!rounded-3xl'}}); else RW_UI.showError(json.msg||'فشل'); self.renderPendingTab(); }
        });
    },

    cancelLoading: function(code) { var s=this; RW_UI.showConfirm('إلغاء تحميل '+code+'؟',function(){ RW_UI.showLoader(); RW_API.call('cancel-loading',{runsheet_code:code},function(j){ RW_UI.hideLoader(); if(j.success){RW_UI.toast('تم الإلغاء','success');s.session=null;if(s.timerInterval)clearInterval(s.timerInterval);s.renderPendingTab();}else RW_UI.showError(j.msg); }); }); },

    renderActiveSession: function() {
        var s=this; if(!this.session) { this.renderPendingTab(); return; }
        var ses=this.session, elapsed='00:00';
        if(ses.start_time) { var d=Math.floor((new Date()-new Date(ses.start_time))/1000), m=Math.floor(d/60), sec=d%60; elapsed=String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0'); }
        var loaded=0; for(var j=0;j<ses.items.length;j++) if(ses.items[j].qty_loaded>0) loaded++;
        var prog=ses.items.length?Math.round((loaded/ses.items.length)*100):0;
        var h = '<div class="bg-orange-50 rounded-3xl p-5 mb-6 slide-in"><div class="flex items-center justify-between mb-4"><span class="font-black text-2xl text-slate-800">'+ses.runsheet_code+'</span><span id="timerDisplay" class="bg-white text-orange-600 px-4 py-2 rounded-2xl text-sm font-black shadow-sm">⏱️ '+elapsed+'</span></div><div class="bg-white rounded-2xl p-4 shadow-sm"><div class="flex justify-between text-xs font-bold text-slate-400 mb-2"><span>تقدم التحميل</span><span>'+loaded+' / '+ses.items.length+' صنف</span></div><div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden"><div class="progress-bar h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full" style="width:'+prog+'%"></div></div></div></div>';
        h += '<p class="text-sm text-slate-400 mb-4">اضغط على الصنف لإدخال الكمية المحمّلة</p>';
        for(var i=0;i<ses.items.length;i++) { var it=ses.items[i], done=it.qty_loaded>0;
            h += '<div class="card mb-3 cursor-pointer slide-in '+(done?'border-r-4 border-orange-400':'')+'" onclick="App.editLoadedItem('+i+')"><div class="flex items-center justify-between"><div class="flex items-center gap-4">'+RW_ImageCache.getImageHTML(it.item_code)+'<div><p class="font-bold text-slate-700">'+(it.item_name||'')+'</p><p class="text-xs text-slate-400 mt-0.5">محضّر: '+(it.qty_picked||0)+' | مطلوب: '+(it.qty_ordered||0)+' | <span class="font-bold '+(done?'text-orange-600':'text-slate-500')+'">محمّل: '+(it.qty_loaded||0)+'</span></p></div></div><i class="fa-solid fa-pen text-slate-300 text-sm"></i></div></div>'; }
        h += '<button onclick="App.completeLoading()" class="btn-primary mt-6"><i class="fa-solid fa-check ml-2"></i> إنهاء التحميل</button>';
        h += '<button onclick="App.cancelLoading(\''+ses.runsheet_code+'\')" class="btn-danger w-full mt-3"><i class="fa-solid fa-xmark ml-1"></i> إلغاء التحميل</button>';
        RW_UI.safeHTML(RW_UI.byId('mainContent'), h); this.startTimer();
    },

    startTimer: function() { var s=this; if(this.timerInterval) clearInterval(this.timerInterval); this.timerInterval = setInterval(function() { if(s.session&&s.session.start_time) { var d=Math.floor((new Date()-new Date(s.session.start_time))/1000), m=Math.floor(d/60), sec=d%60; var td=document.getElementById('timerDisplay'); if(td) td.innerText='⏱️ '+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0'); } },1000); },

    editLoadedItem: function(idx, pre) {
        var s=this, it=s.session.items[idx], cur=(typeof pre!=='undefined')?pre:it.qty_loaded;
        Swal.fire({ title:'<span class="text-slate-800">'+it.item_name+'</span>', html:'<div class="text-center">'+RW_ImageCache.getImageHTML(it.item_code,'w-20','h-20')+'</div><div class="text-right text-sm space-y-2"><div class="flex justify-between"><span class="text-slate-400">محضّر</span><strong>'+it.qty_picked+'</strong></div><div class="flex justify-between"><span class="text-slate-400">مطلوب</span><strong>'+it.qty_ordered+'</strong></div>'+(it.unit?'<div class="flex justify-between"><span class="text-slate-400">الوحدة</span><strong>'+it.unit+'</strong></div>':'')+'</div><div class="mt-4 text-right"><label class="block text-xs font-bold text-slate-500 mb-2">الكمية المحمّلة</label><input id="swal-qty" type="number" class="swal2-input !rounded-xl !text-center !font-bold !text-lg" value="'+cur+'" min="0" max="'+it.qty_ordered+'"><label class="block text-xs font-bold text-slate-500 mb-2 mt-4">ملاحظات</label><input id="swal-notes" class="swal2-input !rounded-xl" value="'+(it.notes||'')+'" placeholder="سبب النقص أو الزيادة..."></div>',
            showCancelButton:true, confirmButtonText:'حفظ', cancelButtonText:'إلغاء', customClass:{popup:'!rounded-3xl',confirmButton:'!rounded-xl !bg-orange-600 !px-8',cancelButton:'!rounded-xl'},
            preConfirm: function() { var p=Swal.getPopup(); var qe=p?p.querySelector('#swal-qty'):null, ne=p?p.querySelector('#swal-notes'):null; return { qty: qe?Math.max(0,Math.min(parseInt(qe.value)||0,it.qty_ordered)):0, notes: ne?ne.value.trim():'' }; }
        }).then(function(r) { if(r.isConfirmed) {
            var nq=r.value.qty, nt=r.value.notes;
            if(nq>it.qty_picked&&!nt) { Swal.fire({title:'تنبيه',text:'الكمية المحمّلة أكبر من المحضّرة. يجب ذكر السبب.',icon:'warning',showCancelButton:true,confirmButtonText:'إضافة سبب',cancelButtonText:'تخطي',customClass:{popup:'!rounded-3xl',confirmButton:'!rounded-xl !bg-amber-500 !px-6',cancelButton:'!rounded-xl'}}).then(function(r2){if(r2.isConfirmed)s.editLoadedItem(idx,nq);}); return; }
            if(nq>it.qty_picked) nt = (nt?nt+' | ':'')+'عدّلها المحمّل';
            s.session.items[idx].qty_loaded=nq; s.session.items[idx].notes=nt;
            supabase.from('run_sheet_details').update({qty_loaded:nq}).eq('runsheet_id',s.session.runsheet_id).eq('item_code',it.item_code).then(function(){});
            s.renderActiveSession();
            if(nq<it.qty_picked&&!nt) { Swal.fire({title:'تنبيه',text:'الكمية المحمّلة أقل من المحضّرة. هل تريد إضافة سبب؟',icon:'question',showCancelButton:true,confirmButtonText:'إضافة سبب',cancelButtonText:'تخطي',customClass:{popup:'!rounded-3xl',confirmButton:'!rounded-xl !bg-amber-500 !px-6',cancelButton:'!rounded-xl'}}).then(function(r2){if(r2.isConfirmed)s.editLoadedItem(idx,nq);}); }
        }});
    },

    completeLoading: function() {
        var s=this; if(!s.session) return; if(!navigator.onLine) { RW_UI.toast('غير متصل','warning'); return; }
        var its=[], fc=0,pc=0,zc=0;
        for(var i=0;i<s.session.items.length;i++) { var it=s.session.items[i]; its.push({itemCode:it.item_code,loadedQty:it.qty_loaded,notes:it.notes}); if(it.qty_loaded>=it.qty_ordered)fc++; else if(it.qty_loaded>0)pc++; else zc++; }
        var sh='<div class="text-right text-sm"><p>أنت على وشك إنهاء تحميل الرانشيت <strong>'+s.session.runsheet_code+'</strong>.</p><div class="mt-3 space-y-1"><div>✅ <strong>'+fc+'</strong> أصناف مكتملة</div><div>⚠️ <strong>'+pc+'</strong> أصناف منقوصة</div><div>❌ <strong>'+zc+'</strong> أصناف لم تُحمّل</div></div>';
        if(pc>0||zc>0) { sh+='<hr class="my-3"><p class="text-amber-600 font-bold text-xs">الأصناف الناقصة:</p><ul class="text-xs space-y-1 mt-1">'; for(var k=0;k<s.session.items.length;k++) { var itm=s.session.items[k]; if(itm.qty_loaded<itm.qty_ordered) sh+='<li>• '+itm.item_name+' ('+itm.qty_loaded+'/'+itm.qty_ordered+') '+(itm.notes?'– '+itm.notes:'<span class="text-red-400">بدون سبب</span>')+'</li>'; } sh+='</ul>'; }
        sh+='</div>';
        Swal.fire({title:'تأكيد إنهاء التحميل',html:sh,icon:'info',showCancelButton:true,confirmButtonText:'تأكيد',cancelButtonText:'إلغاء',customClass:{popup:'!rounded-3xl',confirmButton:'!rounded-xl !bg-orange-600 !px-8',cancelButton:'!rounded-xl'}}).then(function(r) { if(!r.isConfirmed) return;
            var cb=document.querySelector('.swal2-confirm'); if(cb){cb.disabled=true;cb.innerText='جارٍ...';}
            RW_UI.showLoader(); RW_API.call('complete-loading',{runsheet_code:s.session.runsheet_code,items:its},function(json) { RW_UI.hideLoader();
                if(json.success) { var tq=0,tv=0; for(var j=0;j<its.length;j++){tq+=its[j].loadedQty; var pp=0; for(var x=0;x<s.session.items.length;x++){if(s.session.items[x].item_code===its[j].itemCode){pp=Number(s.session.items[x].unit_price)||0;break;}} tv+=its[j].loadedQty*pp; }
                    Swal.fire({icon:'success',title:'✅ تم إنهاء التحميل',html:'<div class="text-right"><p>تم تحميل <strong>'+its.length+' صنف</strong></p><p>إجمالي الكمية: <strong>'+tq+' قطعة</strong></p><p>القيمة التقديرية: <strong>'+RW_UI.formatNumber(tv)+' EGP</strong></p></div>',confirmButtonText:'حسناً',customClass:{popup:'!rounded-3xl',confirmButton:'!rounded-xl !bg-orange-600'}});
                    s.session=null; if(s.timerInterval)clearInterval(s.timerInterval); s.renderPendingTab();
                } else RW_UI.showError(json.msg||'فشل');
            });
        });
    },

    renderCompletedTab: function() { var s=this; RW_UI.showSkeleton('mainContent',1,'card'); supabase.from('runsheets').select('runsheet_code,run_date,status').eq('status','Loaded').eq('loader_id',this.currentUser.id||this.currentUser.email).order('run_date',{ascending:false}).limit(50).then(function(r){s.completedRunsheets=r.data||[];s.renderCompletedList(s.completedRunsheets);}).catch(function(){RW_UI.showEmptyState('mainContent','فشل','📡');}); },
    renderCompletedList: function(l) { var h='<h2 class="text-lg font-black text-slate-800 mb-4">✅ الرانشيتات التي حمّلتها</h2><input type="text" id="searchCompleted" placeholder="🔍 ابحث..." class="w-full p-4 bg-white rounded-2xl border-2 border-slate-100 focus:border-orange-400 outline-none font-semibold text-sm shadow-sm mb-4" oninput="App.searchCompleted(this.value)">'; if(!l.length) h+='<div class="text-center py-16"><div class="text-6xl mb-4">🏆</div><p class="text-slate-400 font-bold">لم تنهِ أي رانشيت بعد.</p></div>'; else { h+='<div>'; for(var i=0;i<l.length;i++){var rs=l[i];h+='<div class="card mb-3 slide-in"><div class="flex justify-between items-center"><div><span class="font-black text-base text-slate-800">'+rs.runsheet_code+'</span><p class="text-xs text-slate-400 mt-0.5">'+rs.run_date+'</p></div><button onclick="App.reopenLoading(\''+rs.runsheet_code+'\')" class="btn-reopen text-xs px-3 py-1.5"><i class="fa-solid fa-pen-to-square ml-1"></i> تعديل التحميل</button></div></div>';} h+='</div>'; } RW_UI.safeHTML(RW_UI.byId('mainContent'),h); },
    searchCompleted: function(q) { var f=this.completedRunsheets; if(q&&q.trim()){var ql=q.trim().toLowerCase();f=f.filter(function(r){return(r.runsheet_code||'').toLowerCase().indexOf(ql)!==-1;});} this.renderCompletedList(f); },
    reopenLoading: function(code) { var s=this; supabase.from('runsheets').select('status').eq('runsheet_code',code).maybeSingle().then(function(r){if(!r.data||r.data.status!=='Loaded'){Swal.fire({title:'لا يمكن التعديل',text:'الرانشيت ليس محمّلاً',icon:'warning',customClass:{popup:'!rounded-3xl'}});s.renderCompletedTab();return;} RW_UI.showConfirm('إعادة فتح '+code+'؟',function(){RW_UI.showLoader();RW_API.call('reopen-loading',{runsheet_code:code},function(j){RW_UI.hideLoader();if(j.success){RW_UI.toast('تم','success');s.renderPendingTab();}else{RW_UI.showError(j.msg);s.renderCompletedTab();}});});}); },

    renderAccount: function() { var n=this.currentUser.name||'?'; var h='<div class="text-center mb-8 mt-4"><div class="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl mx-auto flex items-center justify-center text-white text-3xl font-black shadow-lg mb-4">'+n.charAt(0)+'</div><h2 class="font-black text-xl">'+(this.currentUser.name||this.currentUser.email)+'</h2><p class="text-sm text-slate-400">محمّل</p></div><div class="card mb-3"><div class="flex items-center gap-3"><div class="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center"><i class="fa-solid fa-envelope"></i></div><div><p class="text-xs text-slate-400">البريد</p><p class="font-bold text-sm">'+this.currentUser.email+'</p></div></div></div><button onclick="doLogout()" class="w-full bg-white border-2 border-red-100 text-red-500 py-4 rounded-2xl font-bold mt-6"><i class="fa-solid fa-arrow-right-from-bracket ml-2"></i> تسجيل الخروج</button>'; RW_UI.safeHTML(RW_UI.byId('mainContent'),h); }
};

function togglePass() { var p = RW_UI.byId('loginPass'), i = RW_UI.byId('passIcon'); if(p.type==='password'){p.type='text';i.className='fa-solid fa-eye-slash';}else{p.type='password';i.className='fa-solid fa-eye';} }
function doLogin() { var e=RW_UI.byId('loginEmail').value.trim(), p=RW_UI.byId('loginPass').value.trim(); if(!e||!p){RW_UI.byId('loginMsg').innerText='أدخل البيانات';RW_UI.byId('loginMsg').classList.remove('hidden');return;} RW_UI.byId('loginMsg').classList.add('hidden'); RW_Auth.doLogin(e,p,function(u,er){if(er){RW_UI.byId('loginMsg').innerText=er;RW_UI.byId('loginMsg').classList.remove('hidden');}else App.init();}); }
function doLogout() { RW_Auth.doLogout(function(){RW_UI.byId('mainApp').classList.add('hidden');RW_UI.byId('loginScreen').classList.remove('hidden');}); }
function switchTab(t) { App.switchTab(t); }
RW_SW.register('../sw.js');
document.addEventListener('DOMContentLoaded',function(){App.init();});
window.addEventListener('online',function(){RW_UI.updateConnectionStatus('connDot','connLabel');});
window.addEventListener('offline',function(){RW_UI.updateConnectionStatus('connDot','connLabel');});
</script>
</body>
</html>
