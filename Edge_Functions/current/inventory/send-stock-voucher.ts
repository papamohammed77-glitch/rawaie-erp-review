// send-stock-voucher – إرسال إذن مخزني وخصم المخزون
// الإصدار 2.1 – حماية خصم المخزون من Race Condition عبر Compare-and-Swap

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
    console.log("📥 send-stock-voucher v2.1 – rawBody:", rawBody)
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var voucher_code = body.voucher_code
    if (!voucher_code) throw new Error("رقم الإذن مطلوب")

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
      .select("id, type, status, from_type, from_id")
      .eq("voucher_code", voucher_code)
      .maybeSingle()
    if (voucherResult.error || !voucherResult.data) throw new Error("الإذن غير موجود")
    var voucher = voucherResult.data
    if (voucher.status !== "Draft") throw new Error("يمكن إرسال المسودات فقط")

    // تحديد الفرع المصدر
    var fromBranchId = voucher.from_id || mainBranchId
    console.log("📤 From branch:", fromBranchId)

    // أنواع الأذونات التي تخصم المخزون
    var deductTypes = ["Transfer", "DirectSale", "SupplierReturn"]
    if (deductTypes.indexOf(voucher.type) !== -1) {
      var detailsResult = await supabase.from("stock_voucher_details")
        .select("item_code, qty")
        .eq("voucher_id", voucher.id)

      var details = detailsResult.data || []

      for (var i = 0; i < details.length; i++) {
        var det = details[i]
        var qty = Number(det.qty) || 0
        if (qty <= 0) continue

        // جلب item_id من items
        var itemResult = await supabase.from("items")
          .select("id").eq("item_code", det.item_code).maybeSingle()
        if (!itemResult.data) throw new Error("الصنف غير موجود: " + det.item_code)
        var itemId = itemResult.data.id

        // قراءة حالة المخزون الحالية. سيتم استخدام القيم المقروءة
        // كـ compare-and-swap guard في UPDATE الذري التالي.
        var stockResult = await supabase.from("stock_branches")
          .select("id, qty, allocated_qty")
          .eq("branch_id", fromBranchId)
          .eq("item_id", itemId)
          .maybeSingle()

        if (stockResult.error) throw new Error("فشل قراءة المخزون لـ " + det.item_code + ": " + stockResult.error.message)
        if (!stockResult.data) throw new Error("رصيد المخزون غير موجود للصنف " + det.item_code)

        var stockRow = stockResult.data
        var currentQty = Number(stockRow.qty || 0)
        var currentAllocated = Number(stockRow.allocated_qty || 0)
        var available = currentQty - currentAllocated

        if (available < qty) throw new Error("الرصيد غير كافٍ للصنف " + det.item_code)

        // خصم ذري باستخدام Compare-and-Swap:
        // لا يتم تنفيذ الخصم إلا إذا ظلت qty و allocated_qty كما قرأناهما.
        // بذلك يمنع التحديث المتزامن من الكتابة فوق رصيد قرأناه قبل التغيير.
        var stockUpdate = await supabase.from("stock_branches")
          .update({ qty: currentQty - qty })
          .eq("id", stockRow.id)
          .eq("qty", currentQty)
          .eq("allocated_qty", currentAllocated)
          .gte("qty", currentAllocated + qty)
          .select("id")

        if (stockUpdate.error) throw new Error("فشل خصم المخزون لـ " + det.item_code + ": " + stockUpdate.error.message)
        if (!stockUpdate.data || stockUpdate.data.length !== 1) {
          throw new Error("تغير رصيد المخزون للصنف " + det.item_code + " أثناء العملية؛ أعد المحاولة")
        }

        // ============================================================
        // كتابة inventory_log
        // ============================================================
        var logCode = "OUT-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
        var logResult = await supabase.from("inventory_log").insert({
          company_id: "00000000-0000-0000-0000-000000000001",
          log_code: logCode,
          movement_date: new Date().toISOString().split("T")[0],
          voucher_id: voucher_code,
          item_id: itemId,
          item_code: det.item_code,
          item_name: det.item_name || det.item_code,
          movement_type: voucher.type,
          qty: qty,
          reference: voucher_code,
          user_email: user.email
        })
        if (logResult.error) throw new Error("فشل تسجيل حركة المخزون لـ " + det.item_code + ": " + logResult.error.message)
      }
    }

    // تحديث حالة الإذن إلى مرسل
    var statusResult = await supabase.from("stock_vouchers").update({
      status: "Sent",
      sent_date: new Date().toISOString()
    }).eq("id", voucher.id)
    if (statusResult.error) throw new Error("فشل تحديث حالة الإذن: " + statusResult.error.message)

    console.log("✅ Voucher sent:", voucher_code)
    return new Response(JSON.stringify({ success: true, msg: "تم إرسال الإذن وخصم المخزون" }), {
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
