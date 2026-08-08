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
    const { targetRSID, selectedOrders } = await req.json();
    if (!targetRSID || !selectedOrders?.length) throw new Error("البيانات غير مكتملة");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("جلسة غير صالحة");

    // 1. جلب الرانشيت
    const { data: rs, error: rsError } = await supabase
      .from("runsheets")
      .select("id, status")
      .eq("runsheet_code", targetRSID)
      .maybeSingle();
    if (rsError || !rs) throw new Error("الرانشيت غير موجود");
    if (!["Open", "Confirmed"].includes(rs.status)) throw new Error("الرانشيت غير مفتوح للإضافة");

    // 2. جلب الأوردرات كاملة (UUIDs) باستخدام الأكواد النصية
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, order_code, total_amount, runsheet_id, order_status")
      .in("order_code", selectedOrders);

    if (ordersError || !orders || orders.length === 0) {
      throw new Error("فشل جلب بيانات الأوردرات المحددة");
    }

    // 3. التحقق من صلاحية جميع الأوردرات (قبل أي تغيير)
    const orderUuids: string[] = [];
    for (const order of orders) {
      if (order.runsheet_id) throw new Error(`الأوردر ${order.order_code} مرتبط برانشيت آخر`);
      if (!["Confirmed", "Pending"].includes(order.order_status)) {
        throw new Error(`لا يمكن ضم الأوردر ${order.order_code} في حالته الحالية`);
      }
      orderUuids.push(order.id);
    }

    // 4. ✅ الإصلاح: جلب تفاصيل الأصناف باستخدام UUIDs (وليس الأكواد النصية)
    const { data: newDetails, error: detailsError } = await supabase
      .from("order_details")
      .select("item_code, item_name, unit, unit_price, qty")
      .in("order_id", orderUuids);  // <-- هنا التغيير الوحيد

    if (detailsError) throw new Error("فشل جلب تفاصيل الأصناف الجديدة: " + detailsError.message);

    // 5. تجميع الأصناف الجديدة
    const newItemMap: Record<string, any> = {};
    for (const det of (newDetails || [])) {
      const key = det.item_code;
      if (!newItemMap[key]) {
        newItemMap[key] = {
          item_code: det.item_code,
          item_name: det.item_name,
          unit: det.unit || "حبة",
          unit_price: det.unit_price,
          qty_ordered: 0
        };
      }
      newItemMap[key].qty_ordered += Number(det.qty) || 0;
    }

    // 6. جلب الأصناف الموجودة حالياً في الرانشيت
    const { data: existingItems } = await supabase
      .from("run_sheet_details")
      .select("id, item_code, qty_ordered")
      .eq("runsheet_id", rs.id);

    const existingMap: Record<string, any> = {};
    if (existingItems) {
      for (const ex of existingItems) {
        existingMap[ex.item_code] = { id: ex.id, qty_ordered: ex.qty_ordered || 0 };
      }
    }

    // 7. جلب item_id من جدول items
    const itemCodes = Object.keys(newItemMap);
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

      // 8. إضافة أو تحديث الأصناف في run_sheet_details
      for (const code of itemCodes) {
        const newItem = newItemMap[code];
        const itemId = itemIdMap[code] || null;
        
        if (existingMap[code]) {
          const newQty = (existingMap[code].qty_ordered || 0) + newItem.qty_ordered;
          await supabase
            .from("run_sheet_details")
            .update({ qty_ordered: newQty })
            .eq("id", existingMap[code].id);
        } else {
          await supabase.from("run_sheet_details").insert({
            runsheet_id: rs.id,
            item_id: itemId,
            item_code: newItem.item_code,
            item_name: newItem.item_name,
            unit: newItem.unit,
            unit_price: newItem.unit_price,
            qty_ordered: newItem.qty_ordered
          });
        }
      }
    }

    // 9. الآن نربط الأوردرات بالرانشيت (بعد نجاح كل شيء)
    let additionalAmount = 0;
    for (const order of orders) {
      additionalAmount += Number(order.total_amount) || 0;
      
      const { error: linkError } = await supabase
        .from("orders")
        .update({ runsheet_id: rs.id, order_status: "Pending" })
        .eq("id", order.id);
        
      if (linkError) throw new Error(`فشل ربط الأوردر ${order.order_code}: ${linkError.message}`);
    }

    // 10. تحديث إجمالي الرانشيت
    const { data: currentRS } = await supabase
      .from("runsheets")
      .select("total_amount")
      .eq("id", rs.id)
      .single();
    const newTotal = (Number(currentRS?.total_amount) || 0) + additionalAmount;
    await supabase
      .from("runsheets")
      .update({ total_amount: newTotal })
      .eq("id", rs.id);

    return new Response(JSON.stringify({ success: true, rsId: targetRSID }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
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
