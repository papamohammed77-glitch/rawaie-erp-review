// get-balance-sheet/index.ts
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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    var authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    var token = authHeader.replace("Bearer ", "");
    var authResult = await supabase.auth.getUser(token);
    if (authResult.error || !authResult.data.user) throw new Error("جلسة غير صالحة");

    var rawBody = await req.text();
    var body = {};
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody); } catch (e) { throw new Error("صيغة JSON غير صالحة"); }
    }

    var asOfDate = body.asOfDate;
    if (!asOfDate) throw new Error("asOfDate مطلوب");

    var { data: result, error: rpcError } = await supabase.rpc(
      "get_balance_sheet",
      { p_as_of: asOfDate }
    );

    if (rpcError) throw new Error("فشل استدعاء الميزانية العمومية: " + rpcError.message);

    var assets = [];
    var liabilities = [];
    var equity = [];
    var totalAssets = 0;
    var totalLiabilities = 0;
    var totalEquity = 0;

    if (result) {
      for (var i = 0; i < result.length; i++) {
        var row = result[i];
        var bal = Number(row.balance) || 0;
        var item = { accountId: row.account_id, accountName: row.account_name, balance: bal };
        
        if (row.account_type === 'asset') { assets.push(item); totalAssets += bal; }
        else if (row.account_type === 'liability') { liabilities.push(item); totalLiabilities += bal; }
        else if (row.account_type === 'equity') { equity.push(item); totalEquity += bal; }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        assets: assets, totalAssets: totalAssets,
        liabilities: liabilities, totalLiabilities: totalLiabilities,
        equity: equity, totalEquity: totalEquity,
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity
      }
    }), { headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" }) });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400, headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
    });
  }
});
