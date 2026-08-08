// save-category – إدارة التصنيفات (إضافة/تعديل/حذف)
// الإصدار 1.0 – fetch اليدوي (المادة 1)، var فقط

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
    console.log("📥 save-category – rawBody:", rawBody);

    var body = {};
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody); } catch (e) { throw new Error("صيغة JSON غير صالحة"); }
    }

    var action = body.action;
    var category_name = body.category_name;
    var category_id = body.category_id;
    var parent_id = body.parent_id || null;
    var image_url = body.image_url || null;
    var icon = body.icon || null;
    var replacement_category_id = body.replacement_category_id || null;

    if (!action) throw new Error("الإجراء (action) مطلوب");

    // مصادقة
    var authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    var token = authHeader.replace("Bearer ", "");
    var authResult = await supabase.auth.getUser(token);
    if (authResult.error || !authResult.data.user) throw new Error("جلسة غير صالحة");
    var user = authResult.data.user;

    // التحقق من الصلاحية – المالك يمر مباشرة
    var meta = user.user_metadata || {};
    var isOwner = (meta.isOwner === true || meta.isOwner === 'true' || meta.role === 'owner' || meta.role === 'مالك');

    if (!isOwner) {
      // للمستخدمين العاديين فقط – نتحقق من وجودهم في public.users وصلاحياتهم
      var pubUserResult = await supabase.from("users")
        .select("role, permissions")
        .eq("email", user.email)
        .maybeSingle();
      var pubUser = pubUserResult.data;
      if (!pubUser) throw new Error("المستخدم غير موجود في سجلات الموظفين");

      var perms = pubUser.permissions || [];
      var hasAccess = perms.indexOf('items') !== -1 || perms.indexOf('*') !== -1;
      if (!hasAccess) throw new Error("غير مصرح – تحتاج صلاحية إدارة الأصناف");
    }

    // ============ إنشاء ============
    if (action === "create") {
      if (!category_name || !category_name.trim()) throw new Error("اسم التصنيف مطلوب");

      var insertResult = await supabase.from("categories").insert({
        category_name: category_name.trim(),
        parent_id: parent_id,
        image_url: image_url,
        icon: icon,
        company_id: "00000000-0000-0000-0000-000000000001"
      }).select("id, category_name").single();

      if (insertResult.error) throw new Error("فشل إنشاء التصنيف: " + insertResult.error.message);

      console.log("✅ تم إنشاء التصنيف:", insertResult.data.category_name);
      return new Response(JSON.stringify({
        success: true,
        msg: "تم إنشاء التصنيف",
        category: insertResult.data
      }), { headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" }) });
    }

    // ============ تعديل ============
    if (action === "update") {
      if (!category_id) throw new Error("معرف التصنيف مطلوب");
      if (!category_name || !category_name.trim()) throw new Error("اسم التصنيف مطلوب");

      var oldNameResult = await supabase.from("categories")
        .select("category_name").eq("id", category_id).maybeSingle();
      if (!oldNameResult.data) throw new Error("التصنيف غير موجود");

      var oldName = oldNameResult.data.category_name;
      var newName = category_name.trim();

      var updateResult = await supabase.from("categories").update({
        category_name: newName,
        parent_id: parent_id,
        image_url: image_url,
        icon: icon
      }).eq("id", category_id);

      if (updateResult.error) throw new Error("فشل تعديل التصنيف: " + updateResult.error.message);

      // مزامنة الاسم الجديد إلى جميع الأصناف المرتبطة
      if (oldName !== newName) {
        var syncResult = await supabase.from("items").update({
          category: newName
        }).eq("category_id", category_id);

        if (syncResult.error) {
          console.warn("⚠️ فشل مزامنة الأصناف:", syncResult.error.message);
        } else {
          console.log("✅ تم تحديث اسم التصنيف في الأصناف المرتبطة");
        }
      }

      console.log("✅ تم تعديل التصنيف:", newName);
      return new Response(JSON.stringify({
        success: true,
        msg: "تم تعديل التصنيف"
      }), { headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" }) });
    }

    // ============ حذف ============
    if (action === "delete") {
      if (!category_id) throw new Error("معرف التصنيف مطلوب");

      var itemsCheck = await supabase.from("items")
        .select("id, item_code, name")
        .eq("category_id", category_id)
        .limit(1);

      if (itemsCheck.data && itemsCheck.data.length > 0) {
        if (!replacement_category_id) {
          throw new Error("لا يمكن حذف التصنيف لوجود أصناف مرتبطة به. حدد تصنيفًا بديلاً.");
        }

        var replacementCheck = await supabase.from("categories")
          .select("id, category_name").eq("id", replacement_category_id).maybeSingle();
        if (!replacementCheck.data) throw new Error("التصنيف البديل غير موجود");

        var moveResult = await supabase.from("items").update({
          category_id: replacement_category_id,
          category: replacementCheck.data.category_name
        }).eq("category_id", category_id);

        if (moveResult.error) throw new Error("فشل نقل الأصناف: " + moveResult.error.message);
        console.log("✅ تم نقل الأصناف إلى التصنيف البديل:", replacementCheck.data.category_name);
      }

      var deleteResult = await supabase.from("categories").delete().eq("id", category_id);
      if (deleteResult.error) throw new Error("فشل حذف التصنيف: " + deleteResult.error.message);

      console.log("✅ تم حذف التصنيف");
      return new Response(JSON.stringify({
        success: true,
        msg: "تم حذف التصنيف"
      }), { headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" }) });
    }

    throw new Error("إجراء غير معروف: " + action);

  } catch (error) {
    console.error("❌ Error:", error.message);
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400,
      headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
    });
  }
});
