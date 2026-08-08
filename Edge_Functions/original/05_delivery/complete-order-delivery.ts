// complete-order-delivery – إنهاء تسليم أوردر واحد
// الإصدار 4.0 – مع أسباب الرفض، المبلغ المدفوع، سجل المخزون، وسجل العميل
// الإصدار 4.1 – إصلاح: استبدال supabase.functions.invoke بـ fetch اليدوي (المادة ٦)

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
    console.log("🚀 complete-order-delivery v4.1 – rawBody:", rawBody)
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var runsheet_code = body.runsheet_code
    var order_code = body.order_code
    var items = body.items
    console.log("📥 runsheet_code:", runsheet_code, "order_code:", order_code)
    if (!runsheet_code || !order_code || !items || !items.length) throw new Error("البيانات غير مكتملة")

    // مصادقة
    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var authResult = await supabase.auth.getUser(token)
    if (authResult.error || !authResult.data.user) throw new Error("جلسة غير صالحة")
    var user = authResult.data.user
    console.log("👤 User:", user.email)

    // جلب public.users.id
    var pubUserResult = await supabase.from("users").select("id").eq("email", user.email).maybeSingle()
    if (!pubUserResult.data) throw new Error("المستخدم غير موجود في سجلات الموظفين")
    var pubUser = pubUserResult.data

    // جلب الرانشيت
    var rsResult = await supabase.from("runsheets")
      .select("id, status, driver_id")
      .eq("runsheet_code", runsheet_code)
      .maybeSingle()
    if (rsResult.error || !rsResult.data) throw new Error("الرانشيت غير موجود")
    var rs = rsResult.data
    if (rs.status !== "Delivering") throw new Error("الرانشيت ليس قيد التوصيل")
    if (rs.driver_id !== pubUser.id) throw new Error("هذا الرانشيت لا يخصك")

    // جلب الأوردر
    var orderResult = await supabase.from("orders")
      .select("id, order_status, customer_id, customer_name, payment_type")
      .eq("order_code", order_code)
      .eq("runsheet_id", rs.id)
      .maybeSingle()
    if (orderResult.error || !orderResult.data) throw new Error("الأوردر غير موجود أو غير مرتبط بهذا الرانشيت")
    var order = orderResult.data
    if (order.order_status === "Delivered") throw new Error("هذا الأوردر تم تسليمه بالفعل")

    // جلب إعدادات الضريبة ورسوم التوصيل
    var settingsResult = await supabase.from("app_settings")
      .select("delivery_fee, tax_rate, currency")
      .limit(1)
      .maybeSingle()
    if (settingsResult.error) throw new Error("فشل جلب إعدادات التطبيق")
    var deliveryFee = Number(settingsResult.data?.delivery_fee) || 0
    var taxRate = Number(settingsResult.data?.tax_rate) || 0
    var currency = settingsResult.data?.currency || "SAR"

    // تحديث كل صنف في order_details وحساب الإجمالي
    var subtotal = 0
    for (var i = 0; i < items.length; i++) {
      var item = items[i]
      var deliveredQty = Number(item.deliveredQty) || 0
      var reason = item.reason || ""

      // جلب بيانات الصنف من order_details
      var odDetailResult = await supabase.from("order_details")
        .select("qty_loaded, unit_price, item_id")
        .eq("order_id", order.id)
        .eq("item_code", item.itemCode)
        .maybeSingle()
      if (odDetailResult.error || !odDetailResult.data) throw new Error("تفاصيل الأوردر غير موجودة للصنف " + item.itemCode)

      var loadedQty = Number(odDetailResult.data.qty_loaded) || 0
      if (deliveredQty > loadedQty) throw new Error("الكمية المسلّمة أكبر من المحملة للصنف " + item.itemCode)

      var refusedQty = Math.max(0, loadedQty - deliveredQty)
      var unitPrice = Number(odDetailResult.data.unit_price) || 0
      var itemId = odDetailResult.data.item_id

      subtotal += deliveredQty * unitPrice

      // تجهيز reason_delivery إذا كان هناك رفض
      var reasonDelivery = null
      if (refusedQty > 0) {
        reasonDelivery = reason || "رفض من العميل"
      }

      var updateData = {
        qty_delivered: deliveredQty,
        qty_refused: refusedQty,
        notes: reason || null
      }
      if (reasonDelivery) {
        updateData.reason_delivery = reasonDelivery
      }

      await supabase.from("order_details").update(updateData)
        .eq("order_id", order.id).eq("item_code", item.itemCode)

      console.log("✅ order_details updated:", item.itemCode, "delivered:", deliveredQty, "refused:", refusedQty)

      // كتابة inventory_log – تسليم
      if (deliveredQty > 0 && itemId) {
        var logCode = "DLV-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
        await supabase.from("inventory_log").insert({
          company_id: "00000000-0000-0000-0000-000000000001",
          log_code: logCode,
          movement_date: new Date().toISOString().split("T")[0],
          voucher_id: order_code,
          item_id: itemId,
          item_code: item.itemCode,
          item_name: item.itemName || item.itemCode,
          movement_type: "Delivery",
          qty: deliveredQty,
          reference: runsheet_code,
          user_email: user.email
        })
      }
    }

    // احتساب الفاتورة
    var taxAmount = Math.round((subtotal + deliveryFee) * taxRate) / 100
    var grandTotal = subtotal + deliveryFee + taxAmount

    // حساب amount_paid
    var isCash = order.payment_type === "نقدي"
    var amountPaid = isCash ? grandTotal : 0

    // تحديث الأوردر
    await supabase.from("orders").update({
      order_status: "Delivered",
      total_amount: grandTotal,
      amount_paid: amountPaid
    }).eq("id", order.id)
    console.log("✅ order updated:", order_code, "status: Delivered, total:", grandTotal, "paid:", amountPaid)

    // تجميع الكميات المسلّمة لجميع الأوردرات وتحديث run_sheet_details
    var ordersDataResult = await supabase.from("orders")
      .select("id").eq("runsheet_id", rs.id)
    var orderIds = []
    if (ordersDataResult.data) {
      for (var oi = 0; oi < ordersDataResult.data.length; oi++) {
        orderIds.push(ordersDataResult.data[oi].id)
      }
    }

    if (orderIds.length > 0) {
      var allDetailsResult = await supabase.from("order_details")
        .select("item_code, qty_delivered")
        .in("order_id", orderIds)

      if (allDetailsResult.data && allDetailsResult.data.length > 0) {
        var agg = {}
        for (var j = 0; j < allDetailsResult.data.length; j++) {
          var d = allDetailsResult.data[j]
          if (d.item_code && (Number(d.qty_delivered) || 0) > 0) {
            agg[d.item_code] = (agg[d.item_code] || 0) + (Number(d.qty_delivered) || 0)
          }
        }
        for (var code in agg) {
          if (agg.hasOwnProperty(code)) {
            await supabase.from("run_sheet_details").update({
              qty_delivered: agg[code]
            }).eq("runsheet_id", rs.id).eq("item_code", code)
            console.log("✅ run_sheet_details updated:", code, "qty_delivered:", agg[code])
          }
        }
      }
    }

    // إنشاء قيد محاسبي
    if (grandTotal > 0) {
      var entryCode = "JE-DEL-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
      var entryResult = await supabase.from("journal_entries").insert({
        entry_code: entryCode,
        entry_date: new Date().toISOString().split("T")[0],
        reference: order_code,
        description: "تسليم أوردر " + order_code,
        entry_type: "SalesDelivery",
        status: "Posted",
        created_by: user.email,
        posting_date: new Date().toISOString(),
        company_id: "00000000-0000-0000-0000-000000000001"
      }).select("id").single()

      if (entryResult.data) {
        await supabase.from("journal_lines").insert([
          {
            entry_id: entryResult.data.id,
            account_id: isCash ? "121" : order.customer_id,
            account_name: isCash ? "الخزينة" : order.customer_name,
            debit: grandTotal,
            credit: 0
          },
          {
            entry_id: entryResult.data.id,
            account_id: "41",
            account_name: "إيرادات المبيعات",
            debit: 0,
            credit: subtotal
          },
          {
            entry_id: entryResult.data.id,
            account_id: "4",
            account_name: "ضريبة القيمة المضافة",
            debit: 0,
            credit: taxAmount
          }
        ])
        console.log("✅ Journal entry created:", entryCode)
      }
    }

    // إضافة سجل customer_ledger إذا الدفع آجل
    if (!isCash && order.customer_id) {
      var ledgerResult = await supabase.from("customer_ledger")
        .select("balance")
        .eq("customer_id", order.customer_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      var previousBalance = Number(ledgerResult.data?.balance) || 0
      var newBalance = previousBalance + grandTotal

      await supabase.from("customer_ledger").insert({
        customer_id: order.customer_id,
        entry_date: new Date().toISOString().split("T")[0],
        reference: order_code,
        description: "فاتورة مبيعات – " + order_code,
        debit: grandTotal,
        credit: 0,
        balance: newBalance,
        due_date: new Date().toISOString().split("T")[0],
        user_email: user.email
      })
      console.log("✅ customer_ledger updated:", order.customer_name, "debit:", grandTotal, "balance:", newBalance)
    }

    // 🆕 إعادة تجميع run_sheet_details من order_details – باستخدام fetch اليدوي (إصلاح المادة ٦)
    try {
      var SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
      var syncResponse = await fetch(SUPABASE_URL + "/functions/v1/sync-run-sheet-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        },
        body: JSON.stringify({ runsheet_id: rs.id })
      })

      if (!syncResponse.ok) {
        var syncErrorBody = await syncResponse.text()
        console.warn("⚠️ فشل استدعاء sync-run-sheet-details:", syncResponse.status, syncErrorBody)
      } else {
        var syncResult = await syncResponse.json()
        console.log("🔄 sync-run-sheet-details:", JSON.stringify(syncResult))
      }
    } catch (syncError) {
      console.warn("⚠️ فشل استدعاء sync-run-sheet-details:", syncError.message)
    }

    console.log("🎉 complete-order-delivery v4.1 finished")
    return new Response(JSON.stringify({
      success: true,
      msg: "تم إنهاء تسليم الأوردر",
      invoice: {
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        tax_amount: taxAmount,
        grand_total: grandTotal,
        amount_paid: amountPaid,
        currency: currency
      }
    }), {
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
