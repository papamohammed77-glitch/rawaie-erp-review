// supabase/functions/bulk-stock-adjustment/index.ts
// Edge Function لتحديث الأرصدة بشكل جماعي (Bulk Stock Adjustment)
// الإصدار 1.1 – مُصحح: استخدام name بدلاً من item_name

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { branch_id, adjustment_type, voucher_code, reason, items } = body;

    if (!branch_id || !adjustment_type || !voucher_code || !reason || !items || !items.length) {
      throw new Error("البيانات غير مكتملة");
    }

    // 1. استخراج JWT المستخدم والتحقق من صلاحيته
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("مصادقة مطلوبة");
    const token = authHeader.replace("Bearer ", "");
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("جلسة غير صالحة");

    // التحقق من صلاحية المستخدم
    const { data: profile } = await supabaseAdmin.from("users").select("role, permissions").eq("email", user.email).maybeSingle();
    const isOwner = user.user_metadata?.isOwner === true || user.user_metadata?.isOwner === 'true';
    const hasPermission = isOwner || 
                          (profile?.role === 'مدير مخازن') || 
                          (profile?.role === 'مدير') || 
                          (profile?.permissions && profile.permissions.includes('stock_adjustment'));

    if (!hasPermission) {
      throw new Error("غير مصرح لك بتحديث الأرصدة");
    }

    // 2. جلب الأصناف دفعة واحدة (لتحسين الأداء)
    const itemCodes = items.map((i) => i.item_code);
    const { data: itemsData, error: itemsError } = await supabaseAdmin
      .from("items")
      .select("id, item_code, name") // ✅ الإصلاح: name بدلاً من item_name
      .in("item_code", itemCodes);

    if (itemsError) throw new Error("فشل جلب الأصناف: " + itemsError.message);

    const itemMap = {};
    for (const item of itemsData || []) {
      itemMap[item.item_code] = item;
    }

    // 3. جلب الأرصدة الحالية دفعة واحدة
    const itemIds = (itemsData || []).map((i) => i.id);
    const { data: stocks, error: stocksError } = await supabaseAdmin
      .from("stock_branches")
      .select("item_id, qty, allocated_qty")
      .eq("branch_id", branch_id)
      .in("item_id", itemIds);

    if (stocksError) throw new Error("فشل جلب الأرصدة: " + stocksError.message);

    const stockMap = {};
    for (const s of stocks || []) {
      stockMap[s.item_id] = s;
    }

    // 4. تنفيذ التحديثات
    const results = [];
    const logs = [];

    for (const inputItem of items) {
      const item = itemMap[inputItem.item_code];
      if (!item) {
        results.push({ item_code: inputItem.item_code, status: "error", message: "الصنف غير موجود" });
        continue;
      }

      const stock = stockMap[item.id] || { qty: 0, allocated_qty: 0 };
      const oldQty = Number(stock.qty) || 0;
      const alloc = Number(stock.allocated_qty) || 0;
      const inputQty = Number(inputItem.qty);

      let newQty;
      let diff;

      if (adjustment_type === "replace") {
        newQty = inputQty;
        diff = newQty - oldQty;
      } else if (adjustment_type === "add") {
        newQty = oldQty + inputQty;
        diff = inputQty;
      } else if (adjustment_type === "deduct") {
        newQty = oldQty - inputQty;
        diff = -inputQty;
      } else {
        results.push({ item_code: inputItem.item_code, status: "error", message: "نوع التحديث غير معروف" });
        continue;
      }

      if (newQty < 0) {
        results.push({ item_code: inputItem.item_code, status: "error", message: "الرصيد الناتج سالب" });
        continue;
      }

      // تحديث المخزون (qty فقط، لا نلمس allocated_qty)
      const { error: updateError } = await supabaseAdmin
        .from("stock_branches")
        .upsert({ branch_id, item_id: item.id, qty: newQty, allocated_qty: alloc }, { onConflict: "branch_id, item_id" });

      if (updateError) {
        results.push({ item_code: inputItem.item_code, status: "error", message: updateError.message });
        continue;
      }

      // تجهيز سجل inventory_log
      logs.push({
        log_code: "STK-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        movement_date: new Date().toISOString().split("T")[0],
        voucher_id: voucher_code,
        item_id: item.id,
        item_code: item.item_code,
        item_name: item.name || item.item_code, // ✅ الإصلاح: item.name بدلاً من item.item_name
        movement_type: "StockTake",
        qty: diff,
        reference: reason,
        user_email: user.email,
        company_id: "00000000-0000-0000-0000-000000000001"
      });

      results.push({ item_code: inputItem.item_code, status: "success", old_qty: oldQty, new_qty: newQty, diff: diff });
    }

    // 5. إدراج سجلات inventory_log
    if (logs.length > 0) {
      await supabaseAdmin.from("inventory_log").insert(logs);
    }

    return new Response(JSON.stringify({ success: true, results: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
