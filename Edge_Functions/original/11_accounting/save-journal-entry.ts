import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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
    const { reference, description, entryType, lines } = await req.json();
    if (!lines || !lines.length) throw new Error("سطور القيد مطلوبة");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("جلسة غير صالحة");

    const entryCode = "JE-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const { data: entryInsert, error: entryError } = await supabase
      .from("journal_entries")
      .insert({
        entry_code: entryCode, entry_date: new Date().toISOString().split("T")[0],
        reference: reference || "", description: description || "",
        entry_type: entryType || "Manual", status: "Posted",
        created_by: user.email, posting_date: new Date().toISOString(),
        company_id: "00000000-0000-0000-0000-000000000001"
      }).select("id").single();
    if (entryError) throw new Error("فشل إنشاء القيد");

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      await supabase.from("journal_lines").insert({
        entry_id: entryInsert.id, account_id: line.accountId,
        account_name: line.accountName, debit: line.debit || 0,
        credit: line.credit || 0, notes: line.notes || "",
        cost_center_id: line.costCenterId || null
      });
    }

    return new Response(JSON.stringify({ success: true, entryCode }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
