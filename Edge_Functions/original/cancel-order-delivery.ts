// complete-order-delivery – إنهاء تسليم أوردر واحد
// تحتسب الفاتورة (بضاعة + توصيل + ضريبة) وتحدث الكميات
// ✅ الإصدار المحدث: تجميع qty_delivered إلى run_sheet_details مع سجلات تشخيص كاملة
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

serve(async (req) => {
  const origin = req.headers.get("Origin") || "*"
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    var rawBody = await req.text()
    console.log("🚀 complete-order-delivery called");
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var runsheet_code = body.runsheet_code
    var order_code = body.order_code
    var items = body.items
    console.log("📥 runsheet_code:", runsheet_code, "order_code:", order_code);
    if (!runsheet_code || !order_code || !items || !items.length) throw new Error("البيانات غير مكتملة")

    // مصادقة
    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error("جلسة غير صالحة")
    console.log("👤 User:", user.email);

    // جلب public.users.id
    var { data: pubUser } = await supabase.from("users").select("id").eq("email", user.email).maybeSingle()
    if (!pubUser) throw new Error("المستخدم غير موجود في سجلات الموظفين")

    // جلب الرانشيت
    var { data: rs, error: rsError } = await supabase.from("runsheets")
      .select("id, status, driver_id")
      .eq("runsheet_code", runsheet_code)
      .maybeSingle()
    if (rsError || !rs) throw new Error("الرانشيت غير موجود")
    if (rs.status !== "Delivering") throw new Error("الرانشيت ليس قيد التوصيل")
    if (rs.driver_id !== pubUser.id) throw new Error("هذا الرانشيت لا يخصك")

    // جلب الأوردر
    var { data: order, error: orderError } = await supabase.from("orders")
      .select("id, order_status, customer_id, customer_name, payment_type")
      .eq("order_code", order_code)
      .eq("runsheet_id", rs.id)
      .maybeSingle()
    if (orderError || !order) throw new Error("الأوردر غير موجود أو غير مرتبط بهذا الرانشيت")
    if (order.order_status === "Delivered") throw new Error("هذا الأوردر تم تسليمه بالفعل")

    // جلب إعدادات الضريبة ورسوم التوصيل
    var { data: settings, error: settingsError } = await supabase.from("app_settings")
      .select("delivery_fee, tax_rate, currency")
      .limit(1)
      .maybeSingle()
    if (settingsError) throw new Error("فشل جلب إعدادات التطبيق")
    var deliveryFee = Number(settings?.delivery_fee) || 0
    var taxRate = Number(settings?.tax_rate) || 0
    var currency = settings?.currency || "SAR"

    // تحديث كل صنف في order_details وحساب الإجمالي
    var subtotal = 0
    for (var i = 0; i < items.length; i++) {
      var item = items[i]
      var deliveredQty = Number(item.deliveredQty) || 0
      var reason = item.reason || ""

      // جلب بيانات الصنف من order_details
      var { data: odDetail, error: odError } = await supabase.from("order_details")
        .select("qty_loaded, unit_price")
        .eq("order_id", order.id)
        .eq("item_code", item.itemCode)
        .maybeSingle()
      if (odError || !odDetail) throw new Error("تفاصيل الأوردر غير موجودة للصنف " + item.itemCode)

      var loadedQty = Number(odDetail.qty_loaded) || 0
      if (deliveredQty > loadedQty) throw new Error("الكمية المسلّمة أكبر من المحملة للصنف " + item.itemCode)

      var refusedQty = Math.max(0, loadedQty - deliveredQty)
      var unitPrice = Number(odDetail.unit_price) || 0

      subtotal += deliveredQty * unitPrice

      await supabase.from("order_details").update({
        qty_delivered: deliveredQty,
        qty_refused: refusedQty,
        notes: reason || null
      }).eq("order_id", order.id).eq("item_code", item.itemCode)
      
      console.log("✅ order_details updated:", item.itemCode, "delivered:", deliveredQty);
    }

    // احتساب الفاتورة
    var taxAmount = Math.round((subtotal + deliveryFee) * taxRate) / 100
    var grandTotal = subtotal + deliveryFee + taxAmount

    // تحديث الأوردر – original_total_amount لا يُلمس
    await supabase.from("orders").update({
      order_status: "Delivered",
      total_amount: grandTotal
    }).eq("id", order.id)
    console.log("✅ order updated:", order_code, "status: Delivered, total:", grandTotal);

    // ✅ تجميع الكميات المسلّمة لجميع الأوردرات وتحديث run_sheet_details (مُصلح)
    // الخطوة ١: جلب جميع الأوردرات في الرانشيت
    var { data: ordersData, error: ordersFetchError } = await supabase
      .from("orders")
      .select("id")
      .eq("runsheet_id", rs.id)

    if (ordersFetchError) {
      console.error("❌ فشل جلب الأوردرات للتجميع:", ordersFetchError.message)
    } else if (ordersData && ordersData.length > 0) {
      var orderIds = []
      for (var oi = 0; oi < ordersData.length; oi++) {
        orderIds.push(ordersData[oi].id)
      }
      console.log("📋 جاري تجميع qty_delivered لـ", orderIds.length, "أوردر")

      // الخطوة ٢: جلب جميع order_details لهذه الأوردرات
      var { data: allOrderDetails, error: allError } = await supabase
        .from("order_details")
        .select("item_code, qty_delivered")
        .in("order_id", orderIds)

      if (allError) {
        console.error("❌ فشل جلب order_details للتجميع:", allError.message)
      } else if (allOrderDetails && allOrderDetails.length > 0) {
        // الخطوة ٣: تجميع qty_delivered لكل صنف
        var agg = {}
        for (var j = 0; j < allOrderDetails.length; j++) {
          var d = allOrderDetails[j]
          if (d.item_code && (Number(d.qty_delivered) || 0) > 0) {
            agg[d.item_code] = (agg[d.item_code] || 0) + (Number(d.qty_delivered) || 0)
          }
        }
        console.log("📊 نتائج التجميع:", JSON.stringify(agg))

        // الخطوة ٤: تحديث run_sheet_details لكل صنف
        var updateCount = 0
        for (var code in agg) {
          if (agg.hasOwnProperty(code)) {
            var newQty = agg[code]
            var { error: updateError } = await supabase
              .from("run_sheet_details")
              .update({ qty_delivered: newQty })
              .eq("runsheet_id", rs.id)
              .eq("item_code", code)

            if (updateError) {
              console.error("❌ فشل تحديث run_sheet_details لـ", code, ":", updateError.message)
            } else {
              updateCount++
              console.log("✅ run_sheet_details updated:", code, "qty_delivered:", newQty)
            }
          }
        }
        console.log("✅ تم تحديث", updateCount, "من", Object.keys(agg).length, "صنف في run_sheet_details")
      } else {
        console.log("⚠️ لا توجد order_details للتجميع (جميع الكميات صفر)")
      }
    } else {
      console.log("⚠️ لا توجد أوردرات في هذا الرانشيت")
    }

    // إنشاء قيد محاسبي
    if (grandTotal > 0) {
      var entryCode = "JE-DEL-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
      var { data: entryInsert } = await supabase.from("journal_entries").insert({
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

      if (entryInsert) {
        var isCash = order.payment_type === "نقدي"
        await supabase.from("journal_lines").insert([
          { entry_id: entryInsert.id, account_id: isCash ? "121" : order.customer_id, account_name: isCash ? "الخزينة" : order.customer_name, debit: grandTotal, credit: 0 },
          { entry_id: entryInsert.id, account_id: "41", account_name: "إيرادات المبيعات", debit: 0, credit: subtotal },
          { entry_id: entryInsert.id, account_id: "4", account_name: "ضريبة القيمة المضافة", debit: 0, credit: taxAmount }
        ])
        console.log("✅ Journal entry created:", entryCode);
      }
    }

    console.log("🎉 complete-order-delivery finished");
    return new Response(JSON.stringify({
      success: true,
      msg: "تم إنهاء تسليم الأوردر",
      invoice: { subtotal: subtotal, delivery_fee: deliveryFee, tax_amount: taxAmount, grand_total: grandTotal, currency: currency }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (error) {
    console.error("❌ Error:", error.message)
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})