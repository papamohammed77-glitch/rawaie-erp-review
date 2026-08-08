// reopen-loading – إعادة فتح رانشيت محمّل للتعديل (يُعيد المخزون ويُبقي الكميات)
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

    var { data: pubUser } = await supabase.from("users").select("id").eq("email", user.email).maybeSingle()
    if (!pubUser) throw new Error("المستخدم غير موجود في سجلات الموظفين")

    var { data: settings } = await supabase.from("app_settings").select("main_branch_id").limit(1).maybeSingle()
    if (!settings || !settings.main_branch_id) throw new Error("الفرع الرئيسي غير محدد في الإعدادات")
    var mainBranchId = settings.main_branch_id

    var { data: rs } = await supabase.from("runsheets").select("id, status, loader_id").eq("runsheet_code", runsheet_code).maybeSingle()
    if (!rs) throw new Error("الرانشيت غير موجود")
    if (rs.status !== "Loaded") throw new Error("الرانشيت ليس في حالة محمّل")
    if (rs.loader_id !== pubUser.id) throw new Error("هذا الرانشيت لا يخصك")

    var { data: details } = await supabase.from("run_sheet_details").select("item_code, item_id, qty_loaded").eq("runsheet_id", rs.id)
    if (!details || !details.length) throw new Error("لا توجد تفاصيل للرانشيت")

    // إعادة المخزون الفعلي
    for (var i = 0; i < details.length; i++) {
      var d = details[i]
      var qty = Number(d.qty_loaded) || 0
      if (qty > 0) {
        if (!d.item_id) {
          var { data: itm } = await supabase.from("items").select("id").eq("item_code", d.item_code).maybeSingle()
          if (!itm) throw new Error("الصنف غير موجود: " + d.item_code)
          d.item_id = itm.id
        }
        var { data: stock } = await supabase.from("stock_branches").select("qty").eq("branch_id", mainBranchId).eq("item_id", d.item_id).maybeSingle()
        var currentQty = Number(stock?.qty || 0)
        await supabase.from("stock_branches").update({ qty: currentQty + qty }).eq("branch_id", mainBranchId).eq("item_id", d.item_id)
      }
    }

    // إعادة الرانشيت إلى Loading مع الاحتفاظ بـ qty_loaded (للتعديل)
    await supabase.from("runsheets").update({
      status: "Loading"
      // لا نلمس loader_start لإبقاء الوقت التراكمي
    }).eq("id", rs.id)

    return new Response(JSON.stringify({ success: true, msg: "تم إعادة فتح الرانشيت للتعديل." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
