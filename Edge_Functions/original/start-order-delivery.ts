// start-order-delivery – بدء تسليم أوردر داخل رانشيت
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
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var runsheet_code = body.runsheet_code
    var order_code = body.order_code
    if (!runsheet_code || !order_code) throw new Error("رقم الرانشيت والأوردر مطلوبان")

    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error("جلسة غير صالحة")

    var { data: pubUser } = await supabase.from("users").select("id").eq("email", user.email).maybeSingle()
    if (!pubUser) throw new Error("المستخدم غير موجود في سجلات الموظفين")

    var { data: rs } = await supabase.from("runsheets")
      .select("id, status, driver_id")
      .eq("runsheet_code", runsheet_code)
      .maybeSingle()
    if (!rs) throw new Error("الرانشيت غير موجود")
    if (rs.status !== "Delivering") throw new Error("الرانشيت ليس قيد التوصيل")
    if (rs.driver_id !== pubUser.id) throw new Error("هذا الرانشيت لا يخصك")

    var { data: order } = await supabase.from("orders")
      .select("id, order_status")
      .eq("order_code", order_code)
      .eq("runsheet_id", rs.id)
      .maybeSingle()
    if (!order) throw new Error("الأوردر غير موجود في هذا الرانشيت")
    if (order.order_status !== "Pending" && order.order_status !== "Loaded") {
      throw new Error("لا يمكن بدء تسليم هذا الأوردر في حالته الحالية")
    }

    await supabase.from("orders").update({
      order_status: "Delivering",
      delivery_start_time: new Date().toISOString()
    }).eq("id", order.id)

    return new Response(JSON.stringify({ success: true, msg: "تم بدء تسليم الأوردر" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})