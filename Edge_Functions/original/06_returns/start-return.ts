// start-return – بدء المرتجعات (مع منع تعدد المهام وجلب pubUser)
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
    var { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error("جلسة غير صالحة")

    // جلب public.users.id بالبريد الإلكتروني
    var { data: pubUser } = await supabase.from("users").select("id").eq("email", user.email).maybeSingle()
    if (!pubUser) {
      var { data: newUser } = await supabase.from("users").insert({
        id: user.id, email: user.email, name: user.user_metadata?.name || user.email,
        role: user.user_metadata?.role || 'مخزني', permissions: user.user_metadata?.permissions || [],
        company_id: '00000000-0000-0000-0000-000000000001', status: 'Active'
      }).select("id").single()
      if (!newUser) throw new Error("فشل إضافة المستخدم")
      pubUser = newUser
    }

    // منع تعدد مهام المرتجعات
    var { data: activeRS } = await supabase.from("runsheets")
      .select("runsheet_code")
      .eq("status", "Returning")
      .eq("return_handler_id", pubUser.id)
      .maybeSingle()
    if (activeRS) throw new Error("لديك بالفعل رانشيت قيد المرتجعات: " + activeRS.runsheet_code + ". أنهِه أو ألغِه أولاً.")

    var { data: rs } = await supabase.from("runsheets").select("status").eq("runsheet_code", runsheet_code).maybeSingle()
    if (!rs) throw new Error("الرانشيت غير موجود")
    if (rs.status !== "Delivered") throw new Error("لا يمكن بدء المرتجعات")

    await supabase.from("runsheets").update({
      status: "Returning",
      return_handler_id: pubUser.id,
      return_start: new Date().toISOString()
    }).eq("runsheet_code", runsheet_code)

    return new Response(JSON.stringify({ success: true, msg: "تم بدء المرتجعات" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
