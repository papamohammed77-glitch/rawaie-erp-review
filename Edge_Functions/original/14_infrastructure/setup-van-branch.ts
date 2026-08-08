// supabase/functions/setup-van-branch/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { driver_email, driver_name } = await req.json();
    if (!driver_email) throw new Error("driver_email مطلوب");

    var branchCode = "VAN-" + driver_email;
    var { data: existing } = await supabase.from("branches").select("id").eq("branch_code", branchCode).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ success: true, branch_id: existing.id, created: false, msg: "الفرع موجود مسبقاً" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    var { data: newBranch, error } = await supabase.from("branches").insert({
      branch_code: branchCode,
      name: "سيارة - " + (driver_name || driver_email),
      is_active: true,
      company_id: "00000000-0000-0000-0000-000000000001"
    }).select("id").single();

    if (error) throw new Error("فشل إنشاء الفرع: " + error.message);
    return new Response(JSON.stringify({ success: true, branch_id: newBranch.id, created: true, branch_code: branchCode }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, msg: err.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
