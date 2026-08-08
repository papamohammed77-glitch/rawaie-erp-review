// get-cash-flow/index.ts
// الإصدار 1.1 – أُضيف تعليق توثيقي للدين التقني
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

    var fromDate = body.fromDate;
    var toDate = body.toDate;
    if (!fromDate || !toDate) throw new Error("fromDate و toDate مطلوبان");

    var { data: result, error: rpcError } = await supabase.rpc(
      "get_cash_flow",
      { p_from_date: fromDate, p_to_date: toDate }
    );

    if (rpcError) throw new Error("فشل استدعاء التدفقات النقدية: " + rpcError.message);

    var operatingInflow = 0, operatingOutflow = 0, investing = 0, financing = 0;
    if (result) {
      for (var i = 0; i < result.length; i++) {
        var row = result[i];
        var amt = Number(row.amount) || 0;
        if (row.category === 'operating_inflow') operatingInflow += amt;
        else if (row.category === 'operating_outflow') operatingOutflow += amt;
        else if (row.category === 'investing') investing += amt;
        else if (row.category === 'financing') financing += amt;
      }
    }

    // تنبيه معماري: تصنيف التدفقات النقدية (تشغيلي/استثماري/تمويلي) مبني حاليًا على ترميز الحسابات.
    // هذا تبسيط مقبول للإصدار 1.0. في الإصدارات المستقبلية، يجب أن يعتمد التصنيف على طبيعة الحركة.

    return new Response(JSON.stringify({
      success: true,
      data: {
        operatingInflow: operatingInflow,
        operatingOutflow: operatingOutflow,
        netOperating: operatingInflow - operatingOutflow,
        investing: investing,
        financing: financing,
        netCashFlow: (operatingInflow - operatingOutflow) + investing + financing
      }
    }), { headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" }) });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400, headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
    });
  }
});
