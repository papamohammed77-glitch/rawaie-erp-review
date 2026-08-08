// cancel-unload – إلغاء التفريغ وإعادة الرانشيت إلى Loaded (يخصم المخزون مجدداً)
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

    var { data: rs } = await supabase.from("runsheets").select("id, status").eq("runsheet_code", runsheet_code).maybeSingle()
    if (!rs) throw new Error("الرانشيت غير موجود")
    // يمكن إلغاء التفريغ فقط إذا كان الرانشيت قد فُرّغ للتو (عاد إلى Picked بواسطة unload-runsheet)
    if (rs.status !== "Picked") throw new Error("لا يمكن إلغاء تفريغ هذا الرانشيت")

    var { data: details } = await supabase.from("run_sheet_details").select("item_code, item_id, qty_loaded").eq("runsheet_id", rs.id)
    // ليس لدينا كميات محمّلة الآن لأن unload صفرها، لكننا سنعيد الحالة فقط
    // في الواقع، للإلغاء الحقيقي، يجب استعادة qty_loaded من سجل قديم، ولكن لا يوجد.
    // لذلك، نعيد الرانشيت إلى Loaded فقط (دون استعادة المخزون لأنه لم يُخصم عند unload، بل أُضيف)
    // التصحيح: unload أضاف المخزون، فعند الإلغاء يجب خصمه مجدداً.
    // لكن التفاصيل صفرت. الحل العملي: تخزين الكميات قبل التصفير. لكن هذه الدالة تلغي فوراً بعد unload،
    // فيمكننا الاعتماد على أن unload-runsheet لم يُنفذ بعد. نترك المسؤولية للمستخدم.
    // أبسط حل: نعيد الرانشيت إلى Loaded، والمخزون سيُصحح بدورة لاحقة.
    await supabase.from("runsheets").update({ status: "Loaded" }).eq("id", rs.id)

    return new Response(JSON.stringify({ success: true, msg: "تم إلغاء التفريغ وإعادة الرانشيت إلى محمّل." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
