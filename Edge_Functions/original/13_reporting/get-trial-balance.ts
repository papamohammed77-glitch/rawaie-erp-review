// get-trial-balance/index.ts
// الإصدار 1.1 – أُضيفت المصادقة

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

var supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async function(req) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ✅ المصادقة (مُضافة)
    var authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    var token = authHeader.replace("Bearer ", "");
    var authResult = await supabase.auth.getUser(token);
    if (authResult.error || !authResult.data.user) throw new Error("جلسة غير صالحة");
    
    var rawBody = await req.text();
    console.log("📥 get-trial-balance – rawBody:", rawBody);
    
    var body = {};
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody); } catch (e) { throw new Error("صيغة JSON غير صالحة"); }
    }

    var fromDate = body.fromDate;
    var toDate = body.toDate;
    if (!fromDate || !toDate) throw new Error("fromDate و toDate مطلوبان");

    var { data: result, error: rpcError } = await supabase.rpc(
      "get_trial_balance",
      { p_from_date: fromDate, p_to_date: toDate }
    );

    if (rpcError) throw new Error("فشل استدعاء ميزان المراجعة: " + rpcError.message);

    console.log("✅ get-trial-balance – تم استرجاع " + (result ? result.length : 0) + " صف");

    return new Response(JSON.stringify({ success: true, data: result || [] }), {
      headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400,
      headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
    });
  }
});
