// sync-run-sheet-details – إعادة تجميع run_sheet_details من order_details
// هذه هي "الطبقة الوسطى" المفقودة – تبني الرانشيت من الأوردرات تلقائياً

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
    console.log("🔄 sync-run-sheet-details – rawBody:", rawBody)
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var runsheet_id = body.runsheet_id
    if (!runsheet_id) throw new Error("runsheet_id مطلوب")

    console.log("🔄 بدء إعادة تجميع run_sheet_details للرانشيت:", runsheet_id)

    // 1. جلب جميع الأوردرات المرتبطة بهذا الرانشيت
    var ordersResult = await supabase.from("orders")
      .select("id")
      .eq("runsheet_id", runsheet_id)

    if (ordersResult.error) throw new Error("فشل جلب الأوردرات: " + ordersResult.error.message)

    var orderIds = []
    if (ordersResult.data && ordersResult.data.length > 0) {
      for (var o = 0; o < ordersResult.data.length; o++) {
        orderIds.push(ordersResult.data[o].id)
      }
    }

    if (orderIds.length === 0) {
      console.log("⚠️ لا توجد أوردرات مرتبطة بهذا الرانشيت")
      return new Response(JSON.stringify({ success: true, msg: "لا توجد أوردرات" }), {
        headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
      })
    }

    // 2. تجميع الكميات من order_details
    var detailsResult = await supabase.from("order_details")
      .select("item_code, item_name, unit, unit_price, qty, qty_picked, qty_loaded, qty_delivered, qty_refused, qty_returned, driver_liability")
      .in("order_id", orderIds)

    if (detailsResult.error) throw new Error("فشل جلب order_details: " + detailsResult.error.message)

    var details = detailsResult.data || []
    console.log("📊 عدد صفوف order_details:", details.length)

    // 3. تجميع البيانات لكل صنف
    var aggMap = {}
    for (var i = 0; i < details.length; i++) {
      var d = details[i]
      var code = d.item_code
      if (!code) continue

      if (!aggMap[code]) {
        aggMap[code] = {
          item_code: code,
          item_name: d.item_name || code,
          unit: d.unit || "حبة",
          unit_price: Number(d.unit_price) || 0,
          qty_ordered: 0,
          qty_picked: 0,
          qty_loaded: 0,
          qty_delivered: 0,
          qty_refused: 0,
          qty_returned: 0,
          driver_liability: 0
        }
      }

      aggMap[code].qty_ordered += Number(d.qty) || 0
      aggMap[code].qty_picked += Number(d.qty_picked) || 0
      aggMap[code].qty_loaded += Number(d.qty_loaded) || 0
      aggMap[code].qty_delivered += Number(d.qty_delivered) || 0
      aggMap[code].qty_refused += Number(d.qty_refused) || 0
      aggMap[code].qty_returned += Number(d.qty_returned) || 0
      aggMap[code].driver_liability += Number(d.driver_liability) || 0
    }

    console.log("📊 عدد الأصناف المجمعة:", Object.keys(aggMap).length)

    // 4. جلب الصفوف الحالية من run_sheet_details
    var existingResult = await supabase.from("run_sheet_details")
      .select("id, item_code")
      .eq("runsheet_id", runsheet_id)

    var existingMap = {}
    if (existingResult.data) {
      for (var e = 0; e < existingResult.data.length; e++) {
        existingMap[existingResult.data[e].item_code] = existingResult.data[e].id
      }
    }

    // 5. تحديث أو إدراج كل صنف
    var updatedCount = 0
    var insertedCount = 0

    for (var code in aggMap) {
      if (aggMap.hasOwnProperty(code)) {
        var item = aggMap[code]
        var updateData = {
          item_code: item.item_code,
          item_name: item.item_name,
          unit: item.unit,
          unit_price: item.unit_price,
          qty_ordered: item.qty_ordered,
          qty_picked: item.qty_picked,
          qty_loaded: item.qty_loaded,
          qty_delivered: item.qty_delivered,
          qty_refused: item.qty_refused,
          qty_returned: item.qty_returned,
          driver_liability: item.driver_liability
        }

        if (existingMap[code]) {
          // تحديث الصف الموجود
          var updateResult = await supabase.from("run_sheet_details")
            .update(updateData)
            .eq("id", existingMap[code])

          if (updateResult.error) {
            console.error("❌ فشل تحديث:", code, updateResult.error.message)
          } else {
            updatedCount++
          }
        } else {
          // إدراج صف جديد
          updateData.runsheet_id = runsheet_id

          // جلب item_id من items
          var itemResult = await supabase.from("items")
            .select("id").eq("item_code", code).maybeSingle()
          if (itemResult.data) {
            updateData.item_id = itemResult.data.id
          }

          var insertResult = await supabase.from("run_sheet_details")
            .insert(updateData)

          if (insertResult.error) {
            console.error("❌ فشل إدراج:", code, insertResult.error.message)
          } else {
            insertedCount++
          }
        }
      }
    }

    console.log("✅ تحديث:", updatedCount, "إدراج:", insertedCount)

    return new Response(JSON.stringify({
      success: true,
      msg: "تمت إعادة التجميع",
      updated: updatedCount,
      inserted: insertedCount,
      total_items: Object.keys(aggMap).length
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
