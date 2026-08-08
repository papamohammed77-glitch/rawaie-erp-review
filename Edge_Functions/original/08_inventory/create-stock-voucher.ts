// create-stock-voucher – إنشاء إذن مخزني (آمنة)
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

    var type = body.type, reference = body.reference, fromType = body.fromType, fromId = body.fromId,
        toType = body.toType, toId = body.toId, items = body.items, notes = body.notes
    if (!type || !items || !items.length) throw new Error("النوع والأصناف مطلوبة")

    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error("جلسة غير صالحة")

    var { data: lastV } = await supabase.from("stock_vouchers").select("voucher_code").order("voucher_code", { ascending: false }).limit(1).maybeSingle()
    var lastNum = 0
    if (lastV && lastV.voucher_code) { var m = lastV.voucher_code.match(/\d+/); if (m) lastNum = parseInt(m[0]) }
    var newCode = "IN-" + (lastNum + 1)

    var { data: vInsert, error: vError } = await supabase.from("stock_vouchers").insert({
      voucher_code: newCode, voucher_date: new Date().toISOString().split("T")[0],
      type: type, status: "Draft", reference: reference || "",
      from_type: fromType || "Branch", from_id: fromId || "",
      to_type: toType || "Branch", to_id: toId || "",
      notes: notes || "", created_by: user.email, source: "Manual",
      company_id: "00000000-0000-0000-0000-000000000001"
    }).select("id").single()
    if (vError) throw new Error("فشل إنشاء الإذن")

    for (var i = 0; i < items.length; i++) {
      var item = items[i]
      await supabase.from("stock_voucher_details").insert({
        voucher_id: vInsert.id, item_code: item.itemCode,
        item_name: item.itemName || item.itemCode, unit: item.unit || "حبة",
        qty: item.qty, unit_price: item.unitPrice || 0, notes: item.notes || ""
      })
    }

    return new Response(JSON.stringify({ success: true, voucherId: newCode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
