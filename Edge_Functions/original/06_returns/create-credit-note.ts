// create-credit-note – إنشاء إشعار دائن (Credit Note) تلقائياً
// الإصدار 1.2 – مُحسَّن: إزالة التعقيد غير الضروري، العودة إلى البساطة

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
    var rawBody = await req.text();
    console.log("📥 create-credit-note v1.2 – rawBody:", rawBody);
    var body = {};
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody); } catch (e) { throw new Error("صيغة JSON غير صالحة"); }
    }

    var runsheet_code = body.runsheet_code;
    var order_code = body.order_code;
    var items = body.items;
    var reason = body.reason || "مرتجع بضاعة";

    if (!runsheet_code || !order_code || !items || !items.length) {
      throw new Error("البيانات غير مكتملة");
    }

    var authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    var token = authHeader.replace("Bearer ", "");
    var authResult = await supabase.auth.getUser(token);
    if (authResult.error || !authResult.data.user) throw new Error("جلسة غير صالحة");
    var user = authResult.data.user;

    // جلب الأوردر
    var orderResult = await supabase.from("orders")
      .select("id, customer_id, customer_name, total_amount")
      .eq("order_code", order_code)
      .maybeSingle();
    if (orderResult.error || !orderResult.data) throw new Error("الأوردر غير موجود");
    var order = orderResult.data;

    // جلب الرانشيت
    var rsResult = await supabase.from("runsheets")
      .select("id")
      .eq("runsheet_code", runsheet_code)
      .maybeSingle();
    var rsId = rsResult.data ? rsResult.data.id : null;

    // حساب إجمالي المرتجع
    var totalReturned = 0;
    for (var i = 0; i < items.length; i++) {
      var returnedQty = Number(items[i].returnedQty) || 0;
      var unitPrice = Number(items[i].unit_price) || 0;
      totalReturned += returnedQty * unitPrice;
    }

    // توليد كود الإشعار
    var now = new Date();
    var cnCode = "CN-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

    // إنشاء الإشعار الدائن
    var cnResult = await supabase.from("credit_notes").insert({
      cn_code: cnCode,
      cn_date: now.toISOString().split("T")[0],
      order_id: order.id,
      runsheet_id: rsId,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      total_amount: totalReturned,
      reason: reason,
      status: "Posted",
      created_by: user.email
    }).select("id").single();

    if (cnResult.error) throw new Error("فشل إنشاء الإشعار الدائن: " + cnResult.error.message);

    console.log("✅ Credit Note created:", cnCode, "بقيمة:", totalReturned);

    return new Response(JSON.stringify({
      success: true,
      msg: "تم إنشاء الإشعار الدائن",
      creditNoteCode: cnCode,
      totalAmount: totalReturned
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
