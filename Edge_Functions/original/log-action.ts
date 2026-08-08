import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  // إعداد CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
      },
      status: 204,
    });
  }

  try {
    const body = await req.json();
    const { action, table_name, record_id, old_data, new_data } = body;

    if (!action) {
      return new Response(JSON.stringify({ success: false, error: "action مطلوب" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // الاتصال بـ Supabase باستخدام Service Role Key لضمان الصلاحيات الكاملة
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // محاولة استخراج البريد الإلكتروني من JWT القادم
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    let user_email = "anonymous";

    if (token && token.length > 10) {
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user && user.email) {
          user_email = user.email;
        }
      } catch (_) {
        // إذا فشل التحقق من الرمز، نستخدم anonymous
      }
    }

    // إدراج السجل في audit_log
    const { error: insertError } = await supabaseAdmin
      .from("audit_log")
      .insert({
        user_email: user_email,
        action: action,
        table_name: table_name || null,
        record_id: record_id || null,
        old_data: old_data || null,
        new_data: new_data || null,
        ip_address: req.headers.get("x-forwarded-for") || null,
        user_agent: req.headers.get("user-agent") || null,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ success: false, error: insertError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});