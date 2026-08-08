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
    const { orderHeader, itemsList } = await req.json();
    if (!orderHeader || !itemsList || !itemsList.length) throw new Error("البيانات غير مكتملة");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("جلسة غير صالحة");

    const { data: lastPO } = await supabase.from("purchase_orders").select("po_code").order("po_code", { ascending: false }).limit(1).maybeSingle();
    var nextNum = 1001;
    if (lastPO && lastPO.po_code) { var n = parseInt(lastPO.po_code.replace("PO-", "")) || 1000; nextNum = n + 1; }
    const poCode = "PO-" + nextNum;

    const { data: poInsert, error: poError } = await supabase.from("purchase_orders").insert({
      po_code: poCode, po_date: new Date().toISOString().split("T")[0],
      supplier_id: orderHeader.supplierId, supplier_name: orderHeader.supplierName,
      total_amount: orderHeader.total, status: "Draft", created_by: user.email,
      company_id: "00000000-0000-0000-0000-000000000001"
    }).select("id").single();
    if (poError) throw new Error("فشل إنشاء أمر الشراء");

    for (var i = 0; i < itemsList.length; i++) {
      var item = itemsList[i];
      await supabase.from("purchase_order_details").insert({
        po_id: poInsert.id, item_code: item.code, item_name: item.name,
        unit: item.unit || "حبة", qty_ordered: item.qty, unit_price: item.price,
        line_amount: item.price * item.qty
      });
    }

    return new Response(JSON.stringify({ success: true, poID: poCode }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    const errOrigin = req.headers.get("Origin") || "*";
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": errOrigin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Content-Type": "application/json"
      }
    });
  }
});
