// complete-picking – إنهاء التحضير وحجز المخزون
// الإصدار 3.1 – إصلاح: استبدال supabase.functions.invoke بـ fetch اليدوي (المادة 1)

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
if (!rawBody) {
  throw new Error("Body فارغ")
}
    console.log("📥 complete-picking")
    var body = Object.create(null)
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var runsheet_code = body.runsheet_code
    var items = body.items
    if (
  !runsheet_code ||
  !Array.isArray(items) ||
  items.length === 0
)
throw new Error("البيانات غير مكتملة")

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

// تحميل جميع item_id مرة واحدة
var itemCodes = new Array()
for (var i = 0; i < items.length; i++) {
  itemCodes.push(items[i].itemCode)
}

var itemsLookup = await supabase
  .from("items")
  .select("id,item_code")
  .in("item_code", itemCodes)

if (!itemsLookup.data) throw new Error("فشل تحميل الأصناف")

if (itemsLookup.error) throw itemsLookup.error

var itemMap = Object.create(null)
for (var i = 0; i < itemsLookup.data.length; i++) {
  itemMap[itemsLookup.data[i].item_code] = itemsLookup.data[i].id
}

    // جلب الرانشيت
    var rsResult = await supabase.from("runsheets")
      .select("id, status").eq("runsheet_code", runsheet_code).maybeSingle()
    if (rsResult.error || !rsResult.data) throw new Error("الرانشيت غير موجود")
var rs = rsResult.data

if (rs.status !== "Picking") {
  throw new Error("الرانشيت ليس قيد التحضير")
}

// Lock منطقي
var lockResult = await supabase
  .from("runsheets")
  .update({
    status: "PickingProcessing"
  })
  .eq("id", rs.id)
  .eq("status", "Picking")
  .select()

if (lockResult.error) throw lockResult.error

if (!lockResult.data || lockResult.data.length === 0) {
  throw new Error("تمت معالجة الرانشيت بواسطة مستخدم آخر")
}

// ١. تسجيل حركة التحضير فقط (run_sheet_details يتم بناؤه من order_details)
for (var i = 0; i < items.length; i++) {
  var item = items[i]
  var pickedQty = Number(item.pickedQty) || 0
  if (pickedQty <= 0) continue

  var itemId = itemMap[item.itemCode]

if (!itemId) {
  throw new Error("الصنف غير موجود: " + item.itemCode)
}

  var logCode =
  "PCK-" +
  crypto.randomUUID()

var logResult = await supabase
  .from("inventory_log")
  .insert({
    company_id: "00000000-0000-0000-0000-000000000001",
    log_code: logCode,
    movement_date: new Date().toISOString().split("T")[0],
    voucher_id: runsheet_code,
    item_id: itemId,
    item_code: item.itemCode,
    item_name: item.itemName ?? "",
    movement_type: "Picking",
    qty: pickedQty,
    reference: runsheet_code,
    user_email: user.email
  })

if (logResult.error) {
  throw new Error("فشل تسجيل حركة المخزون: " + logResult.error.message)
}
}

    // ٢. حجز المخزون (allocated_qty)
    for (var j = 0; j < items.length; j++) {

      var itm = items[j]
      var pickedQty2 = Number(itm.pickedQty) || 0
      if (pickedQty2 <= 0) continue

      var itemId = itemMap[itm.itemCode]
      if (!itemId) throw new Error("الصنف غير موجود: " + itm.itemCode)
var stockResult = await supabase
  .rpc("reserve_stock", {
    p_branch_id: mainBranchId,
    p_item_id: itemId,
    p_qty: pickedQty2
  })

if (stockResult.error) {
  throw new Error(
    "فشل حجز المخزون لـ " +
    itm.itemCode +
    ": " +
    stockResult.error.message
  )
}

if (stockResult.data !== true) {
  throw new Error("reserve_stock لم تؤكد نجاح العملية")
}
}

    // ٣. تحديث reason_picking في order_details عند وجود نقص

    var ordersResult = await supabase.from("orders")
      .select("id")
      .eq("runsheet_id", rs.id)

if (ordersResult.error) throw ordersResult.error

    if (ordersResult.data && ordersResult.data.length > 0) {
      var orderIds = new Array()
      for (var o = 0; o < ordersResult.data.length; o++) {
        orderIds.push(ordersResult.data[o].id)
      }

      for (var m = 0; m < items.length; m++) {
        var pickedItem = items[m]
        var pickedQty3 = Number(pickedItem.pickedQty) || 0
        if (pickedQty3 <= 0) continue

        var odResult = await supabase.from("order_details")
          .select("id, qty, qty_picked")
          .in("order_id", orderIds)
          .eq("item_code", pickedItem.itemCode)

if (odResult.error) throw odResult.error

        if (odResult.data && odResult.data.length > 0) {
var updates = new Array()

for (var n = 0; n < odResult.data.length; n++) {

  var odItem = odResult.data[n]

  var orderedQty = Number(odItem.qty) || 0

  var reasonPicking = null

  if (pickedQty3 < orderedQty) {
    reasonPicking = pickedItem.notes || "نقص في التحضير"
  }

  updates.push({
    id: odItem.id,
    qty_picked: pickedQty3,
    reason_picking: reasonPicking
  })
}

for (var u = 0; u < updates.length; u++) {

    var updateResult = await supabase
  .from("order_details")
  .update({
      qty_picked: updates[u].qty_picked,
      reason_picking: updates[u].reason_picking
    })
    .eq("id", updates[u].id)
if (updateResult.error) {
  throw new Error(updateResult.error.message)
}

}
        }
      }
    }

    // ٤. تحديث حالة الرانشيت
var rsError = await supabase
  .from("runsheets")
  .update({
    status: "Picked",
    picker_end: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .eq("id", rs.id)
  .eq("status", "PickingProcessing")

    if (rsError.error) throw new Error("فشل تحديث حالة الرانشيت: " + rsError.error.message)

// ٥. لا حاجة لاستدعاء sync-run-sheet-details.
// سيتم تحديث run_sheet_details بواسطة Trigger قاعدة البيانات.

    console.log(
  "✅ Picking completed",
  {
    runsheet_code: runsheet_code,
    items: items.length,
    user: user.email
  }
)
    return new Response(JSON.stringify({ success: true, msg: "تم إنهاء التحضير" }), {
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
