// cancel-loading – إلغاء التحميل وإعادة الرانشيت إلى Picked
// الإصدار 2.1 – Conservative Fix
//
// الإثباتات:
// 1. order_details.qty_loaded هو مصدر الحقيقة للكمية المحمّلة (يكتبه complete-loading)
// 2. run_sheet_details.qty_loaded يُبنى من order_details عبر Trigger trg_sync_run_sheet_details
// 3. تصفير order_details.qty_loaded مع الاعتماد على Trigger يحل التناقض دون الحاجة لتعديل run_sheet_details مباشرة
// 4. إعادة المخزون تتم عبر reopen-loading أو unload-runsheet – وليس cancel-loading

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
    console.log("📥 cancel-loading v2.1 – rawBody:", rawBody)
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var runsheet_code = body.runsheet_code
    if (!runsheet_code) throw new Error("رقم الرانشيت مطلوب")

    // ==========================================
    // 1. المصادقة
    // ==========================================
    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var authResult = await supabase.auth.getUser(token)
    if (authResult.error || !authResult.data.user) throw new Error("جلسة غير صالحة")
    var user = authResult.data.user

    // ==========================================
    // 2. جلب pubUserId من public.users
    // ==========================================
    var pubUserResult = await supabase.from("users")
      .select("id").eq("email", user.email).maybeSingle()
    if (!pubUserResult.data) throw new Error("المستخدم غير موجود في سجلات الموظفين")
    var pubUser = pubUserResult.data

    // ==========================================
    // 3. جلب الرانشيت والتحقق من الحالة
    // ==========================================
    var rsResult = await supabase.from("runsheets")
      .select("id, status, loader_id")
      .eq("runsheet_code", runsheet_code)
      .maybeSingle()
    if (rsResult.error || !rsResult.data) throw new Error("الرانشيت غير موجود")
    var rs = rsResult.data

    if (rs.status !== "Loading") {
      throw new Error("لا يمكن إلغاء تحميل رانشيت ليس قيد التحميل. حالته: " + rs.status)
    }
    if (rs.loader_id !== pubUser.id) {
      throw new Error("هذا الرانشيت قيد التحميل من قبل محمّل آخر. لا يمكنك إلغاؤه.")
    }

    // ==========================================
    // 4. جلب جميع الأوردرات المرتبطة بالرانشيت
    // ==========================================
    var ordersResult = await supabase.from("orders")
      .select("id")
      .eq("runsheet_id", rs.id)

    // إذا لم توجد أوردرات، نعيد الرانشيت إلى Picked فقط
    if (!ordersResult.data || ordersResult.data.length === 0) {
      await supabase.from("runsheets").update({
        status: "Picked",
        loader_id: null,
        loader_start: null
      }).eq("id", rs.id)

      console.log("✅ Loading cancelled (no orders):", runsheet_code)
      return new Response(JSON.stringify({
        success: true,
        msg: "تم إلغاء التحميل. لا توجد أوردرات مرتبطة."
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    var orderIds = []
    for (var oi = 0; oi < ordersResult.data.length; oi++) {
      orderIds.push(ordersResult.data[oi].id)
    }

    // ==========================================
    // 5. تصفير order_details.qty_loaded و reason_loading
    //    هذا سيشغّل Trigger trg_sync_run_sheet_details تلقائياً
    //    وسيعيد بناء run_sheet_details.qty_loaded = 0
    // ==========================================
    var odUpdateResult = await supabase.from("order_details")
      .update({ qty_loaded: 0 })
      .in("order_id", orderIds)

    if (odUpdateResult.error) {
      console.error("❌ فشل تصفير order_details:", odUpdateResult.error.message)
      throw new Error("فشل تصفير كميات التحميل: " + odUpdateResult.error.message)
    }

    console.log("✅ order_details.qty_loaded مصفّر لـ", orderIds.length, "أوردر")
    console.log("🔄 Trigger trg_sync_run_sheet_details سيعيد بناء run_sheet_details تلقائياً")

    // ==========================================
    // 6. إعادة الرانشيت إلى Picked
    // ==========================================
    var updateResult = await supabase.from("runsheets")
      .update({
        status: "Picked",
        loader_id: null,
        loader_start: null
      })
      .eq("id", rs.id)

    if (updateResult.error) {
      throw new Error("فشل تحديث حالة الرانشيت: " + updateResult.error.message)
    }

    console.log("✅ Loading cancelled for:", runsheet_code)
    return new Response(JSON.stringify({
      success: true,
      msg: "تم إلغاء التحميل وإعادة الرانشيت إلى حالة التحضير."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error("❌ Error:", error.message)
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})