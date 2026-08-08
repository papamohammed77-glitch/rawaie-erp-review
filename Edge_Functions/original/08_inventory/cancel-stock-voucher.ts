// cancel-stock-voucher – إلغاء إذن مخزني (آمنة)
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
    var voucher_code = body.voucher_code
    if (!voucher_code) throw new Error("رقم الإذن مطلوب")

    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error("جلسة غير صالحة")

    var { data: voucher, error: fetchError } = await supabase.from("stock_vouchers").select("id, status").eq("voucher_code", voucher_code).maybeSingle()
    if (fetchError || !voucher) throw new Error("الإذن غير موجود")
    if (voucher.status === "Completed" || voucher.status === "Cancelled") throw new Error("لا يمكن إلغاء هذا الإذن")

    await supabase.from("stock_vouchers").update({ status: "Cancelled" }).eq("id", voucher.id)

    return new Response(JSON.stringify({ success: true, msg: "تم إلغاء الإذن" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
