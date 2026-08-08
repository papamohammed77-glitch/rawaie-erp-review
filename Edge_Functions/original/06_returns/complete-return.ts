// complete-return – إنهاء المرتجعات وإعادة المخزون
// الإصدار 7.2 – كامل مُصحح مع تحديث قيمة الفاتورة بعد المرتجع الجزئي
// 
// المسار ١: runsheet_code + items ← مرتجع رانشيت (Runsheet Return)
// المسار ٢: order_code + is_pos_return: true + items ← مرتجع POS مباشر (Direct POS Return)

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
    console.log("📥 complete-return v7.2 – rawBody:", rawBody)
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var runsheet_code = body.runsheet_code
    var order_code = body.order_code
    var items = body.items
    var is_pos_return = body.is_pos_return === true

    if ((!runsheet_code && !order_code) || !items || !items.length) {
      throw new Error("البيانات غير مكتملة – يجب توفير runsheet_code أو order_code مع items")
    }
    console.log("📋 runsheet_code:", runsheet_code, "| order_code:", order_code, "| items:", items.length, "| pos:", is_pos_return)

    // مصادقة
    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح – Authorization header مطلوب")
    var token = authHeader.replace("Bearer ", "")
    var authResult = await supabase.auth.getUser(token)
    if (authResult.error || !authResult.data.user) throw new Error("جلسة غير صالحة – فشل التحقق من المستخدم")
    var user = authResult.data.user
    console.log("👤 User:", user.email)

    // جلب main_branch_id من الإعدادات
    var settingsResult = await supabase.from("app_settings")
      .select("main_branch_id").limit(1).maybeSingle()
    if (!settingsResult.data || !settingsResult.data.main_branch_id) {
      throw new Error("الفرع الرئيسي غير محدد في الإعدادات")
    }
    var mainBranchId = settingsResult.data.main_branch_id
    console.log("🏭 mainBranchId:", mainBranchId)

    var rs = null
    var order = null

    // جلب الرانشيت إذا كان موجوداً
    if (runsheet_code) {
      var rsResult = await supabase.from("runsheets")
        .select("id, status, driver_id")
        .eq("runsheet_code", runsheet_code)
        .maybeSingle()
      if (rsResult.error || !rsResult.data) throw new Error("الرانشيت غير موجود: " + runsheet_code)
      rs = rsResult.data
      if (rs.status !== "Returning") throw new Error("الرانشيت ليس قيد المرتجعات – حالته: " + rs.status)
      console.log("📄 Runsheet ID:", rs.id)
    }

    // جلب الأوردر إذا كان موجوداً
    if (order_code) {
      var orderResult = await supabase.from("orders")
        .select("id, order_status, customer_id, customer_name, runsheet_id")
        .eq("order_code", order_code)
        .maybeSingle()
      if (orderResult.error || !orderResult.data) throw new Error("الأوردر غير موجود: " + order_code)
      order = orderResult.data
      if (order.order_status === "Cancelled") {
        throw new Error("لا يمكن عمل مرتجع على فاتورة ملغاة")
      }
      console.log("📄 Order ID:", order.id, "| Customer:", order.customer_name, "| Status:", order.order_status)
    }

    var totalReturnedValue = 0
    var updatedCount = 0
    var skippedCount = 0
    var newOrderStatus = null

    // معالجة كل صنف
    for (var i = 0; i < items.length; i++) {
      var item = items[i]
      var returnedQty = Number(item.returnedQty) || 0
      var reason = item.reason || ""
      var returnCondition = item.return_condition || "good"
      var itemCode = (item.item_code || "").trim()

      if (returnedQty <= 0) {
        console.log("⏭️ تخطي – returnedQty = 0:", itemCode)
        skippedCount++
        continue
      }

      console.log("🔍 Processing item:", itemCode, "| Qty:", returnedQty, "| Condition:", returnCondition)

      // جلب item_id من items
      var itemResult = await supabase.from("items")
        .select("id")
        .eq("item_code", itemCode)
        .maybeSingle()

      var itemId = null
      if (itemResult.data) {
        itemId = itemResult.data.id
        console.log("📦 Item ID found:", itemId)
      } else {
        console.warn("⚠️ صنف غير موجود في جدول items:", itemCode)
        skippedCount++
        continue
      }

      // ========== مسار الرانشيت (Runsheet Return) ==========
      if (rs) {
        var detailResult = await supabase.from("run_sheet_details")
          .select("qty_loaded, qty_delivered, unit_price")
          .eq("runsheet_id", rs.id)
          .eq("item_code", itemCode)
          .maybeSingle()

        var loadedQty = 0
        var deliveredQty = 0
        var unitPrice = 0
        var expectedReturn = 0
        var shortage = 0
        var shortageValue = 0
        var liabilityAmount = 0

        if (detailResult.data) {
          loadedQty = Number(detailResult.data.qty_loaded) || 0
          deliveredQty = Number(detailResult.data.qty_delivered) || 0
          unitPrice = Number(detailResult.data.unit_price) || 0
          expectedReturn = Math.max(0, loadedQty - deliveredQty)
          shortage = Math.max(0, expectedReturn - returnedQty)
          shortageValue = shortage * unitPrice

          if (returnCondition === "missing" || returnCondition === "damaged") {
            liabilityAmount = shortageValue
          }

          await supabase.from("run_sheet_details").update({
            qty_returned: returnedQty,
            driver_liability: liabilityAmount
          }).eq("runsheet_id", rs.id).eq("item_code", itemCode)

          console.log("✅ run_sheet_details updated for:", itemCode)
        } else {
          console.warn("⚠️ لم يتم العثور على run_sheet_details للصنف:", itemCode)
        }

        totalReturnedValue += returnedQty * unitPrice

        // تحديث order_details
        var ordersResult = await supabase.from("orders")
          .select("id")
          .eq("runsheet_id", rs.id)

        if (ordersResult.data && ordersResult.data.length > 0) {
          var orderIds = []
          for (var o = 0; o < ordersResult.data.length; o++) {
            orderIds.push(ordersResult.data[o].id)
          }

          var odResult = await supabase.from("order_details")
            .select("id, qty_loaded, qty_delivered, unit_price")
            .in("order_id", orderIds)
            .eq("item_code", itemCode)

          if (odResult.data && odResult.data.length > 0) {
            for (var d = 0; d < odResult.data.length; d++) {
              var odItem = odResult.data[d]
              var odLoaded = Number(odItem.qty_loaded) || 0
              var odDelivered = Number(odItem.qty_delivered) || 0
              var odUnitPrice = Number(odItem.unit_price) || 0
              var odExpectedReturn = Math.max(0, odLoaded - odDelivered)
              var odShortage = Math.max(0, odExpectedReturn - returnedQty)
              var odLiability = 0

              if (returnCondition === "missing" || returnCondition === "damaged") {
                odLiability = odShortage * odUnitPrice
              }

              await supabase.from("order_details").update({
                qty_returned: returnedQty,
                reason_return: reason || null,
                driver_liability: odLiability
              }).eq("id", odItem.id)

              console.log("✅ order_details updated for:", itemCode, "| ID:", odItem.id)
              updatedCount++
            }
          }
        }

        // إنشاء سجل driver_liabilities عند وجود عجز
        if (shortage > 0 && rs.driver_id) {
          await supabase.from("driver_liabilities").insert({
            company_id: "00000000-0000-0000-0000-000000000001",
            driver_id: rs.driver_id,
            runsheet_id: rs.id,
            item_code: itemCode,
            item_name: item.item_name || itemCode,
            qty_missing: shortage,
            unit_price: unitPrice,
            amount: shortageValue,
            reason: reason || "عجز غير مبرر",
            status: "pending"
          })
          console.log("✅ driver_liabilities created for:", itemCode, "| Shortage:", shortage)
        }

        // إعادة المخزون (للمرتجعات السليمة فقط)
        if (returnCondition === "good" && returnedQty > 0) {
          var stockResultRS = await supabase.from("stock_branches")
            .select("qty")
            .eq("branch_id", mainBranchId)
            .eq("item_id", itemId)
            .maybeSingle()

          var currentQtyRS = stockResultRS.data ? (Number(stockResultRS.data.qty) || 0) : 0
          var newQtyRS = currentQtyRS + returnedQty

          await supabase.from("stock_branches")
            .update({ qty: newQtyRS })
            .eq("branch_id", mainBranchId)
            .eq("item_id", itemId)

          console.log("✅ Stock updated for (RS):", itemCode, "| New Qty:", newQtyRS)
        }
      }

      // ========== مسار POS المباشر (order && !rs) ==========
      if (order && !rs) {
        var unitPricePOS = Number(item.unit_price) || 0
        totalReturnedValue += returnedQty * unitPricePOS

        var odDetailResultPOS = await supabase.from("order_details")
          .select("id, qty, unit_price, qty_returned")
          .eq("order_id", order.id)
          .eq("item_code", itemCode)
          .maybeSingle()

        if (odDetailResultPOS.data) {
          var odIdPOS = odDetailResultPOS.data.id
          var existingReturnedPOS = Number(odDetailResultPOS.data.qty_returned) || 0
          var newReturnedPOS = existingReturnedPOS + returnedQty
          var maxQtyPOS = Number(odDetailResultPOS.data.qty) || 0

          if (newReturnedPOS > maxQtyPOS) {
            console.warn("⚠️ الكمية المرتجعة تتجاوز الكمية الأصلية:", itemCode, "| new:", newReturnedPOS, "| max:", maxQtyPOS)
            newReturnedPOS = maxQtyPOS
          }

          var updateDataPOS = {
            qty_returned: newReturnedPOS,
            reason_return: reason || "مرتجع من نقطة البيع",
            driver_liability: 0
          }

          console.log("📝 Updating order_details ID:", odIdPOS, "| data:", JSON.stringify(updateDataPOS))

          await supabase.from("order_details")
            .update(updateDataPOS)
            .eq("id", odIdPOS)

          console.log("✅ order_details updated for:", itemCode, "| qty_returned:", newReturnedPOS)
          updatedCount++
        } else {
          console.warn("⚠️ لم يتم العثور على order_detail للصنف:", itemCode, "في الأوردر:", order_code)
        }

        // إعادة المخزون (للمرتجعات السليمة فقط)
        if (returnCondition === "good" && returnedQty > 0 && itemId) {
          var stockResultPOS = await supabase.from("stock_branches")
            .select("qty, allocated_qty")
            .eq("branch_id", mainBranchId)
            .eq("item_id", itemId)
            .maybeSingle()

          var currentQtyPOS = stockResultPOS.data ? (Number(stockResultPOS.data.qty) || 0) : 0
          var currentAllocatedPOS = stockResultPOS.data ? (Number(stockResultPOS.data.allocated_qty) || 0) : 0

          if (currentAllocatedPOS > 0) {
            var releaseQty = Math.min(currentAllocatedPOS, returnedQty)
            await supabase.from("stock_branches")
              .update({ allocated_qty: currentAllocatedPOS - releaseQty })
              .eq("branch_id", mainBranchId)
              .eq("item_id", itemId)
            console.log("🔓 Released allocated_qty for:", itemCode, "| Released:", releaseQty)
          }

          var newQtyPOS = currentQtyPOS + returnedQty

          await supabase.from("stock_branches")
            .update({ qty: newQtyPOS })
            .eq("branch_id", mainBranchId)
            .eq("item_id", itemId)

          console.log("✅ Stock updated for (POS):", itemCode, "| New Qty:", newQtyPOS)
        }
      }

      // كتابة inventory_log
      var logCode = "RTN-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
      await supabase.from("inventory_log").insert({
        company_id: "00000000-0000-0000-0000-000000000001",
        log_code: logCode,
        movement_date: new Date().toISOString().split("T")[0],
        voucher_id: runsheet_code || order_code || "POS-RETURN",
        item_id: itemId,
        item_code: itemCode,
        item_name: item.item_name || itemCode,
        movement_type: "Return",
        qty: returnedQty,
        reference: runsheet_code || order_code || "POS",
        user_email: user.email
      })

      console.log("✅ inventory_log created for:", itemCode)
    }

    console.log("📊 Summary – Total value:", totalReturnedValue, "| Updated:", updatedCount, "| Skipped:", skippedCount)

    // إنشاء قيد محاسبي (إشعار دائن)
    if (totalReturnedValue > 0) {
      var entryCode = "JE-RTN-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
      var entryResult = await supabase.from("journal_entries").insert({
        company_id: "00000000-0000-0000-0000-000000000001",
        entry_code: entryCode,
        entry_date: new Date().toISOString().split("T")[0],
        reference: runsheet_code || order_code || "POS",
        description: "مرتجعات – " + (runsheet_code || order_code || "POS"),
        entry_type: "SalesReturn",
        status: "Posted",
        created_by: user.email,
        posting_date: new Date().toISOString()
      }).select("id").single()

      if (entryResult.data) {
        await supabase.from("journal_lines").insert([
          { entry_id: entryResult.data.id, account_id: "124", account_name: "المخزون السلعي", debit: totalReturnedValue, credit: 0 },
          { entry_id: entryResult.data.id, account_id: "51", account_name: "تكلفة المبيعات", debit: 0, credit: totalReturnedValue }
        ])
        console.log("✅ قيد المرتجعات:", entryCode, "| Value:", totalReturnedValue)
      }
    }

    // إضافة سجل customer_ledger (دائن للعميل بقيمة المرتجع)
    if (order && totalReturnedValue > 0 && order.customer_id) {
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
        reference: order_code,
        description: "مرتجع – " + order_code,
        debit: 0,
        credit: totalReturnedValue,
        balance: newBalance,
        due_date: new Date().toISOString().split("T")[0],
        user_email: user.email
      })

      console.log("✅ customer_ledger credit:", order.customer_name, "| credit:", totalReturnedValue, "| balance:", newBalance)
    }

    // ✅ تحديد حالة الأوردر الجديدة لمسار POS
    if (order && !rs) {
      var currentDetails = await supabase.from("order_details")
        .select("qty, qty_returned")
        .eq("order_id", order.id)
      
      var totalOriginal = 0
      var totalReturned = 0
      if (currentDetails.data) {
        for (var j = 0; j < currentDetails.data.length; j++) {
          var det = currentDetails.data[j]
          totalOriginal += Number(det.qty) || 0
          totalReturned += Number(det.qty_returned) || 0
        }
      }
      
      if (totalOriginal > 0 && totalReturned >= totalOriginal) {
        newOrderStatus = "Returned"
      } else {
        newOrderStatus = "Partially Returned"
      }

      var orderUpdateResult = await supabase.from("orders").update({
        order_status: newOrderStatus
      }).eq("id", order.id)

      if (orderUpdateResult.error) {
        console.error("❌ فشل تحديث حالة الأوردر:", orderUpdateResult.error.message)
      } else {
        console.log("✅ Order status updated to:", newOrderStatus, "| Order:", order_code)
      }

      // ✅ تحديث total_amount بعد المرتجع الجزئي
      var remainingDetails = await supabase.from("order_details")
        .select("qty, qty_returned, unit_price")
        .eq("order_id", order.id)
      
      var newTotal = 0
      if (remainingDetails.data) {
        for (var k = 0; k < remainingDetails.data.length; k++) {
          var rd = remainingDetails.data[k]
          var remainingQty = Math.max(0, (Number(rd.qty) || 0) - (Number(rd.qty_returned) || 0))
          newTotal += remainingQty * (Number(rd.unit_price) || 0)
        }
      }
      
      var totalUpdateResult = await supabase.from("orders").update({ total_amount: newTotal }).eq("id", order.id)
      if (totalUpdateResult.error) {
        console.error("❌ فشل تحديث total_amount:", totalUpdateResult.error.message)
      } else {
        console.log("✅ Order total_amount updated to:", newTotal, "| Order:", order_code)
      }
    }

    // تحديث حالة الرانشيت
    if (rs) {
      await supabase.from("runsheets").update({
        status: "Returned",
        return_end: new Date().toISOString()
      }).eq("id", rs.id)

      console.log("✅ Runsheet status updated to Returned:", rs.id)

      // استدعاء sync-run-sheet-details
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
    }

    console.log("✅ Return completed for:", runsheet_code || order_code, "| Updated:", updatedCount, "| Skipped:", skippedCount)
    return new Response(JSON.stringify({
      success: true,
      msg: "تم إنهاء المرتجعات بنجاح",
      updated_count: updatedCount,
      skipped_count: skippedCount,
      total_returned_value: totalReturnedValue,
      new_order_status: newOrderStatus
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
