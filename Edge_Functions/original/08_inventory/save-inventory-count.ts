// save-inventory-count – حفظ جرد مخزني (آمنة)
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

    var type = body.type, entityId = body.entityId, reference = body.reference, items = body.items
    if (!type || !items || !items.length) throw new Error("نوع الجرد والأصناف مطلوبة")

    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error("جلسة غير صالحة")

    var { data: settings } = await supabase.from("app_settings").select("main_branch_id").limit(1).maybeSingle()
    var mainBranchId = settings?.main_branch_id || null

    // إنشاء سجل الجرد
    var { data: countInsert, error: countError } = await supabase.from("inventory_counts").insert({
      type: type,
      entity_id: entityId || mainBranchId,
      reference: reference || ('جرد ' + new Date().toLocaleDateString('ar-EG')),
      created_by: user.email,
      company_id: "00000000-0000-0000-0000-000000000001"
    }).select("id").single()
    if (countError) throw new Error("فشل حفظ الجرد: " + countError.message)

    for (var i = 0; i < items.length; i++) {
      var it = items[i]
      await supabase.from("inventory_count_details").insert({
        count_id: countInsert.id,
        item_code: it.itemCode,
        item_name: it.itemName,
        unit: it.unit || "حبة",
        counted_qty: it.qty,
        notes: it.notes || ""
      })
    }

    return new Response(JSON.stringify({ success: true, msg: "تم حفظ الجرد" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
