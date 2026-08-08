// report-discrepancy – الإبلاغ عن اختلاف في المرتجعات
// يدعم: زيادة، نقص، صنف مختلف، سبب آخر
// ✅ جديد: دعم actual_item_code, expected_item_code, actual_item_name, expected_item_name

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  // معالجة طلب OPTIONS (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // 1. قراءة الطلب
    var rawBody = await req.text()
    console.log("🚀 report-discrepancy called")
    console.log("📥 Raw body:", rawBody)

    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try {
        body = JSON.parse(rawBody)
      } catch (e) {
        throw new Error("صيغة JSON غير صالحة")
      }
    }

    // 2. استخراج البيانات الأساسية
    var runsheet_id = body.runsheet_id
    var item_code = body.item_code
    var item_name = body.item_name || ''
    var expected_qty = body.expected_qty
    var actual_qty = body.actual_qty
    var difference_qty = body.difference_qty
    var discrepancy_type = body.discrepancy_type || 'other'
    var notes = body.notes || ''

    // ✅ جديد: استخراج الحقول الجديدة (لـ "صنف مختلف")
    var actual_item_code = body.actual_item_code || null
    var expected_item_code = body.expected_item_code || null
    var actual_item_name = body.actual_item_name || null
    var expected_item_name = body.expected_item_name || null

    // 4. التحقق من البيانات المطلوبة
    if (!runsheet_id) {
      throw new Error("runsheet_id مطلوب")
    }
    if (!item_code) {
      throw new Error("item_code مطلوب")
    }
    if (expected_qty === undefined || expected_qty === null) {
      throw new Error("expected_qty مطلوب")
    }
    if (actual_qty === undefined || actual_qty === null) {
      throw new Error("actual_qty مطلوب")
    }

    // 5. المصادقة
    var authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      throw new Error("غير مصرح")
    }
    var token = authHeader.replace("Bearer ", "")
    var { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      throw new Error("جلسة غير صالحة")
    }
    console.log("👤 User:", user.email)

    // 6. جلب public.users.id
    var { data: pubUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", user.email)
      .maybeSingle()

    if (!pubUser) {
      throw new Error("المستخدم غير موجود في سجلات الموظفين")
    }

    // 7. التحقق من وجود الرانشيت
    var { data: rs, error: rsError } = await supabase
      .from("runsheets")
      .select("id, status")
      .eq("id", runsheet_id)
      .maybeSingle()

    if (rsError || !rs) {
      throw new Error("الرانشيت غير موجود")
    }

    if (rs.status !== "Returning") {
      throw new Error("لا يمكن الإبلاغ عن اختلاف إلا في رانشيت قيد المرتجعات")
    }

    // 8. التحقق من وجود الصنف في run_sheet_details
    var { data: detail, error: detailError } = await supabase
      .from("run_sheet_details")
      .select("id, qty_loaded, qty_delivered")
      .eq("runsheet_id", runsheet_id)
      .eq("item_code", item_code)
      .maybeSingle()

    if (detailError || !detail) {
      throw new Error("الصنف غير موجود في تفاصيل الرانشيت")
    }

    // ✅ جديد: في حالة "صنف مختلف"، تحقق من وجود الصنفين في items
    if (discrepancy_type === 'wrong_item') {
      if (!actual_item_code || !expected_item_code) {
        throw new Error("في حالة صنف مختلف، يجب تحديد الصنف الموجود والصنف المتوقع")
      }

      if (actual_item_code === expected_item_code) {
        throw new Error("الصنف الموجود والمتوقع لا يمكن أن يكونا متماثلين")
      }

      // التحقق من وجود actual_item_code في items
      var { data: actualItem, error: actualError } = await supabase
        .from("items")
        .select("item_code, name")
        .eq("item_code", actual_item_code)
        .maybeSingle()

      if (actualError || !actualItem) {
        throw new Error("الصنف الموجود غير موجود في قاعدة البيانات: " + actual_item_code)
      }

      // التحقق من وجود expected_item_code في items
      var { data: expectedItem, error: expectedError } = await supabase
        .from("items")
        .select("item_code, name")
        .eq("item_code", expected_item_code)
        .maybeSingle()

      if (expectedError || !expectedItem) {
        throw new Error("الصنف المتوقع غير موجود في قاعدة البيانات: " + expected_item_code)
      }

      // تحديث الأسماء إذا لم يتم تمريرها
      if (!actual_item_name) {
        actual_item_name = actualItem.name || actual_item_code
      }
      if (!expected_item_name) {
        expected_item_name = expectedItem.name || expected_item_code
      }
    }

    // 10. حساب difference_qty تلقائياً إذا لم يتم تمريره
    if (difference_qty === undefined || difference_qty === null) {
      difference_qty = Number(actual_qty) - Number(expected_qty)
    }

    // 11. تحديد discrepancy_type تلقائياً إذا لم يتم تمريره
    if (!discrepancy_type || discrepancy_type === 'other') {
      if (difference_qty > 0) {
        discrepancy_type = 'surplus'
      } else if (difference_qty < 0) {
        discrepancy_type = 'shortage'
      } else {
        discrepancy_type = 'other'
      }
    }

    // 12. التأكد من أن discrepancy_type من القيم المسموحة
    var validTypes = ['surplus', 'shortage', 'wrong_item', 'other']
    if (validTypes.indexOf(discrepancy_type) === -1) {
      throw new Error("نوع الاختلاف غير صحيح: " + discrepancy_type)
    }

    // 13. إنشاء سجل في stock_discrepancies
    var insertData = {
      runsheet_id: runsheet_id,
      item_code: item_code,
      item_name: item_name || item_code,
      expected_qty: Number(expected_qty),
      actual_qty: Number(actual_qty),
      difference_qty: Number(difference_qty),
      discrepancy_type: discrepancy_type,
      reported_by: pubUser.id,
      status: 'pending',
      notes: notes || null,
      company_id: "00000000-0000-0000-0000-000000000001"
    }

    // ✅ جديد: إضافة الحقول الجديدة إذا كانت موجودة
    if (actual_item_code) {
      insertData.actual_item_code = actual_item_code
    }
    if (expected_item_code) {
      insertData.expected_item_code = expected_item_code
    }
    if (actual_item_name) {
      insertData.actual_item_name = actual_item_name
    }
    if (expected_item_name) {
      insertData.expected_item_name = expected_item_name
    }

    console.log("📝 Inserting discrepancy:", JSON.stringify(insertData, null, 2))

    var { data: inserted, error: insertError } = await supabase
      .from("stock_discrepancies")
      .insert(insertData)
      .select("id")
      .single()

    if (insertError) {
      console.error("❌ Insert error:", insertError)
      throw new Error("فشل حفظ الاختلاف: " + insertError.message)
    }

    console.log("✅ Discrepancy reported:", item_code, "diff:", difference_qty, "type:", discrepancy_type)

    // 14. إنشاء سجل في audit_log
    try {
      await supabase.from("audit_log").insert({
        user_email: user.email,
        action: "report_discrepancy",
        table_name: "stock_discrepancies",
        record_id: inserted.id,
        new_data: insertData,
        ip_address: req.headers.get("x-forwarded-for") || null,
        user_agent: req.headers.get("user-agent") || null
      })
    } catch (auditError) {
      console.warn("⚠️ فشل تسجيل audit_log:", auditError.message)
    }

    // 15. إرجاع الرد
    return new Response(
      JSON.stringify({
        success: true,
        msg: "تم إبلاغ المشرف بالاختلاف",
        discrepancy_id: inserted.id,
        discrepancy_type: discrepancy_type,
        difference_qty: difference_qty
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )

  } catch (error) {
    console.error("❌ Error:", error.message)
    return new Response(
      JSON.stringify({
        success: false,
        msg: error.message
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )
  }
})
