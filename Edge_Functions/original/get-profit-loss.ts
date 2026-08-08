// get-profit-loss/index.ts
// الإصدار 1.1 – المصادقة + الصيغة المحاسبية المصححة

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
    var authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    var token = authHeader.replace("Bearer ", "");
    var authResult = await supabase.auth.getUser(token);
    if (authResult.error || !authResult.data.user) throw new Error("جلسة غير صالحة");

    var rawBody = await req.text();
    console.log("📥 get-profit-loss – rawBody:", rawBody);
    
    var body = {};
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody); } catch (e) { throw new Error("صيغة JSON غير صالحة"); }
    }

    var fromDate = body.fromDate;
    var toDate = body.toDate;
    if (!fromDate || !toDate) throw new Error("fromDate و toDate مطلوبان");

    var { data: result, error: rpcError } = await supabase.rpc(
      "get_profit_loss",
      { p_from_date: fromDate, p_to_date: toDate }
    );

    if (rpcError) throw new Error("فشل استدعاء قائمة الدخل: " + rpcError.message);

    var revenueAccounts = [];
    var expenseAccounts = [];
    var totalRevenue = 0;
    var totalExpense = 0;

    if (result) {
      for (var i = 0; i < result.length; i++) {
        var row = result[i];
        if (row.account_type === 'revenue') {
          revenueAccounts.push({ accountId: row.account_id, accountName: row.account_name, total: Number(row.total_amount) || 0 });
          totalRevenue += Number(row.total_amount) || 0;
        } else if (row.account_type === 'expense') {
          expenseAccounts.push({ accountId: row.account_id, accountName: row.account_name, total: Number(row.total_amount) || 0 });
          totalExpense += Number(row.total_amount) || 0;
        }
      }
    }

    var netProfit = totalRevenue - totalExpense;

    console.log("✅ get-profit-loss – إيرادات:", totalRevenue, "مصروفات:", totalExpense, "صافي:", netProfit);

    return new Response(JSON.stringify({
      success: true,
      data: {
        revenueAccounts: revenueAccounts,
        expenseAccounts: expenseAccounts,
        totalRevenue: totalRevenue,
        totalExpense: totalExpense,
        netProfit: netProfit
      }
    }), {
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