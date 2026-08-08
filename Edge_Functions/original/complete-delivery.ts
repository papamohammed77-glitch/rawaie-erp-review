// complete-delivery – إنهاء التوصيل (تستقبل meter_end)
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

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { runsheet_code, meter_end } = await req.json() // ✅ استقبلنا meter_end
    if (!runsheet_code) throw new Error("رقم الرانشيت مطلوب")
    
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error("جلسة غير صالحة")

    const { data: rs, error: fetchError } = await supabase
      .from("runsheets").select("id, status, vehicle_id").eq("runsheet_code", runsheet_code).maybeSingle()
    if (fetchError || !rs) throw new Error("الرانشيت غير موجود")
    if (rs.status !== "Delivering") throw new Error("الرانشيت ليس قيد التوصيل")

    // ... (منطق معالجة الأوردرات الموجود مسبقاً) ...

    // ✅ تحديث الرانشيت مع meter_end
    await supabase.from("runsheets").update({
      status: "Delivered",
      delivery_end: new Date().toISOString(),
      meter_end: meter_end || null
    }).eq("id", rs.id)

    // ✅ تسجيل قراءة النهاية في جدول vehicle_tracking
    if (meter_end) {
      // تحديث آخر سجل للسيارة بنفس الرانشيت (أو إنشاء سجل جديد)
      const { data: lastTracking } = await supabase.from("vehicle_tracking")
        .select("id").eq("runsheet_code", runsheet_code).order("created_at", { ascending: false }).limit(1).maybeSingle()
      
      if (lastTracking) {
        await supabase.from("vehicle_tracking").update({
          meter_reading: meter_end // يمكن إضافة عمود meter_reading_end لاحقاً إذا أردت التفرقة
        }).eq("id", lastTracking.id)
      } else {
        await supabase.from("vehicle_tracking").insert({
          vehicle_id: rs.vehicle_id,
          driver_id: user.id,
          runsheet_code: runsheet_code,
          meter_reading: meter_end,
          tracking_date: new Date().toISOString().split("T")[0],
          company_id: "00000000-0000-0000-0000-000000000001"
        })
      }
    }

    return new Response(JSON.stringify({ success: true, msg: "تم إنهاء التوصيل" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})