// save-item – إنشاء/تعديل صنف مع category_id
// الإصدار 2.0 – console.log(rawBody)، var فقط، معالجة صورة
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
    console.log("📥 save-item – rawBody:", rawBody);
    
    var body = {};
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody); } catch (e) { throw new Error("صيغة JSON غير صالحة"); }
    }

    var item = body.item;
    var isEdit = body.isEdit;
    var item_code = body.item_code;
    var openingBranch = body.openingBranch;
    var openingQty = body.openingQty;

    if (!item || !item.name) throw new Error("اسم الصنف مطلوب");

    // مصادقة
    var authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    var token = authHeader.replace("Bearer ", "");
    var authResult = await supabase.auth.getUser(token);
    if (authResult.error || !authResult.data.user) throw new Error("جلسة غير صالحة");
    var user = authResult.data.user;

    var itemData = {
        name: item.name,
        barcode: item.barcode || null,
        category: item.category || null,
        unit: item.unit || 'حبة',
        alt_unit: item.alt_unit || null,
        alt_unit_qty: Number(item.alt_unit_qty) || 0,
        sales_price: Number(item.sales_price) || 0,
        old_price: Number(item.old_price) || 0,
        cost_price: Number(item.cost_price) || 0,
        weight_kg: Number(item.weight_kg) || 0,
        volume_m3: Number(item.volume_m3) || 0,
        reorder_point: Number(item.reorder_point) || 5,
        max_qty: Number(item.max_qty) || 0,
        description: item.description || null,
        image_url: item.image_url || null,
        is_active: item.is_active !== undefined ? item.is_active : true,
        show_in_store: item.show_in_store !== undefined ? item.show_in_store : true,
        discount_percent: Number(item.discount_percent) || 0,
        discount_start: item.discount_start || null,
        discount_end: item.discount_end || null,
        is_daily_deal: item.is_daily_deal !== undefined ? item.is_daily_deal : false,
        badge_text: item.badge_text || null,
        max_qty_per_order: Number(item.max_qty_per_order) || 0,
        sort_order: Number(item.sort_order) || 0,
        company_id: '00000000-0000-0000-0000-000000000001'
    };

    // دعم category_id – إذا تم إرساله، نملأ category النصي تلقائيًا
    if (item.category_id) {
      var catResult = await supabase.from("categories")
        .select("category_name")
        .eq("id", item.category_id)
        .maybeSingle();
      if (catResult.data) {
        itemData.category = catResult.data.category_name;
        itemData.category_id = item.category_id;
      }
    }

    console.log("📝 itemData:", JSON.stringify(itemData));

    if (isEdit && item_code) {
        var updateResult = await supabase.from("items").update(itemData).eq("item_code", item_code);
        if (updateResult.error) throw new Error("فشل تعديل الصنف: " + updateResult.error.message);
        console.log("✅ تم تعديل الصنف:", item_code);
        return new Response(JSON.stringify({ success: true, action: 'updated' }), {
          headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
        });
    } else {
        // توليد كود جديد
        var maxItemResult = await supabase.from("items").select("item_code").order("item_code", { ascending: false }).limit(1);
        var newCode = "ITM-1001";
        if (maxItemResult.data && maxItemResult.data.length > 0) {
            var num = parseInt(maxItemResult.data[0].item_code.replace("ITM-", "")) || 1000;
            newCode = "ITM-" + (num + 1);
        }
        itemData.item_code = newCode;

        console.log("🆕 إنشاء صنف جديد:", newCode);
        var insertResult = await supabase.from("items").insert(itemData).select("id, item_code, name, unit").single();
        if (insertResult.error) throw new Error("فشل إنشاء الصنف: " + insertResult.error.message);

        var newItem = insertResult.data;

        // إضافة رصيد افتتاحي
        if (openingBranch && openingQty > 0) {
            try {
                var branchResult = await supabase.from("branches").select("id").eq("branch_code", openingBranch).single();
                if (branchResult.data) {
                    await supabase.from("stock_branches").upsert(
                        { item_id: newItem.id, branch_id: branchResult.data.id, qty: openingQty, allocated_qty: 0 },
                        { onConflict: 'item_id, branch_id' }
                    );
                    console.log("✅ تم إضافة رصيد افتتاحي:", openingQty);
                }
            } catch(e) {
                console.error("⚠️ فشل إضافة الرصيد الافتتاحي:", e.message);
            }
        }

        console.log("✅ تم إنشاء الصنف:", newCode);
        return new Response(JSON.stringify({ success: true, item_code: newCode, action: 'created' }), {
          headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
        });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
    });
  }
});
