// save-daily-settlement – تسوية اليومية وإغلاق العجز على السائق
// الإصدار 1.0 – تستخدم runsheet_code (وليس runsheet_id)

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
    console.log("📥 save-daily-settlement – rawBody:", rawBody)
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var runsheet_code = body.runsheet_code
    var notes = body.notes || ""
    if (!runsheet_code) throw new Error("رقم الرانشيت مطلوب")

    // مصادقة
    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var authResult = await supabase.auth.getUser(token)
    if (authResult.error || !authResult.data.user) throw new Error("جلسة غير صالحة")
    var user = authResult.data.user

    // ١. جلب الرانشيت
    var rsResult = await supabase.from("runsheets")
      .select("id, runsheet_code, status, driver_id, vehicle_id")
      .eq("runsheet_code", runsheet_code)
      .maybeSingle()
    if (rsResult.error || !rsResult.data) throw new Error("الرانشيت غير موجود")
    var rs = rsResult.data
var existingSettlement = await supabase
  .from("daily_settlements")
  .select("id")
  .eq("runsheet_id", rs.id)
  .maybeSingle()

if (existingSettlement.error) {
  throw new Error(
    "فشل التحقق من وجود تسوية سابقة: " +
    existingSettlement.error.message
  )
}

if (existingSettlement.data) {
  throw new Error("تمت تسوية هذا الرانشيت مسبقاً")
}

    // يجب أن يكون الرانشيت في حالة Delivered أو Returned
    if (rs.status !== "Delivered" && rs.status !== "Returned") {
      throw new Error("لا يمكن تسوية رانشيت في حالة: " + rs.status)
    }

    // ٢. جلب تفاصيل الرانشيت
    var detailsResult = await supabase.from("run_sheet_details")
      .select("item_code, item_name, unit, qty_loaded, qty_delivered, qty_returned, unit_price, driver_liability")
      .eq("runsheet_id", rs.id)

    if (detailsResult.error) throw new Error("فشل جلب تفاصيل الرانشيت")
    var details = detailsResult.data || []

    // ٣. حساب إجمالي العجز
    var totalShortage = 0
    var totalShortageValue = 0
    var settlementItems = []

    for (var i = 0; i < details.length; i++) {
      var d = details[i]
      var loaded = Number(d.qty_loaded) || 0
      var delivered = Number(d.qty_delivered) || 0
      var returned = Number(d.qty_returned) || 0
      var unitPrice = Number(d.unit_price) || 0
      var shortage = Math.max(0, loaded - delivered - returned)
      var shortageValue = shortage * unitPrice

      if (shortage > 0) {
        totalShortage += shortage
        totalShortageValue += shortageValue
        settlementItems.push({
          item_code: d.item_code,
          item_name: d.item_name,
          unit: d.unit,
          loaded: loaded,
          delivered: delivered,
          returned: returned,
          shortage: shortage,
          unit_price: unitPrice,
          shortage_value: shortageValue
        })
      }
    }

    console.log("📊 إجمالي العجز:", totalShortage, "قطعة، بقيمة:", totalShortageValue)

    // ٤. توليد كود التسوية
    var todayStr = new Date().toISOString().split("T")[0]
var settlementCode =
  "SET-" +
  Date.now() +
  "-" +
  Math.floor(Math.random() * 100000)

    // ٥. إنشاء سجل التسوية
    var settlementResult = await supabase.from("daily_settlements").insert({
      company_id: "00000000-0000-0000-0000-000000000001",
      settlement_code: settlementCode,
      settlement_date: todayStr,
      runsheet_id: rs.id,
      driver_id: rs.driver_id,
      vehicle_id: rs.vehicle_id,
      total_shortage: totalShortage,
      total_shortage_value: totalShortageValue,
      status: "Completed",
      notes: notes || ("تسوية تلقائية للرانشيت " + runsheet_code),
      created_by: user.email
    }).select("id").single()

    if (settlementResult.error) throw new Error("فشل إنشاء التسوية: " + settlementResult.error.message)
    var settlementId = settlementResult.data.id
    console.log("✅ تم إنشاء التسوية:", settlementCode)

    // ٦. تحديث driver_liabilities من pending إلى settled
    var updateLiabilitiesResult = await supabase.from("driver_liabilities")
      .update({
        status: "settled",
        settlement_id: settlementId
      })
      .eq("runsheet_id", rs.id)
      .eq("status", "pending")

    if (updateLiabilitiesResult.error) {
      console.warn("⚠️ فشل تحديث driver_liabilities:", updateLiabilitiesResult.error.message)
    } else {
      console.log("✅ تم تحديث driver_liabilities")
    }

    // ٧. إنشاء قيد محاسبي للتسوية (إذا كان هناك عجز)
    if (totalShortageValue > 0 && rs.driver_id) {
      var entryCode = "JE-SET-" + Date.now() + "-" + Math.floor(Math.random() * 1000)

      // جلب اسم السائق
      var driverResult = await supabase.from("users")
        .select("name, email")
        .eq("id", rs.driver_id)
        .maybeSingle()
      var driverName = driverResult.data ? (driverResult.data.name || driverResult.data.email) : rs.driver_id

var entryResult = await supabase.from("journal_entries").insert({
  company_id: "00000000-0000-0000-0000-000000000001",
  entry_code: entryCode,
  entry_date: todayStr,
  reference: settlementCode,
  description: "تسوية عجز السائق – الرانشيت " + runsheet_code,
  entry_type: "Settlement",
  status: "Posted",
  created_by: user.email,
  posting_date: new Date().toISOString()
}).select("id").single()

if (entryResult.error) {
  throw new Error("فشل إنشاء القيد المحاسبي: " + entryResult.error.message)
}

if (entryResult.data) {
        var linesResult = await supabase.from("journal_lines").insert([
          {
            entry_id: entryResult.data.id,
            account_id: rs.driver_id,
            account_name: driverName,
            debit: totalShortageValue,
            credit: 0,
            notes: "عجز الرانشيت " + runsheet_code
          },
          {
            entry_id: entryResult.data.id,
            account_id: "51",
            account_name: "تكلفة المبيعات",
            debit: 0,
            credit: totalShortageValue,
            notes: "تسوية عجز " + runsheet_code
          }
        ])

if (linesResult.error) {
  console.error("❌ فشل إدراج journal_lines:", linesResult.error.message)
} else {
  console.log("✅ قيد التسوية:", entryCode, "بقيمة:", totalShortageValue)
}
      }
    }

// ٨. إغلاق الرانشيت بعد نجاح التسوية
var closeResult = await supabase
  .from("runsheets")
  .update({
    status: "Closed"
  })
  .eq("id", rs.id)

if (closeResult.error) {
  console.error(
    "❌ فشل إغلاق الرانشيت:",
    closeResult.error.message
  )

  return new Response(
    JSON.stringify({
      success: true,
      warning:
        "تم إنشاء التسوية ولكن فشل إغلاق الرانشيت",
      settlement_code: settlementCode,
      total_shortage: totalShortage,
      total_shortage_value: totalShortageValue,
      items: settlementItems
    }),
    {
      headers: Object.assign(
        {},
        corsHeaders,
        { "Content-Type": "application/json" }
      )
    }
  )
}
    console.log("✅ Settlement completed for:", runsheet_code)
    return new Response(JSON.stringify({
      success: true,
      msg: "تم إنشاء التسوية بنجاح",
      settlement_code: settlementCode,
      total_shortage: totalShortage,
      total_shortage_value: totalShortageValue,
      items: settlementItems
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
