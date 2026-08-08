// complete-loading – إنهاء التحميل وخصم المخزون الفعلي
// الإصدار 3.0 – مع سجل المخزون، أسباب التحميل، والقيد المحاسبي
// الإصدار 3.1 – إصلاح: استبدال supabase.functions.invoke بـ fetch اليدوي (المادة ٦)
// الإصدار 4.0 – 🆕 P2: آلية Backorder للكميات المتبقية

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
    console.log("📥 complete-loading v4.0 – rawBody:", rawBody)
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var runsheet_code = body.runsheet_code
    var items = body.items
    if (!runsheet_code || !items || !items.length) throw new Error("البيانات غير مكتملة")

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

    // جلب إعدادات الضريبة ورسوم التوصيل
    var appSettingsResult = await supabase.from("app_settings")
      .select("delivery_fee, tax_rate").limit(1).maybeSingle()
    var deliveryFee = Number(appSettingsResult.data?.delivery_fee) || 0
    var taxRate = Number(appSettingsResult.data?.tax_rate) || 0

    // جلب الرانشيت
    var rsResult = await supabase.from("runsheets")
      .select("id, status").eq("runsheet_code", runsheet_code).maybeSingle()
    if (rsResult.error || !rsResult.data) throw new Error("الرانشيت غير موجود")
    var rs = rsResult.data
    if (rs.status !== "Loading") throw new Error("الرانشيت ليس قيد التحميل")

    var totalLoadedValue = 0

    // ١. خصم المخزون الفعلي ورفع الحجز
    for (var i = 0; i < items.length; i++) {
      var item = items[i]
      var loadedQty = Number(item.loadedQty) || 0
      if (loadedQty <= 0) continue

      // جلب item_id
      var itemResult = await supabase.from("items")
        .select("id").eq("item_code", item.itemCode).maybeSingle()
      if (!itemResult.data) throw new Error("الصنف غير موجود: " + item.itemCode)
      var itemId = itemResult.data.id

      // جلب المخزون الحالي
      var stockResult = await supabase.from("stock_branches")
        .select("qty, allocated_qty")
        .eq("branch_id", mainBranchId)
        .eq("item_id", itemId)
        .maybeSingle()

      var currentQty = Number(stockResult.data?.qty || 0)
      var currentAllocated = Number(stockResult.data?.allocated_qty || 0)

      if (currentQty < loadedQty) throw new Error("الرصيد غير كافٍ للصنف " + item.itemCode)

      // خصم المخزون
      var stockError = await supabase.from("stock_branches")
        .update({
          qty: currentQty - loadedQty,
          allocated_qty: Math.max(0, currentAllocated - loadedQty)
        })
        .eq("branch_id", mainBranchId)
        .eq("item_id", itemId)
      if (stockError.error) throw new Error("فشل تحديث المخزون لـ " + item.itemCode + ": " + stockError.error.message)

      // كتابة inventory_log
      var logCode = "LOD-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
      await supabase.from("inventory_log").insert({
        company_id: "00000000-0000-0000-0000-000000000001",
        log_code: logCode,
        movement_date: new Date().toISOString().split("T")[0],
        voucher_id: runsheet_code,
        item_id: itemId,
        item_code: item.itemCode,
        item_name: item.itemName || item.itemCode,
        movement_type: "Loading",
        qty: loadedQty,
        reference: runsheet_code,
        user_email: user.email
      })

      // تجميع قيمة المخزون للقيد المحاسبي
      var itemPriceResult = await supabase.from("items")
        .select("cost_price").eq("id", itemId).maybeSingle()
      var costPrice = Number(itemPriceResult.data?.cost_price) || 0
      totalLoadedValue += loadedQty * costPrice
    }

    // ٢. تحديث الكميات المحمّلة في run_sheet_details
    for (var k = 0; k < items.length; k++) {
      var itm = items[k]
      var loadedQty2 = Number(itm.loadedQty) || 0
      if (loadedQty2 <= 0) continue

      var detailResult2 = await supabase.from("run_sheet_details")
        .select("qty_loaded, remaining_qty")
        .eq("runsheet_id", rs.id).eq("item_code", itm.itemCode).maybeSingle()

      var currentLoaded = Number(detailResult2.data?.qty_loaded || 0)
      var currentRemaining = Number(detailResult2.data?.remaining_qty || 0)

      await supabase.from("run_sheet_details").update({
        qty_loaded: currentLoaded + loadedQty2,
        remaining_qty: currentRemaining + loadedQty2
      }).eq("runsheet_id", rs.id).eq("item_code", itm.itemCode)
    }

    // ٣. تحديث qty_loaded في order_details لكل صنف في كل أوردر
    var ordersResult = await supabase.from("orders")
      .select("id")
      .eq("runsheet_id", rs.id)

    if (ordersResult.error) {
      console.error("❌ فشل جلب الأوردرات:", ordersResult.error.message)
    } else if (ordersResult.data && ordersResult.data.length > 0) {
      var orderIds = []
      for (var o = 0; o < ordersResult.data.length; o++) {
        orderIds.push(ordersResult.data[o].id)
      }

      for (var m = 0; m < items.length; m++) {
        var loadedItem = items[m]
        var loadedQty3 = Number(loadedItem.loadedQty) || 0
        if (loadedQty3 <= 0) continue

        var odResult = await supabase.from("order_details")
          .select("id, qty_loaded, qty_picked, unit_price")
          .in("order_id", orderIds)
          .eq("item_code", loadedItem.itemCode)

        if (odResult.error) {
          console.error("❌ فشل جلب order_details:", odResult.error.message)
          continue
        }

        if (odResult.data && odResult.data.length > 0) {
          for (var n = 0; n < odResult.data.length; n++) {
            var odItem = odResult.data[n]
            var existingLoaded = Number(odItem.qty_loaded || 0)
            var pickedQty = Number(odItem.qty_picked || 0)
            var newLoaded = existingLoaded + loadedQty3

            // حساب reason_loading إذا كان هناك نقص
            var reasonLoading = null
            if (loadedQty3 < pickedQty) {
              reasonLoading = loadedItem.notes || "نقص في التحميل"
            }

            var updateData = { qty_loaded: newLoaded }
            if (reasonLoading) {
              updateData.reason_loading = reasonLoading
            }

            var odUpdateError = await supabase.from("order_details")
              .update(updateData)
              .eq("id", odItem.id)

            if (odUpdateError.error) {
              console.error("❌ فشل تحديث order_details:", odUpdateError.error.message)
            } else {
              console.log("✅ order_details updated:", odItem.id, "qty_loaded:", newLoaded)
            }
          }
        }
      }
    }

    // ٤. تحديث original_total_amount لكل أوردر
    if (ordersResult.data && ordersResult.data.length > 0) {
      for (var p = 0; p < ordersResult.data.length; p++) {
        var orderId = ordersResult.data[p].id

        var orderDetailsResult = await supabase.from("order_details")
          .select("qty_loaded, unit_price")
          .eq("order_id", orderId)

        var orderGoodsValue = 0
        if (orderDetailsResult.data) {
          for (var q = 0; q < orderDetailsResult.data.length; q++) {
            orderGoodsValue += (Number(orderDetailsResult.data[q].qty_loaded) || 0) * (Number(orderDetailsResult.data[q].unit_price) || 0)
          }
        }

        var orderOriginalTotal = orderGoodsValue + deliveryFee
        if (taxRate > 0) {
          orderOriginalTotal = Math.round(orderOriginalTotal * (1 + taxRate / 100) * 100) / 100
        }

        var updateOriginalError = await supabase.from("orders")
          .update({ original_total_amount: orderOriginalTotal })
          .eq("id", orderId)

        if (updateOriginalError.error) {
          console.error("❌ فشل تحديث original_total_amount:", updateOriginalError.error.message)
        } else {
          console.log("✅ original_total_amount updated for order:", orderId, orderOriginalTotal)
        }
      }
    }

    // ٥. إنشاء قيد محاسبي – تكلفة البضاعة المباعة
    if (totalLoadedValue > 0) {
      var entryCode = "JE-LOD-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
      var entryResult = await supabase.from("journal_entries").insert({
        company_id: "00000000-0000-0000-0000-000000000001",
        entry_code: entryCode,
        entry_date: new Date().toISOString().split("T")[0],
        reference: runsheet_code,
        description: "تكلفة البضاعة المحمّلة – الرانشيت " + runsheet_code,
        entry_type: "CostOfGoodsSold",
        status: "Posted",
        created_by: user.email,
        posting_date: new Date().toISOString()
      }).select("id").single()

      if (entryResult.data) {
        await supabase.from("journal_lines").insert([
          {
            entry_id: entryResult.data.id,
            account_id: "51",
            account_name: "تكلفة المبيعات",
            debit: totalLoadedValue,
            credit: 0
          },
          {
            entry_id: entryResult.data.id,
            account_id: "124",
            account_name: "المخزون السلعي",
            debit: 0,
            credit: totalLoadedValue
          }
        ])
        console.log("✅ قيد تكلفة البضاعة المباعة:", entryCode, "بقيمة:", totalLoadedValue)
      }
    }

    // ٦. تحديث حالة الرانشيت
    await supabase.from("runsheets").update({
      status: "Loaded",
      loader_end: new Date().toISOString()
    }).eq("id", rs.id)

    await supabase.from("orders").update({ order_status: "Loaded" }).eq("runsheet_id", rs.id)

    // ============================================================
    // 🆕 P2: آلية Backorder – إنشاء أوردرات تلقائية للكميات المتبقية
    // ============================================================
    if (ordersResult.data && ordersResult.data.length > 0) {
      // جلب جميع أكواد الأوردرات الأصلية مرة واحدة (لتجنب استدعاء Supabase داخل الحلقة)
      var allOrderIds = []
      for (var oi2 = 0; oi2 < ordersResult.data.length; oi2++) {
        allOrderIds.push(ordersResult.data[oi2].id)
      }

      var originalCodesResult = await supabase.from("orders")
        .select("id, order_code")
        .in("id", allOrderIds)

      var originalCodesMap = {}
      if (originalCodesResult.data) {
        for (var oc = 0; oc < originalCodesResult.data.length; oc++) {
          originalCodesMap[originalCodesResult.data[oc].id] = originalCodesResult.data[oc].order_code
        }
      }

      for (var bo = 0; bo < ordersResult.data.length; bo++) {
        var orderIdForBackorder = ordersResult.data[bo].id
        var originalOrderCode = originalCodesMap[orderIdForBackorder] || orderIdForBackorder

        // جلب تفاصيل الأوردر الحالية بعد التحميل
        var orderDetailsForBackorder = await supabase.from("order_details")
          .select("item_code, item_name, unit, unit_price, qty, qty_loaded")
          .eq("order_id", orderIdForBackorder)

        if (orderDetailsForBackorder.error || !orderDetailsForBackorder.data) {
          console.warn("⚠️ فشل جلب تفاصيل الأوردر للـ Backorder:", orderIdForBackorder)
          continue
        }

        var backorderItems = []
        var hasRemaining = false

        for (var bd = 0; bd < orderDetailsForBackorder.data.length; bd++) {
          var detailItem = orderDetailsForBackorder.data[bd]
          var originalQty = Number(detailItem.qty) || 0
          var loadedQtyInDetail = Number(detailItem.qty_loaded) || 0
          var remainingQty = originalQty - loadedQtyInDetail

          if (remainingQty > 0) {
            hasRemaining = true
            backorderItems.push({
              item_code: detailItem.item_code,
              item_name: detailItem.item_name,
              unit: detailItem.unit || "حبة",
              unit_price: Number(detailItem.unit_price) || 0,
              qty: remainingQty
            })
          }
        }

        // إذا كانت هناك كميات متبقية، أنشئ أوردر Backorder جديد
        if (hasRemaining && backorderItems.length > 0) {
          // جلب بيانات العميل من الأوردر الأصلي
          var originalOrderResult = await supabase.from("orders")
            .select("customer_id, customer_name, area, payment_type")
            .eq("id", orderIdForBackorder)
            .maybeSingle()

          if (originalOrderResult.error || !originalOrderResult.data) {
            console.warn("⚠️ فشل جلب بيانات الأوردر الأصلي للـ Backorder:", orderIdForBackorder)
            continue
          }

          var originalOrder = originalOrderResult.data

          // إنشاء كود أوردر جديد للـ Backorder
          var boOrderCode = "BO-" + Date.now() + "-" + Math.floor(Math.random() * 1000)

          // حساب قيمة الأوردر الجديد
          var boTotalAmount = 0
          for (var bi = 0; bi < backorderItems.length; bi++) {
            boTotalAmount += backorderItems[bi].qty * backorderItems[bi].unit_price
          }

          // إضافة رسوم التوصيل والضريبة
          var boDeliveryFee = deliveryFee || 0
          var boBeforeTax = boTotalAmount + boDeliveryFee
          var boTaxAmount = 0
          if (taxRate > 0) {
            boTaxAmount = Math.round(boBeforeTax * taxRate) / 100
          }
          var boGrandTotal = boBeforeTax + boTaxAmount

          // إنشاء الأوردر الجديد
          var boOrderResult = await supabase.from("orders").insert({
            order_code: boOrderCode,
            order_date: new Date().toISOString().split("T")[0],
            customer_id: originalOrder.customer_id,
            customer_name: originalOrder.customer_name,
            area: originalOrder.area,
            total_amount: boGrandTotal,
            original_total_amount: boGrandTotal,
            delivery_fee: boDeliveryFee,
            order_status: "Confirmed",
            payment_type: originalOrder.payment_type || "أجل",
            created_by: user.email,
            source: "backorder",
            notes: "BO من " + runsheet_code + " (أصلي: " + originalOrderCode + ")",
            company_id: "00000000-0000-0000-0000-000000000001"
          }).select("id").single()

          if (boOrderResult.error) {
            console.warn("⚠️ فشل إنشاء أوردر Backorder:", boOrderResult.error.message)
            continue
          }

          // إنشاء تفاصيل الأوردر الجديد
          for (var bj = 0; bj < backorderItems.length; bj++) {
            var boItem = backorderItems[bj]
            var boItemResult = await supabase.from("items")
              .select("id").eq("item_code", boItem.item_code).maybeSingle()

            var boItemId = boItemResult.data ? boItemResult.data.id : null

            await supabase.from("order_details").insert({
              order_id: boOrderResult.data.id,
              item_id: boItemId,
              item_code: boItem.item_code,
              item_name: boItem.item_name,
              unit: boItem.unit,
              unit_price: boItem.unit_price,
              qty: boItem.qty
            })
          }

          console.log("✅ Backorder created:", boOrderCode, "بقيمة:", boGrandTotal, "عدد الأصناف:", backorderItems.length)
        }
      }
    }

    // 🆕 ٧. إعادة تجميع run_sheet_details من order_details – باستخدام fetch اليدوي (إصلاح المادة ٦)
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

    console.log("✅ Loading completed for:", runsheet_code)
    return new Response(JSON.stringify({ success: true, msg: "تم إنهاء التحميل" }), {
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
