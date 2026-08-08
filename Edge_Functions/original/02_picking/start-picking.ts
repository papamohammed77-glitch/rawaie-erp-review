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
    // 1. قراءة آمنة للجسم
    var rawBody = await req.text()
    console.log("📥 Raw body:", rawBody)

    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    // 2. استخراج runsheet_code
    var runsheet_code = body.runsheet_code
    if (!runsheet_code && body.body) {
      if (typeof body.body === 'string') {
        try { runsheet_code = JSON.parse(body.body).runsheet_code } catch(e) {}
      } else {
        runsheet_code = body.body.runsheet_code
      }
    }

    console.log("🔍 Extracted runsheet_code:", runsheet_code)
    if (!runsheet_code) throw new Error("رقم الرانشيت مطلوب")

    // 3. المصادقة
    var authHeader = req.headers.get("Authorization")
    console.log("🔐 Auth header:", authHeader ? "موجود" : "مفقود")
    if (!authHeader) throw new Error("غير مصرح")

    var token = authHeader.replace("Bearer ", "")
    var { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error("جلسة غير صالحة")
    console.log("👤 Authenticated user:", user.email, "Auth UUID:", user.id)

    // 4. ✅ جلب public.users.id باستخدام البريد الإلكتروني (توصية المساعد القديم)
    var { data: pubUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", user.email)
      .maybeSingle()
    
    // إذا لم يكن موجوداً، نضيفه
    if (!pubUser) {
      console.log("📝 User not found in public.users, inserting...")
      var { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email,
          role: user.user_metadata?.role || 'مخزني',
          permissions: user.user_metadata?.permissions || [],
          company_id: '00000000-0000-0000-0000-000000000001',
          status: 'Active'
        })
        .select("id")
        .single()
      
      if (insertError) {
        console.error("❌ Failed to insert:", insertError.message)
        throw new Error("فشل إضافة المستخدم: " + insertError.message)
      }
      pubUser = newUser
      console.log("✅ User inserted, public.users.id:", pubUser.id)
    } else {
      console.log("✅ User found in public.users, id:", pubUser.id)
    }

    // 5. التحقق من حالة الرانشيت
    var { data: rs, error: fetchError } = await supabase
      .from("runsheets")
      .select("id, status")
      .eq("runsheet_code", runsheet_code)
      .maybeSingle()
    if (fetchError) throw new Error("خطأ في البحث عن الرانشيت: " + fetchError.message)
    if (!rs) throw new Error("الرانشيت غير موجود")
    console.log("📄 Current status:", rs.status)
    if (!["Open", "Confirmed"].includes(rs.status)) throw new Error("لا يمكن بدء التحضير في هذه الحالة")

    // 6. ✅ استخدام pubUser.id (وليس auth.users.id)
    var { error: updateError } = await supabase
      .from("runsheets")
      .update({
        status: "Picking",
        picker_id: pubUser.id,
        picker_start: new Date().toISOString()
      })
      .eq("id", rs.id)
    
    console.log("💾 Update attempted. Error:", updateError ? updateError.message : "null")
    if (updateError) throw new Error("فشل تحديث قاعدة البيانات: " + updateError.message)

    console.log("✅ Picking started for:", runsheet_code)
    return new Response(JSON.stringify({ success: true, msg: "تم بدء التحضير" }), {
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
