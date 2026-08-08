// reopen-receiving – إعادة فتح أمر شراء مكتمل لتعديل الاستلام
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

    var { data: settings } = await supabase.from("app_settings").select("main_branch_id").limit(1).maybeSingle()
    if (!settings || !settings.main_branch_id) throw new Error("الفرع الرئيسي غير محدد")
    var mainBranchId = settings.main_branch_id

    var { data: po } = await supabase.from("purchase_orders").select("id, status, receiver_id").eq("po_code", po_code).maybeSingle()
    if (!po) throw new Error("أمر الشراء غير موجود")
    if (po.status !== "Received" && po.status !== "Partially Received") throw new Error("لا يمكن إعادة فتح هذا الأمر")

    // استرجاع تفاصيل الاستلام السابقة
    var { data: details } = await supabase.from("purchase_order_details").select("item_code, qty_received").eq("po_id", po.id)
    if (details && details.length > 0) {
      for (var i = 0; i < details.length; i++) {
        var d = details[i]
        var qty = Number(d.qty_received) || 0
        if (qty > 0) {
          var { data: itemData } = await supabase.from("items").select("id").eq("item_code", d.item_code).maybeSingle()
          if (!itemData) continue
          var { data: stock } = await supabase.from("stock_branches").select("qty").eq("branch_id", mainBranchId).eq("item_id", itemData.id).maybeSingle()
          var currentQty = Number(stock?.qty || 0)
          await supabase.from("stock_branches").update({ qty: Math.max(0, currentQty - qty) }).eq("branch_id", mainBranchId).eq("item_id", itemData.id)
        }
      }
    }

    await supabase.from("purchase_orders").update({
      status: "Receiving",
      receiver_id: pubUser.id,
      receive_start: new Date().toISOString()
    }).eq("id", po.id)

    return new Response(JSON.stringify({ success: true, msg: "تم إعادة فتح أمر الشراء للتعديل." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
