// cancel-return – إلغاء المرتجعات (مع تصفير الكميات)
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
    if (!runsheet_code) throw new Error("رقم الرانشيت مطلوب")

    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var { data: { user } } = await supabase.auth.getUser(token)
    if (!user) throw new Error("جلسة غير صالحة")

    var { data: pubUser } = await supabase.from("users").select("id").eq("email", user.email).maybeSingle()
    if (!pubUser) throw new Error("المستخدم غير موجود في سجلات الموظفين")

    var { data: rs } = await supabase.from("runsheets").select("id, status, return_handler_id").eq("runsheet_code", runsheet_code).maybeSingle()
    if (!rs) throw new Error("الرانشيت غير موجود")
    if (rs.status !== "Returning") throw new Error("الرانشيت ليس قيد المرتجعات")
    if (rs.return_handler_id !== pubUser.id) throw new Error("هذا الرانشيت لا يخصك")

    // ✅ تصفير الكميات المُرتجعة
    var { error: resetError } = await supabase.from("run_sheet_details")
      .update({ qty_returned: 0 })
      .eq("runsheet_id", rs.id)
    if (resetError) throw new Error("فشل تصفير الكميات: " + resetError.message)

    // إعادة الرانشيت إلى Delivered
    await supabase.from("runsheets").update({
      status: "Delivered",
      return_handler_id: null,
      return_start: null
    }).eq("id", rs.id)

    return new Response(JSON.stringify({ success: true, msg: "تم إلغاء المرتجعات وتصفير الكميات." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})