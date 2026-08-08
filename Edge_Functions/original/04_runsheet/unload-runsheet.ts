// unload-runsheet – تفريغ الرانشيت وإعادة المخزون
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
    console.log("📥 unload-runsheet v2 – rawBody:", rawBody)
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var runsheet_code = body.runsheet_code
    if (!runsheet_code) throw new Error("رقم الرانشيت مطلوب")

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

    // جلب الرانشيت
    var rsResult = await supabase.from("runsheets")
      .select("id, status").eq("runsheet_code", runsheet_code).maybeSingle()
    if (rsResult.error || !rsResult.data) throw new Error("الرانشيت غير موجود")
    var rs = rsResult.data
    if (rs.status !== "Loaded") throw new Error("لا يمكن تفريغ رانشيت غير محمل")

    // جلب تفاصيل الرانشيت
    var detailsResult = await supabase.from("run_sheet_details")
      .select("item_code, item_id, item_name, unit, qty_loaded")
      .eq("runsheet_id", rs.id)

    var details = detailsResult.data || []

    // إعادة المخزون لكل صنف
    for (var i = 0; i < details.length; i++) {
      var det = details[i]
      var qty = Number(det.qty_loaded) || 0
      if (qty <= 0) continue

      var itemId = det.item_id
      if (!itemId) {
        var itemResult = await supabase.from("items")
          .select("id").eq("item_code", det.item_code).maybeSingle()
        if (!itemResult.data) throw new Error("الصنف غير موجود: " + det.item_code)
        itemId = itemResult.data.id
      }

      // تحديث المخزون
      var stockResult = await supabase.from("stock_branches")
        .select("qty")
        .eq("branch_id", mainBranchId)
        .eq("item_id", itemId)
        .maybeSingle()

      var currentQty = Number(stockResult.data?.qty || 0)

      var stockError = await supabase.from("stock_branches")
        .update({ qty: currentQty + qty })
        .eq("branch_id", mainBranchId)
        .eq("item_id", itemId)
      if (stockError.error) throw new Error("فشل إعادة المخزون لـ " + det.item_code + ": " + stockError.error.message)

      // ============================================================
      // 🆕 كتابة inventory_log – تفريغ
      // ============================================================
      var logCode = "UNL-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
      await supabase.from("inventory_log").insert({
        company_id: "00000000-0000-0000-0000-000000000001",
        log_code: logCode,
        movement_date: new Date().toISOString().split("T")[0],
        voucher_id: runsheet_code,
        item_id: itemId,
        item_code: det.item_code,
        item_name: det.item_name || det.item_code,
        movement_type: "Unloading",
        qty: qty,
        reference: runsheet_code,
        user_email: user.email
      })
    }

    // تصفير الكميات المحمّلة
    await supabase.from("run_sheet_details").update({
      qty_loaded: 0,
      remaining_qty: 0
    }).eq("runsheet_id", rs.id)

    // إعادة الأوردرات إلى Pending
    await supabase.from("orders").update({ order_status: "Pending" }).eq("runsheet_id", rs.id)

    // إعادة الرانشيت إلى Picked
    await supabase.from("runsheets").update({
      status: "Picked",
      loader_end: null
    }).eq("id", rs.id)

    console.log("✅ Unloaded:", runsheet_code)
    return new Response(JSON.stringify({ success: true, msg: "تم تفريغ الرانشيت" }), {
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
