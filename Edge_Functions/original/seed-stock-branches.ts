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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("جلسة غير صالحة");

    const { data: items, error: itemsError } = await supabase.from("items").select("id, item_code, name");
    if (itemsError) throw itemsError;

    const { data: branches, error: branchesError } = await supabase.from("branches").select("id, branch_code");
    if (branchesError) throw branchesError;

    if (!branches || branches.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "لا توجد فروع في النظام" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    var created = 0;
    var skipped = 0;

    for (var i = 0; i < items.length; i++) {
      for (var b = 0; b < branches.length; b++) {
        const { data: existing } = await supabase.from("stock_branches").select("id").eq("item_id", items[i].id).eq("branch_id", branches[b].id).maybeSingle();
        if (!existing) {
          const { error: insertError } = await supabase.from("stock_branches").insert({ item_id: items[i].id, branch_id: branches[b].id, qty: 0, allocated_qty: 0 });
          if (!insertError) created++;
        } else {
          skipped++;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: "تم إنشاء " + created + " صف جديد. تم تخطي " + skipped + " صف موجود مسبقاً.",
      totalItems: items.length,
      totalBranches: branches.length
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

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