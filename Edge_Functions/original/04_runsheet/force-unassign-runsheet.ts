// force-unassign-runsheet – سحب اضطراري لرانشيت قيد التوصيل
// تحتفظ بجميع الكميات المسلّمة وتعيد الرانشيت إلى Loaded
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
    var reason = body.reason || "سحب اضطراري من المشرف"
    if (!runsheet_code) throw new Error("رقم الرانشيت مطلوب")

    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error("جلسة غير صالحة")

    var { data: pubUser } = await supabase.from("users").select("id, role").eq("email", user.email).maybeSingle()
    if (!pubUser) throw new Error("المستخدم غير موجود")

    var { data: rs } = await supabase.from("runsheets").select("id, status, driver_id").eq("runsheet_code", runsheet_code).maybeSingle()
    if (!rs) throw new Error("الرانشيت غير موجود")
    if (rs.status !== "Delivering") throw new Error("يمكن سحب الرانشيتات قيد التوصيل فقط")
    if (!rs.driver_id) throw new Error("الرانشيت ليس له سائق")

    // ✅ الاحتفاظ بجميع الكميات – لا نمس order_details ولا run_sheet_details
    // فقط نعيد الرانشيت إلى Loaded ونمسح السائق

    var now = new Date().toISOString()

    // تسجيل العملية في audit_log
    await supabase.from("audit_log").insert({
      user_email: user.email,
      action: "force_unassign_runsheet",
      table_name: "runsheets",
      record_id: rs.id,
      new_data: { runsheet_code: runsheet_code, reason: reason, previous_driver_id: rs.driver_id, timestamp: now },
      ip_address: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null
    })

    // إعادة الرانشيت إلى Loaded
    var { error: updateError } = await supabase.from("runsheets").update({
      status: "Loaded",
      driver_id: null,
      delivery_start: null
    }).eq("id", rs.id)
    if (updateError) throw new Error("فشل تحديث الرانشيت: " + updateError.message)

    return new Response(JSON.stringify({ 
      success: true, 
      msg: "تم سحب الرانشيت بنجاح. الكميات المسلّمة محفوظة. الرانشيت جاهز لإعادة التعيين." 
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (error) {
    console.error("❌ Error:", error.message)
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
