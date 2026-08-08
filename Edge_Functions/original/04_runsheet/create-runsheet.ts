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
    const { selectedOrders } = await req.json();
    if (!selectedOrders || !selectedOrders.length) throw new Error("يجب اختيار أوردر واحد على الأقل");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("جلسة غير صالحة");

    // 1. جلب UUIDs للأوردرات المحددة
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("id, order_code, order_status, runsheet_id, total_amount")
      .in("order_code", selectedOrders);

    if (ordersError || !ordersData || ordersData.length === 0) {
      throw new Error("فشل جلب بيانات الأوردرات المحددة");
    }

    // 2. التحقق من صلاحية الأوردرات في الذاكرة
    let totalAmount = 0;
    const orderUuids: string[] = [];

    for (const order of ordersData) {
      if (order.runsheet_id) throw new Error(`الأوردر ${order.order_code} مرتبط برانشيت آخر`);
      if (!["Confirmed", "Pending"].includes(order.order_status)) {
        throw new Error(`لا يمكن ضم الأوردر ${order.order_code} في حالة ${order.order_status}`);
      }
      totalAmount += Number(order.total_amount) || 0;
      orderUuids.push(order.id);
    }

    // 3. توليد كود الرانشيت
    const { data: lastRS } = await supabase
      .from("runsheets")
      .select("runsheet_code")
      .order("runsheet_code", { ascending: false })
      .limit(1)
      .maybeSingle();

    let newCode = "RS-1";
    if (lastRS?.runsheet_code) {
      const num = parseInt(lastRS.runsheet_code.replace("RS-", "")) || 0;
      newCode = `RS-${num + 1}`;
    }

    // 4. إنشاء الرانشيت
    const { data: rsInsert, error: rsError } = await supabase
      .from("runsheets")
      .insert({
        runsheet_code: newCode,
        run_date: new Date().toISOString().split("T")[0],
        total_amount: totalAmount,
        status: "Open",
        created_by: user.email,
        company_id: "00000000-0000-0000-0000-000000000001"
      })
      .select("id")
      .single();

    if (rsError || !rsInsert) throw new Error("فشل إنشاء الرانشيت: " + (rsError?.message || "غير معروف"));

    // 5. تحديث الأوردرات دفعة واحدة (Bulk Update)
    const { error: updateError } = await supabase
      .from("orders")
      .update({ runsheet_id: rsInsert.id, order_status: "Pending" })
      .in("id", orderUuids);

    if (updateError) throw new Error("فشل ربط الأوردرات بالرانشيت: " + updateError.message);

    // 6. جلب تفاصيل الأصناف باستخدام UUIDs
    const { data: allDetails, error: detailsError } = await supabase
      .from("order_details")
      .select("item_code, item_name, unit, unit_price, qty")
      .in("order_id", orderUuids);

    if (detailsError) throw new Error("فشل جلب تفاصيل الأصناف: " + detailsError.message);

    // 7. تجميع الأصناف المتطابقة
    const itemMap: Record<string, any> = {};
    for (const det of (allDetails || [])) {
      const key = det.item_code;
      if (!itemMap[key]) {
        itemMap[key] = {
          item_code: det.item_code,
          item_name: det.item_name,
          unit: det.unit || "حبة",
          unit_price: det.unit_price,
          qty_ordered: 0
        };
      }
      itemMap[key].qty_ordered += Number(det.qty) || 0;
    }

    // 8. ✅ جلب item_id (UUID) من جدول items لكل صنف
    const itemCodes = Object.keys(itemMap);
    if (itemCodes.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from("items")
        .select("id, item_code")
        .in("item_code", itemCodes);

      if (itemsError) throw new Error("فشل جلب item_id من جدول items: " + itemsError.message);

      const itemIdMap: Record<string, string> = {};
      for (const item of (itemsData || [])) {
        itemIdMap[item.item_code] = item.id;
      }

      // 9. بناء تفاصيل الإدراج مع item_id
      const detailsToInsert = [];
      for (const code of itemCodes) {
        const item = itemMap[code];
        detailsToInsert.push({
          runsheet_id: rsInsert.id,
          item_id: itemIdMap[code] || null,
          item_code: item.item_code,
          item_name: item.item_name,
          unit: item.unit,
          unit_price: item.unit_price,
          qty_ordered: item.qty_ordered
        });
      }

      // 10. إدراج التفاصيل دفعة واحدة (Bulk Insert)
      const { error: insertError } = await supabase
        .from("run_sheet_details")
        .insert(detailsToInsert);

      if (insertError) throw new Error("فشل إدراج تفاصيل الرانشيت: " + insertError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        rsId: newCode,
        ordersCount: ordersData.length,
        itemsCount: itemCodes.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    const errOrigin = req.headers.get("Origin") || "*";
    return new Response(
      JSON.stringify({ success: false, msg: error.message }),
      {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": errOrigin,
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
          "Content-Type": "application/json"
        }
      }
    );
  }
});
