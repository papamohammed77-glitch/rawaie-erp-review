import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const DEFAULT_ROLES = [
  { role_name: "مدير عام", description: "صلاحية كاملة على جميع أقسام النظام", is_system: true, permissions: ["dash","items","customers","pos","orders","runsheets","purchases","warehouse","branches","finance","reports","users","settings","roles"] },
  { role_name: "محاسب", description: "إدارة الحسابات والمالية والتقارير", is_system: true, permissions: ["dash","finance","reports"] },
  { role_name: "مندوب مبيعات", description: "إنشاء الأوردرات ومتابعة العملاء", is_system: true, permissions: ["dash","customers","orders"] },
  { role_name: "أمين مخزن", description: "إدارة المخزون والعمليات المخزنية", is_system: true, permissions: ["dash","items","warehouse","branches"] }
];

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("جلسة غير صالحة");

    var created = 0;
    for (var i = 0; i < DEFAULT_ROLES.length; i++) {
      var role = DEFAULT_ROLES[i];
      var existing = await supabase.from("roles").select("id").eq("role_name", role.role_name).limit(1);
      if (existing.data && existing.data.length > 0) continue;

      var newRole = await supabase.from("roles").insert({ 
        role_name: role.role_name, 
        description: role.description, 
        is_system: role.is_system,
        company_id: "00000000-0000-0000-0000-000000000001"
      }).select("id").single();
      
      if (newRole.error || !newRole.data) continue;

      if (role.permissions.length > 0) {
        var permsData = role.permissions.map(function(p) { return { role_id: newRole.data.id, permission_key: p }; });
        await supabase.from("role_permissions").insert(permsData);
      }
      created++;
    }

    return new Response(JSON.stringify({ success: true, message: "تم إنشاء " + created + " أدوار افتراضية" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
