// cancel-delivery – إلغاء التوصيل وإعادة الرانشيت إلى Loaded (تستخدم driver_id)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
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
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }
    var runsheet_code = body.runsheet_code
    if (!runsheet_code) throw new Error("رقم الرانشيت مطلوب")

    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error("جلسة غير صالحة")

    var { data: pubUser } = await supabase.from("users").select("id").eq("email", user.email).maybeSingle()
    if (!pubUser) throw new Error("المستخدم غير موجود في سجلات الموظفين")

    var { data: rs } = await supabase.from("runsheets").select("id, status, driver_id").eq("runsheet_code", runsheet_code).maybeSingle()
    if (!rs) throw new Error("الرانشيت غير موجود")
    if (rs.status !== "Delivering") throw new Error("لا يمكن إلغاء توصيل رانشيت ليس قيد التوصيل")
    if (rs.driver_id !== pubUser.id) throw new Error("هذا الرانشيت لا يخصك")

    // تصفير الكميات المسلّمة – فقط للأوردرات التي لم تُسلّم بعد
    var { data: orders } = await supabase.from("orders").select("id, order_status").eq("runsheet_id", rs.id)
    if (orders && orders.length > 0) {
      var nonDeliveredOrderIds = []
      for (var i = 0; i < orders.length; i++) {
        if (orders[i].order_status !== "Delivered") {
          nonDeliveredOrderIds.push(orders[i].id)
        }
      }
      if (nonDeliveredOrderIds.length > 0) {
        await supabase.from("order_details").update({ qty_delivered: 0, qty_refused: 0, notes: null }).in("order_id", nonDeliveredOrderIds)
        await supabase.from("orders").update({ order_status: "Loaded" }).in("id", nonDeliveredOrderIds)
      }
    }

    await supabase.from("run_sheet_details").update({ qty_delivered: 0 }).eq("runsheet_id", rs.id)

    // إعادة الرانشيت إلى Loaded مع إبقاء driver_id (لأن السائق لم يتغير)
    await supabase.from("runsheets").update({
      status: "Loaded",
      delivery_start: null
    }).eq("id", rs.id)

    return new Response(JSON.stringify({ success: true, msg: "تم إلغاء التوصيل وإعادة الرانشيت إلى محمّل." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
