// cancel-picking – إلغاء التحضير وتحرير المخزون المحجوز
// الإصدار 4.0 – Production Ready
//
// الإثباتات:
// 1. allocated_qty يُحدّث بنفس آلية complete-picking (branch_id + item_id)
// 2. Trigger sync_run_sheet_details يغني عن استدعاء Edge Function يدوياً (منع Double Rebuild)
// 3. رانشيت بحالة Picking بدون أوردرات = حالة مستحيلة ← تُحوّل إلى Error

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
    console.log("📥 cancel-picking v4.0 – rawBody:", rawBody)
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
      .select("id, status, picker_id")
      .eq("runsheet_code", runsheet_code)
      .maybeSingle()
    if (rsResult.error || !rsResult.data) throw new Error("الرانشيت غير موجود")
    var rs = rsResult.data

    if (rs.status !== "Picking") {
      throw new Error("لا يمكن إلغاء تحضير رانشيت ليس قيد التحضير. حالته: " + rs.status)
    }
    if (rs.picker_id !== pubUser.id) {
      throw new Error("هذا الرانشيت قيد التحضير من قبل محضّر آخر. لا يمكنك إلغاؤه.")
    }

    // ==========================================
    // 4. جلب main_branch_id من الإعدادات
    //    (نفس مصدر complete-picking – إثبات 1)
    // ==========================================
    var settingsResult = await supabase.from("app_settings")
      .select("main_branch_id").limit(1).maybeSingle()
    if (!settingsResult.data || !settingsResult.data.main_branch_id) {
      throw new Error("الفرع الرئيسي غير محدد في الإعدادات")
    }
    var mainBranchId = settingsResult.data.main_branch_id

    // ==========================================
    // 5. جلب جميع الأوردرات المرتبطة بالرانشيت
    // ==========================================
    var ordersResult = await supabase.from("orders")
      .select("id")
      .eq("runsheet_id", rs.id)

    // إثبات 3: رانشيت Picking بدون أوردرات = فساد بيانات
    if (!ordersResult.data || ordersResult.data.length === 0) {
      throw new Error(
        "فساد بيانات: الرانشيت " + runsheet_code + " في حالة Picking لكن لا توجد أوردرات مرتبطة به. " +
        "الرجاء التواصل مع الدعم الفني."
      )
    }

    var orderIds = []
    for (var oi = 0; oi < ordersResult.data.length; oi++) {
      orderIds.push(ordersResult.data[oi].id)
    }

    // ==========================================
    // 6. جلب الكميات المحضّرة من order_details
    //    (مصدر الحقيقة – وليس run_sheet_details)
    // ==========================================
    var odResult = await supabase.from("order_details")
      .select("id, item_code, item_id, qty_picked")
      .in("order_id", orderIds)

    if (odResult.error) {
      throw new Error("فشل جلب order_details: " + odResult.error.message)
    }

    var orderDetails = odResult.data || []

    // ==========================================
    // 7. تجميع qty_picked لكل item_code
    //    (نفس منطق Trigger sync_run_sheet_details)
    // ==========================================
    var aggMap = {}
    for (var d = 0; d < orderDetails.length; d++) {
      var od = orderDetails[d]
      var code = od.item_code
      var qty = Number(od.qty_picked) || 0
      if (qty <= 0) continue

      if (!aggMap[code]) {
        aggMap[code] = { item_code: code, item_id: od.item_id, total_qty_picked: 0 }
      }
      aggMap[code].total_qty_picked += qty
    }

    // ==========================================
    // 8. تحرير المخزون المحجوز لكل صنف
    //    (معكوس complete-picking – إثبات 1)
    //    نفس branch_id، نفس item_id، نفس المفتاح
    // ==========================================
    for (var code in aggMap) {
      if (!aggMap.hasOwnProperty(code)) continue
      var agg = aggMap[code]
      var totalPicked = agg.total_qty_picked

      // 8أ. جلب item_id من items إذا لم يكن موجوداً في order_details
      var itemId = agg.item_id
      if (!itemId) {
        var itemResult = await supabase.from("items")
          .select("id").eq("item_code", code).maybeSingle()
        if (itemResult.data) itemId = itemResult.data.id
      }

      if (!itemId) {
        console.warn("⚠️ تخطي الصنف – item_id غير موجود:", code)
        continue
      }

      // 8ب. جلب الرصيد الحالي
      var stockResult = await supabase.from("stock_branches")
        .select("allocated_qty")
        .eq("branch_id", mainBranchId)
        .eq("item_id", itemId)
        .maybeSingle()

      var currentAllocated = Number(stockResult.data?.allocated_qty || 0)

      // 8ج. كشف فساد البيانات – لا نخفي الأخطاء
      if (currentAllocated < totalPicked) {
        console.error(
          "❌ فساد بيانات – allocated_qty (" + currentAllocated + ") أقل من qty_picked (" + totalPicked + ") للصنف: " + code
        )
        throw new Error("فساد بيانات المخزون للصنف " + code + ". الرجاء التواصل مع الدعم الفني.")
      }

      var newAllocated = currentAllocated - totalPicked

      // 8د. تحرير الحجز – نفس مفتاح complete-picking: branch_id + item_id
      var stockUpdateResult = await supabase.from("stock_branches")
        .update({ allocated_qty: newAllocated })
        .eq("branch_id", mainBranchId)
        .eq("item_id", itemId)

      if (stockUpdateResult.error) {
        console.error("❌ فشل تحرير الحجز:", code, stockUpdateResult.error.message)
        throw new Error("فشل تحرير المخزون المحجوز للصنف " + code)
      }

      console.log("✅ تم تحرير الحجز:", code, "من", currentAllocated, "إلى", newAllocated)

      // 8هـ. تسجيل inventory_log مع التحقق من النجاح
      var logCode = "CNP-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
      var logInsertResult = await supabase.from("inventory_log").insert({
        company_id: "00000000-0000-0000-0000-000000000001",
        log_code: logCode,
        movement_date: new Date().toISOString().split("T")[0],
        voucher_id: runsheet_code,
        item_id: itemId,
        item_code: code,
        item_name: code,
        movement_type: "CancelPicking",
        qty: totalPicked,
        reference: runsheet_code,
        user_email: user.email
      })

      if (logInsertResult.error) {
        console.error("❌ فشل تسجيل inventory_log:", code, logInsertResult.error.message)
        throw new Error("فشل تسجيل حركة المخزون للصنف " + code)
      }

      console.log("✅ inventory_log مسجل:", code, "qty:", totalPicked)
    }

    // ==========================================
    // 9. تصفير order_details.qty_picked و reason_picking
    //    هذا سيشغّل Trigger trg_sync_run_sheet_details تلقائياً
    //    لا حاجة لاستدعاء Edge Function يدوياً (إثبات 2)
    // ==========================================
    var odUpdateResult = await supabase.from("order_details")
      .update({ qty_picked: 0, reason_picking: null })
      .in("order_id", orderIds)

    if (odUpdateResult.error) {
      console.error("❌ فشل تصفير order_details:", odUpdateResult.error.message)
      throw new Error("فشل تصفير order_details")
    }

    console.log("✅ order_details.qty_picked مصفّر لـ", orderIds.length, "أوردر")
    console.log("🔄 Trigger trg_sync_run_sheet_details سيعيد بناء run_sheet_details تلقائياً")

    // ==========================================
    // 10. إعادة الرانشيت إلى Open
    // ==========================================
    var updateResult = await supabase.from("runsheets")
      .update({
        status: "Open",
        picker_id: null,
        picker_start: null
      })
      .eq("id", rs.id)

    if (updateResult.error) {
      throw new Error("فشل تحديث حالة الرانشيت: " + updateResult.error.message)
    }

    console.log("✅ Picking cancelled for:", runsheet_code)
    return new Response(JSON.stringify({
      success: true,
      msg: "تم إلغاء التحضير وتحرير المخزون المحجوز."
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
