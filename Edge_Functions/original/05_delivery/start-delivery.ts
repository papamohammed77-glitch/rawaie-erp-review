// start-delivery – بدء التوصيل (تستخدم driver_id وتستقبل meter_start)
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

serve(async (req) => {
  const origin = req.headers.get("Origin") || "*"
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { runsheet_code, meter_start } = await req.json()
    if (!runsheet_code) throw new Error("رقم الرانشيت مطلوب")
    
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    const token = authHeader.replace("Bearer ", "")

    // ✅ التحقق من JWT مباشرة باستخدام supabase.auth.getUser
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData || !userData.user) {
      console.error("❌ getUser failed:", userError?.message || "No user data")
      throw new Error("جلسة غير صالحة")
    }
    const user = userData.user

    const { data: pubUser } = await supabase.from("users").select("id").eq("email", user.email).maybeSingle()
    if (!pubUser) throw new Error("المستخدم غير موجود في سجلات الموظفين")

    const { data: rs } = await supabase
      .from("runsheets").select("status, driver_id").eq("runsheet_code", runsheet_code).maybeSingle()
    if (!rs) throw new Error("الرانشيت غير موجود")
    if (rs.status !== "Loaded") throw new Error("لا يمكن بدء التوصيل")
    if (rs.driver_id !== pubUser.id) throw new Error("هذا الرانشيت معين لسائق آخر")

    await supabase.from("runsheets").update({
      status: "Delivering",
      delivery_start: new Date().toISOString(),
      meter_start: meter_start || null
    }).eq("runsheet_code", runsheet_code)

    const { data: rsData } = await supabase.from("runsheets")
      .select("vehicle_id").eq("runsheet_code", runsheet_code).maybeSingle()
    
    if (rsData && meter_start) {
      await supabase.from("vehicle_tracking").insert({
        vehicle_id: rsData.vehicle_id || null,
        driver_id: pubUser.id,
        runsheet_code: runsheet_code,
        meter_reading: meter_start,
        tracking_date: new Date().toISOString().split("T")[0],
        company_id: "00000000-0000-0000-0000-000000000001"
      })
    }

    return new Response(JSON.stringify({ success: true, msg: "تم بدء التوصيل" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("❌ start-delivery error:", error.message)
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
