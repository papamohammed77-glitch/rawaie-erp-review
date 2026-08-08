// ============================================================
// P0: update-driver-ledger – تحديث دفتر أستاذ المندوب
// ============================================================

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
    console.log("📥 update-driver-ledger – rawBody:", rawBody)
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var driver_email = body.driver_email
    var entry_date = body.entry_date || new Date().toISOString().split("T")[0]
    var description = body.description || ""
    var debit = Number(body.debit) || 0
    var credit = Number(body.credit) || 0
    var reference = body.reference || ""

    if (!driver_email) throw new Error("driver_email مطلوب")
    if (debit === 0 && credit === 0) throw new Error("يجب تحديد مدين أو دائن")

    // إدراج القيد
    var insertRes = await supabase.from("driver_ledger").insert({
      driver_email: driver_email,
      entry_date: entry_date,
      description: description,
      debit: debit,
      credit: credit,
      reference: reference
    }).select("id").single()

    if (insertRes.error) throw new Error("فشل إدراج القيد: " + insertRes.error.message)

    console.log("✅ driver_ledger updated:", driver_email, "debit:", debit, "credit:", credit)

    return new Response(JSON.stringify({ success: true, id: insertRes.data.id }), {
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
