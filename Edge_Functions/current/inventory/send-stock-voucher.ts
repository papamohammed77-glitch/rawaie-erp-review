// send-stock-voucher – إرسال إذن مخزني وخصم المخزون
// الإصدار 3.1 – atomic multi-item inventory transaction + CAS + explicit V1 company context

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

var supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
}

serve(async function(req) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    var rawBody = await req.text()
    console.log("📥 send-stock-voucher v3.1 – rawBody:", rawBody)
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var voucher_code = body.voucher_code
    if (!voucher_code) throw new Error("رقم الإذن مطلوب")

    // مصادقة
    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var authResult = await supabase.auth.getUser(token)
    if (authResult.error || !authResult.data.user) throw new Error("جلسة غير صالحة")
    var user = authResult.data.user

    // RAWAEA V1: one operational company. Company context is resolved server-side
    // from the system settings; the client never supplies company_id.
    // .single() intentionally rejects a missing or non-single settings row rather
    // than silently selecting an arbitrary company context.
    var settingsResult = await supabase.from("app_settings")
      .select("company_id")
      .single()
    if (settingsResult.error || !settingsResult.data?.company_id) {
      throw new Error("سياق الشركة غير محدد بشكل وحيد في الإعدادات")
    }
    var companyId = settingsResult.data.company_id

    // The database function owns the complete atomic state transition.
    // It validates the voucher, locks the affected rows, preserves CAS,
    // writes all inventory logs, and marks the voucher Sent in one transaction.
    var rpcResult = await supabase.rpc("send_stock_voucher_atomic", {
      p_company_id: companyId,
      p_voucher_code: voucher_code,
      p_user_email: user.email || ""
    })

    if (rpcResult.error) {
      throw new Error(rpcResult.error.message)
    }

    console.log("✅ Voucher sent atomically:", voucher_code)
    return new Response(JSON.stringify({ success: true, msg: "تم إرسال الإذن وخصم المخزون" }), {
      headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
    })

  } catch (error) {
    console.error("❌ Error:", error.message)
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400,
      headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
    })
  }
})
