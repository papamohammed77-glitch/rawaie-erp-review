// start-receiving – بدء استلام أمر شراء (يمنع التضارب)
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
    var po_code = body.po_code
    if (!po_code) throw new Error("رقم أمر الشراء مطلوب")

    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error("جلسة غير صالحة")

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

    // منع تعدد الاستلام لنفس المستخدم (اختياري، يمكن تفعيله)
    var { data: activePO } = await supabase.from("purchase_orders")
      .select("po_code")
      .eq("status", "Receiving")
      .eq("receiver_id", pubUser.id)
      .maybeSingle()
    if (activePO) throw new Error("لديك أمر شراء قيد الاستلام: " + activePO.po_code)

    var { data: po } = await supabase.from("purchase_orders").select("id, status").eq("po_code", po_code).maybeSingle()
    if (!po) throw new Error("أمر الشراء غير موجود")
    if (po.status !== "Sent" && po.status !== "Partially Received") throw new Error("لا يمكن بدء استلام هذا الأمر")

    await supabase.from("purchase_orders").update({
      status: "Receiving",
      receiver_id: pubUser.id,
      receive_start: new Date().toISOString()
    }).eq("id", po.id)

    return new Response(JSON.stringify({ success: true, msg: "تم بدء الاستلام" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
