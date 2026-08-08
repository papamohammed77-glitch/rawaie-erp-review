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
    console.log("📥 confirm-order – rawBody:", rawBody)
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var order_code = body.order_code
    if (!order_code) throw new Error("رقم الأوردر مطلوب")

    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var authResult = await supabase.auth.getUser(token)
    if (authResult.error || !authResult.data.user) throw new Error("جلسة غير صالحة")
    var user = authResult.data.user

    var orderResult = await supabase
      .from("orders")
      .select("order_status, runsheet_id")
      .eq("order_code", order_code)
      .maybeSingle()
    if (orderResult.error || !orderResult.data) throw new Error("الأوردر غير موجود")
    var order = orderResult.data

    // ✅ تعديل: قبول Draft و Pending
    if (order.order_status !== "Draft" && order.order_status !== "Pending") {
      throw new Error("لا يمكن تأكيد الأوردر في حالته الحالية: " + order.order_status)
    }

    // ✅ حماية: لا يمكن تأكيد أوردر مرتبط برانشيت
    if (order.runsheet_id) {
      throw new Error("لا يمكن تأكيد أوردر مرتبط برانشيت")
    }

    var updateResult = await supabase
      .from("orders")
      .update({ order_status: "Confirmed" })
      .eq("order_code", order_code)
    if (updateResult.error) throw new Error("فشل تحديث حالة الأوردر")

    return new Response(JSON.stringify({ success: true, msg: "تم تأكيد الأوردر" }), {
      headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
    })
  } catch (error) {
    console.error("❌ confirm-order error:", error.message)
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400,
      headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
    })
  }
})
