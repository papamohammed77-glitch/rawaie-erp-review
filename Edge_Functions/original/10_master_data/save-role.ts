import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const origin = req.headers.get("Origin") || "*";
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { id, role_name, description, permissions, is_system } = await req.json();
    if (!role_name) throw new Error("اسم الدور مطلوب");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("جلسة غير صالحة");

    // تجهيز البيانات
    var roleData = {
        role_name: role_name,
        description: description || null,
        is_system: is_system || false,
        permissions: permissions || [],
        company_id: "00000000-0000-0000-0000-000000000001"
    };

    if (id) {
        // تحديث دور موجود
        var { error: updateError } = await supabase.from("roles").update(roleData).eq("id", id);
        if (updateError) throw updateError;
        return new Response(JSON.stringify({ success: true, action: 'updated' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
        // إنشاء دور جديد
        var { data: newRole, error: insertError } = await supabase.from("roles").insert(roleData).select("id").single();
        if (insertError) throw insertError;
        return new Response(JSON.stringify({ success: true, action: 'created', id: newRole.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error: any) {
    const errOrigin = req.headers.get("Origin") || "*";
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": errOrigin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Content-Type": "application/json"
      }
    });
  }
});
