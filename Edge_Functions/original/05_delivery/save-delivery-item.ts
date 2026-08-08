// save-delivery-item – حفظ كميات التسليم لكل أوردر (حفظ فوري)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    var rawBody = await req.text()
    console.log("📥 Raw body:", rawBody)
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var runsheet_code = body.runsheet_code
    var order_code = body.order_code
    var items = body.items
    if (!runsheet_code || !order_code || !items || !items.length) throw new Error("البيانات غير مكتملة")

    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error("جلسة غير صالحة")

    var { data: pubUser } = await supabase.from("users").select("id").eq("email", user.email).maybeSingle()
    if (!pubUser) throw new Error("المستخدم غير موجود في سجلات الموظفين")

    var { data: rs, error: rsError } = await supabase.from("runsheets")
      .select("id, status, driver_id")
      .eq("runsheet_code", runsheet_code)
      .maybeSingle()
    if (rsError || !rs) throw new Error("الرانشيت غير موجود")
    if (rs.status !== "Delivering") throw new Error("الرانشيت ليس قيد التوصيل")
    if (rs.driver_id !== pubUser.id) throw new Error("هذا الرانشيت لا يخصك")

    var { data: order, error: orderError } = await supabase.from("orders")
      .select("id, order_status, runsheet_id")
      .eq("order_code", order_code)
      .maybeSingle()
    if (orderError || !order) throw new Error("الأوردر غير موجود")
    if (order.runsheet_id !== rs.id) throw new Error("الأوردر غير مرتبط بهذا الرانشيت")

    // تحديث كل صنف
    for (var i = 0; i < items.length; i++) {
      var item = items[i]
      var deliveredQty = Number(item.deliveredQty) || 0
      var reason = item.reason || ""
      
      var { data: odDetail, error: odError } = await supabase.from("order_details")
        .select("qty_loaded")
        .eq("order_id", order.id)
        .eq("item_code", item.itemCode)
        .maybeSingle()
      
      if (odError || !odDetail) throw new Error("تفاصيل الأوردر غير موجودة للصنف " + item.itemCode)
      
      var loadedQty = Number(odDetail.qty_loaded) || 0
      if (deliveredQty > loadedQty) throw new Error("الكمية المسلّمة أكبر من المحملة للصنف " + item.itemCode)
      
      var refusedQty = Math.max(0, loadedQty - deliveredQty)
      
      await supabase.from("order_details").update({
        qty_delivered: deliveredQty,
        qty_refused: refusedQty,
        notes: reason || null
      }).eq("order_id", order.id).eq("item_code", item.itemCode)
    }

    // ✅ تجميع الكميات المسلّمة – جلب orderIds أولاً
    var { data: ordersData } = await supabase.from("orders")
      .select("id").eq("runsheet_id", rs.id)
    var orderIds = (ordersData || []).map(function(o) { return o.id })

    var { data: allOrderDetails, error: allError } = await supabase.from("order_details")
      .select("item_code, qty_delivered")
      .in("order_id", orderIds)

    if (!allError && allOrderDetails) {
      var agg = {}
      for (var j = 0; j < allOrderDetails.length; j++) {
        var d = allOrderDetails[j]
        agg[d.item_code] = (agg[d.item_code] || 0) + (Number(d.qty_delivered) || 0)
      }
      for (var code in agg) {
        if (agg.hasOwnProperty(code)) {
          await supabase.from("run_sheet_details").update({
            qty_delivered: agg[code]
          }).eq("runsheet_id", rs.id).eq("item_code", code)
        }
      }
    }

    // التحقق مما إذا كانت كل أصناف الأوردر قد سُلّمت بالكامل
    var { data: currentDetails } = await supabase.from("order_details")
      .select("qty_loaded, qty_delivered")
      .eq("order_id", order.id)
    if (currentDetails) {
      var allDelivered = true
      for (var k = 0; k < currentDetails.length; k++) {
        var det = currentDetails[k]
        if ((Number(det.qty_delivered) || 0) < (Number(det.qty_loaded) || 0)) {
          allDelivered = false
          break
        }
      }
      if (allDelivered) {
        await supabase.from("orders").update({ order_status: "Delivered" }).eq("id", order.id)
      }
    }

    return new Response(JSON.stringify({ success: true, msg: "تم حفظ كميات التسليم" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("❌ Error:", error.message)
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
