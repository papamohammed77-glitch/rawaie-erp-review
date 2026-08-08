// receive-stock-voucher – استلام إذن مخزني وإضافة المخزون
// الإصدار 2.0 – مع سجل المخزون (inventory_log)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

var supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
}

serve(async function(req) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    var rawBody = await req.text()
    console.log("📥 receive-stock-voucher v2 – rawBody:", rawBody)
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var voucher_code = body.voucher_code
    var receivedItems = body.receivedItems
    if (!voucher_code || !receivedItems || !receivedItems.length) throw new Error("البيانات غير مكتملة")

    // مصادقة
    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var authResult = await supabase.auth.getUser(token)
    if (authResult.error || !authResult.data.user) throw new Error("جلسة غير صالحة")
    var user = authResult.data.user

    // جلب main_branch_id من الإعدادات
    var settingsResult = await supabase.from("app_settings")
      .select("main_branch_id").limit(1).maybeSingle()
    if (!settingsResult.data || !settingsResult.data.main_branch_id) throw new Error("الفرع الرئيسي غير محدد في الإعدادات")
    var mainBranchId = settingsResult.data.main_branch_id

    // جلب الإذن
    var voucherResult = await supabase.from("stock_vouchers")
      .select("id, type, status, to_type, to_id")
      .eq("voucher_code", voucher_code)
      .maybeSingle()
    if (voucherResult.error || !voucherResult.data) throw new Error("الإذن غير موجود")
    var voucher = voucherResult.data
    if (voucher.status !== "Sent") throw new Error("يمكن استلام الأذونات المرسلة فقط")

    // تحديد الفرع المستلم
    var toBranchId = voucher.to_id || mainBranchId
    console.log("📥 To branch:", toBranchId)

    // أنواع الأذونات التي تضيف المخزون
    var receiveTypes = ["Transfer", "DirectReturn"]
    if (receiveTypes.indexOf(voucher.type) !== -1) {
      for (var i = 0; i < receivedItems.length; i++) {
        var item = receivedItems[i]
        var receivedQty = Number(item.receivedQty) || 0
        if (receivedQty <= 0) continue

        // جلب item_id من items
        var itemResult = await supabase.from("items")
          .select("id").eq("item_code", item.itemCode).maybeSingle()
        if (!itemResult.data) throw new Error("الصنف غير موجود: " + item.itemCode)
        var itemId = itemResult.data.id

        // تحديث المخزون
        var stockResult = await supabase.from("stock_branches")
          .select("qty")
          .eq("branch_id", toBranchId)
          .eq("item_id", itemId)
          .maybeSingle()

        var currentQty = Number(stockResult.data?.qty || 0)

        var stockError = await supabase.from("stock_branches")
          .update({ qty: currentQty + receivedQty })
          .eq("branch_id", toBranchId)
          .eq("item_id", itemId)
        if (stockError.error) throw new Error("فشل إضافة المخزون لـ " + item.itemCode + ": " + stockError.error.message)

        // ============================================================
        // 🆕 كتابة inventory_log
        // ============================================================
        var logCode = "IN-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
        await supabase.from("inventory_log").insert({
          company_id: "00000000-0000-0000-0000-000000000001",
          log_code: logCode,
          movement_date: new Date().toISOString().split("T")[0],
          voucher_id: voucher_code,
          item_id: itemId,
          item_code: item.itemCode,
          item_name: item.itemName || item.itemCode,
          movement_type: voucher.type,
          qty: receivedQty,
          reference: voucher_code,
          user_email: user.email
        })
      }
    }

    // تحديث الكميات المستلمة في stock_voucher_details
    for (var j = 0; j < receivedItems.length; j++) {
      var it = receivedItems[j]
      await supabase.from("stock_voucher_details").update({
        received_qty: it.receivedQty
      }).eq("voucher_id", voucher.id).eq("item_code", it.itemCode)
    }

    // تحديث حالة الإذن إلى مستلم
    await supabase.from("stock_vouchers").update({
      status: "Received",
      received_date: new Date().toISOString(),
      received_by: user.email
    }).eq("id", voucher.id)

    console.log("✅ Voucher received:", voucher_code)
    return new Response(JSON.stringify({ success: true, msg: "تم الاستلام بنجاح" }), {
      headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
    })

  } catch (error) {
    console.error("❌ Error:", error.message)
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400,
      headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
    })
  }
})
