// ============================================================
// core.js – النواة المشتركة لنظام الروائع ERP (الإصدار 1.2)
// التزم بـ var و function فقط. لا تستخدم const أو let أو () =>
// هذا الملف يُحمّل مرة واحدة في كل تطبيق PWA
// ============================================================

var SUPABASE_URL = 'https://fiilmooggumokxanwiyx.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpaWxtb29nZ3Vtb2t4YW53aXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDkwOTIsImV4cCI6MjA5NDI4NTA5Mn0.LZScCxnCiRrTSCCBmTryszQpY1AwBgR2dkTBbC5kOc4';

// ✅ إنشاء عميل Supabase الموحد (إصلاح الخطأ القاتل)
var supabase = (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function')
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

if (!supabase) {
    console.error('❌ فشل إنشاء عميل Supabase. تأكد من تحميل مكتبة supabase أولاً.');
}

// ============================================================
// الوحدة ١: RW_Auth – المصادقة والجلسة والصلاحيات
// ============================================================
var RW_Auth = (function() {
    var currentUser = null;
    var currentSession = null;
    var pubUserId = null;

    function init(callback) {
        if (!supabase) {
            console.error('❌ Supabase غير مهيأ');
            if (callback) callback(null, 'Supabase غير مهيأ');
            return;
        }
        supabase.auth.getSession().then(function(res) {
            if (res.data && res.data.session) {
                currentSession = res.data.session;
                currentUser = res.data.session.user;
                checkWarehouseRole(callback);
            } else {
                if (callback) callback(null, 'NO_SESSION');
            }
        }).catch(function(e) {
            console.error('❌ فشل استعادة الجلسة:', e);
            if (callback) callback(null, e.message);
        });
    }

    function checkWarehouseRole(callback) {
        if (!currentUser) {
            if (callback) callback(null, 'NO_USER');
            return;
        }
        supabase.from('users').select('id, name, active_warehouse_role').eq('email', currentUser.email).maybeSingle().then(function(uRes) {
            var userData = uRes.data || {};
            pubUserId = userData.id || null;
            var meta = currentUser.user_metadata || {};
            var isOwner = (meta.isOwner === true || meta.isOwner === 'true' || meta.role === 'owner' || meta.role === 'مالك');
            var user = {
                id: pubUserId,
                email: currentUser.email,
                name: userData.name || meta.name || currentUser.email,
                role: meta.role || 'موظف',
                isOwner: isOwner,
                permissions: meta.permissions || [],
                activeWarehouseRole: userData.active_warehouse_role || meta.active_warehouse_role || ''
            };
            if (callback) callback(user, null);
        }).catch(function(e) {
            var meta = currentUser.user_metadata || {};
            var isOwner = (meta.isOwner === true || meta.isOwner === 'true' || meta.role === 'owner' || meta.role === 'مالك');
            var user = {
                id: null,
                email: currentUser.email,
                name: meta.name || currentUser.email,
                role: meta.role || 'موظف',
                isOwner: isOwner,
                permissions: meta.permissions || [],
                activeWarehouseRole: meta.active_warehouse_role || ''
            };
            if (callback) callback(user, null);
        });
    }

    function doLogin(email, pass, callback) {
        if (!email || !pass) {
            if (callback) callback(null, 'أدخل البريد الإلكتروني وكلمة المرور');
            return;
        }
        supabase.auth.signInWithPassword({ email: email, password: pass }).then(function(res) {
            if (res.error) {
                if (callback) callback(null, res.error.message);
            } else {
                currentSession = res.data.session;
                currentUser = res.data.session.user;
                checkWarehouseRole(function(user, err) {
                    if (callback) callback(user, err);
                });
            }
        }).catch(function(e) {
            if (callback) callback(null, e.message);
        });
    }

    function doLogout(callback) {
        supabase.auth.signOut().then(function() {
            currentUser = null;
            currentSession = null;
            pubUserId = null;
            if (callback) callback(true);
        }).catch(function(e) {
            console.error('فشل تسجيل الخروج:', e);
            if (callback) callback(false);
        });
    }

    function getUser() {
        return {
            id: pubUserId,
            email: currentUser ? currentUser.email : null,
            name: currentUser ? (currentUser.user_metadata ? currentUser.user_metadata.name : currentUser.email) : null,
            session: currentSession
        };
    }

    function getToken() {
        return currentSession ? currentSession.access_token : null;
    }

    function checkPermission(permissionKey) {
        if (!currentUser) return false;
        var meta = currentUser.user_metadata || {};
        if (meta.isOwner === true || meta.isOwner === 'true') return true;
        var perms = meta.permissions || [];
        if (perms.indexOf('*') !== -1) return true;
        return perms.indexOf(permissionKey) !== -1;
    }

    function hasWarehouseRole(roleName) {
        if (!currentUser) return false;
        var meta = currentUser.user_metadata || {};
        if (meta.isOwner === true || meta.isOwner === 'true') return true;
        var activeRole = '';
        try {
            activeRole = window._rwActiveRole || meta.active_warehouse_role || '';
        } catch(e) {
            activeRole = meta.active_warehouse_role || '';
        }
        return activeRole === roleName;
    }

    return {
        init: init,
        doLogin: doLogin,
        doLogout: doLogout,
        getUser: getUser,
        getToken: getToken,
        checkPermission: checkPermission,
        hasWarehouseRole: hasWarehouseRole
    };
})();

// ============================================================
// الوحدة ٢: RW_DB – غلاف Dexie.js للتخزين المحلي
// ============================================================
var RW_DB = (function() {
    var dbInstances = {};

    function getDB(appName) {
        if (dbInstances[appName]) {
            return dbInstances[appName];
        }
        if (typeof Dexie === 'undefined') {
            console.error('❌ Dexie.js غير محمّل');
            return null;
        }
        var db = new Dexie('RW_' + appName);
        db.version(1).stores({
            customers: 'customer_code, name, area, phone, visit_day',
            items: 'item_code, name, sales_price, unit, max_qty, barcode, category, image_url',
            stock: '[item_id+branch_id], qty, allocated_qty',
            branches: 'branch_code, name',
            meta: 'key',
            orders: '++id, status, created_at',
            pending_updates: '++id, type, status'
        });
        dbInstances[appName] = db;
        return db;
    }

    function syncDown(appName, callback) {
        var db = getDB(appName);
        if (!db) {
            if (callback) callback(false, 'Dexie غير مهيأ');
            return;
        }
        Promise.all([
            supabase.from('customers').select('*').then(function(r) { return db.customers.clear().then(function() { return db.customers.bulkPut(r.data || []); }); }),
            supabase.from('items').select('*').then(function(r) { return db.items.clear().then(function() { return db.items.bulkPut(r.data || []); }); }),
            supabase.from('stock_branches').select('*').then(function(r) { return db.stock.clear().then(function() { return db.stock.bulkPut(r.data || []); }); }),
            supabase.from('branches').select('*').then(function(r) { return db.branches.clear().then(function() { return db.branches.bulkPut(r.data || []); }); })
        ]).then(function() {
            if (callback) callback(true, null);
        }).catch(function(e) {
            console.error('❌ فشل syncDown:', e);
            if (callback) callback(false, e.message);
        });
    }

    function syncUp(appName, callback) {
        var db = getDB(appName);
        if (!db) {
            if (callback) callback(false, 'Dexie غير مهيأ');
            return;
        }
        db.pending_updates.where('status').equals('pending').toArray().then(function(pendingOps) {
            if (!pendingOps || pendingOps.length === 0) {
                if (callback) callback(true, null, 0);
                return;
            }
            var totalOps = pendingOps.length;
            var completedOps = 0;
            var hasError = false;
            var lastError = null;

            for (var i = 0; i < pendingOps.length; i++) {
                var op = pendingOps[i];
                (function(operation) {
                    var token = RW_Auth.getToken();
                    if (!token) {
                        hasError = true;
                        lastError = 'انتهت الجلسة';
                        completedOps++;
                        checkDone();
                        return;
                    }
                    var bodyData = operation.data || operation.body || {};
                    fetch(SUPABASE_URL + '/functions/v1/' + operation.type, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify(bodyData)
                    }).then(function(res) {
                        if (!res.ok) {
                            return res.json().then(function(err) {
                                throw new Error(err.msg || err.error || 'خطأ في الخادم');
                            });
                        }
                        return res.json();
                    }).then(function(json) {
                        if (json.success) {
                            db.pending_updates.delete(operation.id).then(function() {
                                completedOps++;
                                checkDone();
                            }).catch(function() {
                                completedOps++;
                                checkDone();
                            });
                        } else {
                            hasError = true;
                            lastError = json.msg || 'فشل المزامنة';
                            completedOps++;
                            checkDone();
                        }
                    }).catch(function(e) {
                        hasError = true;
                        lastError = e.message || 'فشل الاتصال';
                        completedOps++;
                        checkDone();
                    });
                })(op);
            }

            function checkDone() {
                if (completedOps >= totalOps) {
                    if (callback) callback(!hasError, hasError ? lastError : null, totalOps);
                }
            }
        }).catch(function(e) {
            if (callback) callback(false, e.message);
        });
    }

    function getItems(appName, callback) {
        var db = getDB(appName);
        if (!db) {
            if (callback) callback([], 'Dexie غير مهيأ');
            return;
        }
        db.items.toArray().then(function(items) {
            if (callback) callback(items, null);
        }).catch(function(e) {
            if (callback) callback([], e.message);
        });
    }

    function getCustomers(appName, callback) {
        var db = getDB(appName);
        if (!db) {
            if (callback) callback([], 'Dexie غير مهيأ');
            return;
        }
        db.customers.toArray().then(function(customers) {
            if (callback) callback(customers, null);
        }).catch(function(e) {
            if (callback) callback([], e.message);
        });
    }

    function getBranches(appName, callback) {
        var db = getDB(appName);
        if (!db) {
            if (callback) callback([], 'Dexie غير مهيأ');
            return;
        }
        db.branches.toArray().then(function(branches) {
            if (callback) callback(branches, null);
        }).catch(function(e) {
            if (callback) callback([], e.message);
        });
    }

    return {
        getDB: getDB,
        syncDown: syncDown,
        syncUp: syncUp,
        getItems: getItems,
        getCustomers: getCustomers,
        getBranches: getBranches
    };
})();

// ============================================================
// الوحدة ٣: RW_API – استدعاء Edge Functions بـ fetch اليدوي
// ============================================================
var RW_API = (function() {
    function call(functionName, body, callback) {
        var token = RW_Auth.getToken();
        if (!token) {
            if (callback) callback({ success: false, msg: 'انتهت الجلسة. يرجى إعادة تسجيل الدخول.' }, null);
            return;
        }
        fetch(SUPABASE_URL + '/functions/v1/' + functionName, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(body || {})
        }).then(function(res) {
            if (!res.ok) {
                return res.json().then(function(err) {
                    throw new Error(err.msg || err.error || 'خطأ في الخادم');
                });
            }
            return res.json();
        }).then(function(json) {
            if (callback) callback(json, null);
        }).catch(function(e) {
            console.error('❌ فشل استدعاء ' + functionName + ':', e.message);
            if (callback) callback({ success: false, msg: e.message || 'فشل الاتصال بـ Edge Function' }, e.message);
        });
    }

    function callWithRetry(functionName, body, retries, callback) {
        var maxRetries = retries || 2;
        var attempt = 0;

        function tryCall() {
            call(functionName, body, function(json, err) {
                if (err && attempt < maxRetries) {
                    attempt++;
                    console.warn('⚠️ محاولة ' + attempt + ' فشلت لـ ' + functionName + '، إعادة المحاولة...');
                    setTimeout(tryCall, 1000);
                } else {
                    if (callback) callback(json, err);
                }
            });
        }

        tryCall();
    }

    return {
        call: call,
        callWithRetry: callWithRetry
    };
})();

// ============================================================
// الوحدة ٤: RW_UI – دوال واجهة المستخدم المشتركة
// ============================================================
var RW_UI = (function() {
    function toast(message, type) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                toast: true,
                position: 'top',
                icon: type || 'info',
                title: message,
                showConfirmButton: false,
                timer: 2000,
                customClass: { popup: '!rounded-2xl !shadow-xl' }
            });
        } else {
            try { alert(message); } catch(e) {}
        }
    }

    function showLoader(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: message || 'جاري التحميل...',
                allowOutsideClick: false,
                didOpen: function() { Swal.showLoading(); }
            });
        }
    }

    function hideLoader() {
        if (typeof Swal !== 'undefined') {
            Swal.close();
        }
    }

    function showError(message, callback) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'خطأ',
                text: message || 'حدث خطأ غير معروف',
                icon: 'error',
                confirmButtonText: 'حسناً',
                customClass: { popup: '!rounded-3xl' }
            }).then(function() {
                if (callback) callback();
            });
        } else {
            try { alert(message); } catch(e) {}
            if (callback) callback();
        }
    }

    function showConfirm(message, confirmCallback, cancelCallback) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'تأكيد',
                text: message,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'نعم',
                cancelButtonText: 'إلغاء',
                customClass: {
                    popup: '!rounded-3xl',
                    confirmButton: '!rounded-xl !bg-blue-600 !px-8',
                    cancelButton: '!rounded-xl !px-8'
                }
            }).then(function(result) {
                if (result.isConfirmed && confirmCallback) confirmCallback();
                else if (!result.isConfirmed && cancelCallback) cancelCallback();
            });
        } else {
            if (confirm('تأكيد: ' + message)) {
                if (confirmCallback) confirmCallback();
            } else {
                if (cancelCallback) cancelCallback();
            }
        }
    }

    function formatCurrency(amount, currency) {
        var num = Number(amount || 0);
        var symbol = 'ر.س';
        if (currency === 'SAR') symbol = 'ر.س';
        else if (currency === 'EGP') symbol = 'ج.م';
        else if (currency === 'AED') symbol = 'د.إ';
        else if (currency === 'KWD') symbol = 'د.ك';
        else if (currency === 'QAR') symbol = 'ر.ق';
        else if (currency === 'BHD') symbol = 'د.ب';
        else if (currency === 'OMR') symbol = 'ر.ع';
        else if (currency === 'USD') symbol = '$';
        return num.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) + ' ' + symbol;
    }

    function formatNumber(num) {
        return Number(num || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 });
    }

    function safeHTML(element, html) {
        if (element) {
            try { element.innerHTML = html; } catch(e) { console.error('safeHTML error:', e); }
        }
    }

    function safeText(element, text) {
        if (element) {
            try { element.textContent = text; } catch(e) { console.error('safeText error:', e); }
        }
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function showSkeleton(containerId, count, type) {
        var container = byId(containerId);
        if (!container) return;
        var html = '';
        var height = 'h-32';
        var width = 'w-full';
        if (type === 'card') {
            height = 'h-14';
            width = 'w-full';
        } else if (type === 'grid') {
            height = 'h-32';
            width = 'w-full';
        }
        for (var i = 0; i < (count || 3); i++) {
            html += '<div class="skeleton ' + height + ' ' + width + ' mb-3"></div>';
        }
        safeHTML(container, html);
    }

    function showEmptyState(containerId, message, emoji) {
        var container = byId(containerId);
        if (!container) return;
        var msg = message || 'لا توجد بيانات';
        var emj = emoji || '☕';
        safeHTML(container, '<div class="text-center py-12"><div class="text-6xl mb-4">' + emj + '</div><p class="text-slate-400 font-bold">' + msg + '</p></div>');
    }

    function updateConnectionStatus(dotId, labelId) {
        var dot = byId(dotId);
        var label = byId(labelId);
        if (navigator.onLine) {
            if (dot) { dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400'; }
            if (label) { label.innerText = 'متصل'; }
        } else {
            if (dot) { dot.className = 'w-2.5 h-2.5 rounded-full bg-red-500'; }
            if (label) { label.innerText = 'غير متصل'; }
        }
    }

    return {
        toast: toast,
        showLoader: showLoader,
        hideLoader: hideLoader,
        showError: showError,
        showConfirm: showConfirm,
        formatCurrency: formatCurrency,
        formatNumber: formatNumber,
        safeHTML: safeHTML,
        safeText: safeText,
        byId: byId,
        showSkeleton: showSkeleton,
        showEmptyState: showEmptyState,
        updateConnectionStatus: updateConnectionStatus
    };
})();

// ============================================================
// الوحدة ٥: RW_ImageCache – كاش صور المنتجات
// ============================================================
var RW_ImageCache = (function() {
    var cache = {};

    function loadAll(callback) {
        supabase.from('items').select('item_code, image_url').then(function(res) {
            var items = res.data || [];
            for (var i = 0; i < items.length; i++) {
                if (items[i].item_code && items[i].image_url) {
                    cache[items[i].item_code] = items[i].image_url;
                }
            }
            if (callback) callback();
        }).catch(function(e) {
            console.error('❌ فشل تحميل كاش الصور:', e);
            if (callback) callback();
        });
    }

    function getImageUrl(itemCode) {
        return cache[itemCode] || '';
    }

    function getImageHTML(itemCode, widthClass, heightClass) {
        var url = cache[itemCode] || '';
        var w = widthClass || 'w-14';
        var h = heightClass || 'h-14';
        if (url) {
            return '<img src="' + url + '" class="' + w + ' ' + h + ' rounded-2xl object-cover border-2 border-white shadow-sm" onerror="this.style.display=\'none\'">';
        }
        return '<div class="' + w + ' ' + h + ' bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center text-slate-400"><i class="fa-solid fa-box"></i></div>';
    }

    function clearCache() {
        cache = {};
    }

    return {
        loadAll: loadAll,
        getImageUrl: getImageUrl,
        getImageHTML: getImageHTML,
        clearCache: clearCache
    };
})();

// ============================================================
// الوحدة ٦: RW_SW – تسجيل Service Worker وكشف التحديثات
// ============================================================
var RW_SW = (function() {
    function register(swPath, callback) {
        if (!('serviceWorker' in navigator)) {
            if (callback) callback(false, 'المتصفح لا يدعم Service Worker');
            return;
        }
        var path = swPath || '../sw.js';
        navigator.serviceWorker.register(path).then(function(reg) {
            reg.addEventListener('updatefound', function() {
                var newWorker = reg.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', function() {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            if (typeof Swal !== 'undefined') {
                                Swal.fire({
                                    title: '🔄 تحديث متاح',
                                    text: 'تم تحميل نسخة أحدث من التطبيق.',
                                    icon: 'info',
                                    confirmButtonText: 'تحديث الآن',
                                    customClass: {
                                        popup: '!rounded-3xl',
                                        confirmButton: '!rounded-xl !bg-blue-600 !px-8'
                                    }
                                }).then(function() {
                                    if (newWorker && newWorker.postMessage) {
                                        newWorker.postMessage({ action: 'skipWaiting' });
                                    }
                                    window.location.reload();
                                });
                            }
                        }
                    });
                }
            });
            if (callback) callback(true, null);
        }).catch(function(err) {
            console.error('❌ فشل تسجيل Service Worker:', err);
            if (callback) callback(false, err.message);
        });
    }

    return {
        register: register
    };
})();

// ============================================================
// دوال مساعدة عامة (متوافقة مع جميع التطبيقات)
// ============================================================
function fmtNum(n) {
    return Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 });
}

function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

console.log('✅ core.js – النواة المشتركة للروائع ERP – تم التحميل بنجاح');
console.log('   RW_Auth | RW_DB | RW_API | RW_UI | RW_ImageCache | RW_SW');
