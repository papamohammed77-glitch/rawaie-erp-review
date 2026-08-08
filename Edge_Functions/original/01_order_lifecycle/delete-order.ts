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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    var rawBody = await req.text()
    console.log("📥 delete-order (Hard Delete) – rawBody:", rawBody)
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var order_code = body.order_code
    if (!order_code) throw new Error("رقم الأوردر مطلوب")

    // مصادقة
    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var authResult = await supabase.auth.getUser(token)
    if (authResult.error || !authResult.data.user) throw new Error("جلسة غير صالحة")
    var user = authResult.data.user

    // ١. جلب الأوردر والتحقق من حالته
    var orderResult = await supabase.from("orders")
      .select("id, order_code, order_status, runsheet_id, customer_id, customer_name, total_amount, branch_id")
      .eq("order_code", order_code)
      .maybeSingle()

    if (orderResult.error || !orderResult.data) throw new Error("الأوردر غير موجود")
    var order = orderResult.data

    if (order.runsheet_id) throw new Error("لا يمكن حذف أوردر مربوط برانشيت")
    
    // ✅ منع حذف الفواتير التي تمت عليها مرتجعات (تتعامل عبر نظام المرتجعات)
    if (order.order_status === "Returned" || order.order_status === "Partially Returned") {
      throw new Error("لا يمكن حذف فاتورة تمت عليها مرتجعات. استخدم نظام المرتجعات لعكس الآثار.")
    }

    // ٢. جلب main_branch_id
    var settingsResult = await supabase.from("app_settings")
      .select("main_branch_id").limit(1).maybeSingle()
    if (!settingsResult.data || !settingsResult.data.main_branch_id) throw new Error("الفرع الرئيسي غير محدد")
    var mainBranchId = settingsResult.data.main_branch_id
    var branchId = order.branch_id || mainBranchId

    // ٣. جلب تفاصيل الأوردر
    var detailsResult = await supabase.from("order_details")
      .select("id, item_code, item_name, unit, qty, unit_price, item_id")
      .eq("order_id", order.id)

    var details = detailsResult.data || []

    // ٤. عكس الآثار (لجميع الأوردرات، بصرف النظر عن الحالة)
    var totalReturnedValue = 0
    for (var i = 0; i < details.length; i++) {
      var det = details[i]
      var qty = Number(det.qty) || 0
      if (qty <= 0) continue

      var itemId = det.item_id
      if (!itemId) {
        var itemResult = await supabase.from("items").select("id").eq("item_code", det.item_code).maybeSingle()
        if (!itemResult.data) throw new Error("الصنف غير موجود: " + det.item_code)
        itemId = itemResult.data.id
      }

      // إعادة المخزون
      var stockResult = await supabase.from("stock_branches")
        .select("qty, allocated_qty")
        .eq("branch_id", branchId)
        .eq("item_id", itemId)
        .maybeSingle()

      var currentQty = Number(stockResult.data?.qty || 0)
      var currentAllocated = Number(stockResult.data?.allocated_qty || 0)
      var newQty = currentQty + qty

      // تحرير الحجز أولاً إذا كان موجوداً
      if (currentAllocated > 0) {
        var releaseQty = Math.min(currentAllocated, qty)
        await supabase.from("stock_branches")
          .update({ allocated_qty: currentAllocated - releaseQty })
          .eq("branch_id", branchId)
          .eq("item_id", itemId)
      }

      // إعادة المخزون الفعلي
      var stockError = await supabase.from("stock_branches")
        .update({ qty: newQty })
        .eq("branch_id", branchId)
        .eq("item_id", itemId)
      if (stockError.error) throw new Error("فشل إعادة المخزون لـ " + det.item_code + ": " + stockError.error.message)

      // تجميع قيمة المخزون للقيد العكسي
      totalReturnedValue += qty * (Number(det.unit_price) || 0)

      // كتابة inventory_log
      var logCode = "VOID-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
      await supabase.from("inventory_log").insert({
        company_id: "00000000-0000-0000-0000-000000000001",
        log_code: logCode,
        movement_date: new Date().toISOString().split("T")[0],
        voucher_id: order_code,
        item_id: itemId,
        item_code: det.item_code,
        item_name: det.item_name || det.item_code,
        movement_type: "VoidInvoice",
        qty: qty,
        reference: "VOID-" + order_code,
        user_email: user.email
      })
    }

    // ٥. عكس القيد المحاسبي (إنشاء قيد عكسي)
    if (totalReturnedValue > 0) {
      var entryCode = "JE-VOID-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
      var entryResult = await supabase.from("journal_entries").insert({
        company_id: "00000000-0000-0000-0000-000000000001",
        entry_code: entryCode,
        entry_date: new Date().toISOString().split("T")[0],
        reference: "VOID-" + order_code,
        description: "حذف فاتورة مبيعات – " + order_code,
        entry_type: "VoidInvoice",
        status: "Posted",
        created_by: user.email,
        posting_date: new Date().toISOString()
      }).select("id").single()

      if (entryResult.data) {
        await supabase.from("journal_lines").insert([
          { entry_id: entryResult.data.id, account_id: "41", account_name: "إيرادات المبيعات", debit: totalReturnedValue, credit: 0 },
          { entry_id: entryResult.data.id, account_id: order.customer_id || "123", account_name: order.customer_name || "العميل", debit: 0, credit: totalReturnedValue }
        ])
        console.log("✅ قيد عكسي للحذف:", entryCode)
      }
    }

    // ٦. عكس customer_ledger (إلغاء المديونية)
    if (order.customer_id && totalReturnedValue > 0) {
      var ledgerResult = await supabase.from("customer_ledger")
        .select("balance")
        .eq("customer_id", order.customer_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      var previousBalance = Number(ledgerResult.data?.balance) || 0
      var newBalance = previousBalance - totalReturnedValue

      await supabase.from("customer_ledger").insert({
        customer_id: order.customer_id,
        entry_date: new Date().toISOString().split("T")[0],
        reference: "VOID-" + order_code,
        description: "حذف فاتورة – " + order_code,
        debit: 0,
        credit: totalReturnedValue,
        balance: newBalance,
        due_date: new Date().toISOString().split("T")[0],
        user_email: user.email
      })
      console.log("✅ customer_ledger updated:", order.customer_name, "credit:", totalReturnedValue)
    }

    // ٧. ✅ الحذف الفعلي (Hard Delete) للأوردر وتفاصيله
    var deleteDetailsResult = await supabase.from("order_details").delete().eq("order_id", order.id)
    if (deleteDetailsResult.error) throw new Error("فشل حذف تفاصيل الأوردر: " + deleteDetailsResult.error.message)

    var deleteOrderResult = await supabase.from("orders").delete().eq("id", order.id)
    if (deleteOrderResult.error) throw new Error("فشل حذف الأوردر: " + deleteOrderResult.error.message)

    // ٨. تسجيل audit_log
    await supabase.from("audit_log").insert({
      user_email: user.email,
      action: "hard_delete_order",
      table_name: "orders",
      record_id: order_code,
      new_data: { deleted_order_code: order_code, deleted_by: user.email, total_reversed_value: totalReturnedValue }
    })

    console.log("✅ Order hard-deleted successfully:", order_code)
    return new Response(JSON.stringify({ success: true, msg: "تم حذف الأوردر نهائياً بنجاح" }), {
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
