var _rwReloadTriggered = false;
window._rwHasActiveSession = false;

function RW_checkPendingReload() {
    if (window._rwPendingReload) {
        window.location.reload();
    }
}

function RW_showUpdateBanner() {
    if (document.getElementById('rw-update-banner')) return;

    var banner = document.createElement('div');
    banner.id = 'rw-update-banner';
    banner.style.cssText =
        'position:fixed;bottom:0;left:0;right:0;z-index:99999;' +
        'background:#1e40af;color:#fff;padding:12px 16px;' +
        'display:flex;align-items:center;justify-content:space-between;' +
        'font-family:Tahoma,sans-serif;font-size:14px;font-weight:900;' +
        'box-shadow:0 -4px 12px rgba(0,0,0,.2);direction:rtl';

    banner.innerHTML =
        '<span>يتوفر تحديث جديد للتطبيق</span>' +
        '<button id="rw-update-now-btn" style="' +
        'background:#fff;color:#1e40af;border:0;border-radius:10px;' +
        'padding:8px 16px;font-weight:900;font-size:13px;cursor:pointer">' +
        'تحديث الآن</button>';

    document.body.appendChild(banner);

    document.getElementById('rw-update-now-btn').onclick = function() {
        window.location.reload();
    };
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('../sw.js').then(function(registration) {
        setInterval(function() {
            registration.update();
        }, 60000);

        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') {
                registration.update();
            }
        });
    }).catch(function(err) {
        console.error('[RW] فشل تسجيل Service Worker:', err);
    });

    navigator.serviceWorker.addEventListener('controllerchange', function() {
        if (_rwReloadTriggered) return;
        _rwReloadTriggered = true;

        if (window._rwHasActiveSession) {
            window._rwPendingReload = true;
            RW_showUpdateBanner();
        } else {
            window.location.reload();
        }
    });

    navigator.serviceWorker.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'RW_SW_UPDATED') {
            console.log('[RW] نسخة جديدة من Service Worker أصبحت نشطة');
        }
    });
}
