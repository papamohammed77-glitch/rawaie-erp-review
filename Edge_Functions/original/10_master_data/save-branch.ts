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
    const { branch, isEdit, branch_code } = await req.json();
    if (!branch || !branch.name) throw new Error("اسم الفرع مطلوب");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("جلسة غير صالحة");

    const branchData: any = {
        name: branch.name, location: branch.location || null, manager: branch.manager || null,
        phone: branch.phone || null, is_active: branch.is_active !== undefined ? branch.is_active : true,
        company_id: '00000000-0000-0000-0000-000000000001'
    };

    if (isEdit && branch_code) {
        const { error } = await supabase.from("branches").update(branchData).eq("branch_code", branch_code);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, action: 'updated' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
        const { data: maxBr } = await supabase.from("branches").select("branch_code").order("branch_code", { ascending: false }).limit(1);
        var newCode = "BR-1";
        if (maxBr && maxBr.length > 0) {
            var num = parseInt(maxBr[0].branch_code.replace("BR-", "")) || 0;
            newCode = "BR-" + (num + 1);
        }
        branchData.branch_code = newCode;
        const { error } = await supabase.from("branches").insert(branchData);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, branch_code: newCode, action: 'created' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
