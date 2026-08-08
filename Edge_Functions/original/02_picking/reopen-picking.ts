// reopen-picking – إعادة فتح رانشيت تم إنهاء تحضيره للتعديل
// يحرر الحجز (allocated_qty) فقط، ويُبقي على الكميات المُدخلة والوقت الأصلي
// يستخدم main_branch_id من app_settings

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    var rawBody = await req.text()
    console.log("📥 Raw body:", rawBody)
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
    console.log("👤 Authenticated user:", user.email)

    var { data: pubUser } = await supabase.from("users").select("id").eq("email", user.email).maybeSingle()
    if (!pubUser) {
      var { data: newUser, error: insertError } = await supabase.from("users").insert({
        id: user.id, email: user.email,
        name: user.user_metadata?.name || user.email,
        role: user.user_metadata?.role || 'مخزني',
        permissions: user.user_metadata?.permissions || [],
        company_id: '00000000-0000-0000-0000-000000000001', status: 'Active'
      }).select("id").single()
      if (insertError) throw new Error("فشل إضافة المستخدم: " + insertError.message)
      pubUser = newUser
    }
    console.log("✅ public.users.id:", pubUser.id)

    var { data: settings } = await supabase.from("app_settings")
      .select("main_branch_id").limit(1).maybeSingle()
    if (!settings || !settings.main_branch_id) throw new Error("الفرع الرئيسي غير محدد في الإعدادات")
    var mainBranchId = settings.main_branch_id

    var { data: rs, error: fetchError } = await supabase.from("runsheets")
      .select("id, status, picker_id")
      .eq("runsheet_code", runsheet_code).maybeSingle()
    if (fetchError || !rs) throw new Error("الرانشيت غير موجود")
    if (rs.status !== "Picked") throw new Error("الرانشيت ليس في حالة مكتمل التحضير")
    if (rs.picker_id !== pubUser.id) throw new Error("هذا الرانشيت لا يخصك")

    var { data: details, error: detailsError } = await supabase.from("run_sheet_details")
      .select("item_id, item_code, qty_picked")
      .eq("runsheet_id", rs.id)
    if (detailsError || !details || details.length === 0) throw new Error("لا توجد تفاصيل للرانشيت")

    for (var i = 0; i < details.length; i++) {
      var d = details[i]
      var picked = Number(d.qty_picked) || 0
      if (picked > 0) {
        if (!d.item_id) {
          var { data: itemData } = await supabase.from("items").select("id").eq("item_code", d.item_code).maybeSingle()
          if (!itemData) throw new Error("الصنف غير موجود: " + d.item_code)
          d.item_id = itemData.id
        }
        var { data: stock } = await supabase.from("stock_branches")
          .select("allocated_qty")
          .eq("branch_id", mainBranchId)
          .eq("item_id", d.item_id)
          .maybeSingle()
          
        var currentAllocated = Number(stock?.allocated_qty || 0)
        var newAllocated = Math.max(0, currentAllocated - picked)
        
        var { error: stockError } = await supabase.from("stock_branches")
          .update({ allocated_qty: newAllocated })
          .eq("branch_id", mainBranchId)
          .eq("item_id", d.item_id)
        if (stockError) throw new Error("فشل تحرير الحجز لـ " + d.item_code + ": " + stockError.message)
      }
    }

    // ✅ إعادة الرانشيت إلى Picking مع الإبقاء على picker_start الأصلي
    var { error: updateError } = await supabase.from("runsheets").update({
      status: "Picking"
    }).eq("id", rs.id)
    if (updateError) throw new Error("فشل تحديث حالة الرانشيت: " + updateError.message)

    console.log("✅ Reopened:", runsheet_code)
    return new Response(JSON.stringify({ success: true, msg: "تم إعادة فتح الرانشيت للتعديل." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("❌ Error:", error.message)
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
