// cancel-receiving – إلغاء استلام أمر شراء
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
    if (!pubUser) throw new Error("المستخدم غير موجود")

    var { data: po } = await supabase.from("purchase_orders").select("id, status, receiver_id").eq("po_code", po_code).maybeSingle()
    if (!po) throw new Error("أمر الشراء غير موجود")
    if (po.status !== "Receiving") throw new Error("الأمر ليس قيد الاستلام")
    if (po.receiver_id !== pubUser.id) throw new Error("هذا الأمر لا يخصك")

    // إعادة إلى الحالة السابقة (نفترض Sent كحالة أصلية)
    await supabase.from("purchase_orders").update({
      status: "Sent",
      receiver_id: null,
      receive_start: null
    }).eq("id", po.id)

    return new Response(JSON.stringify({ success: true, msg: "تم إلغاء الاستلام" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
