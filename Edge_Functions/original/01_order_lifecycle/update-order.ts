import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

var supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
}

serve(async function(req) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    var rawBody = await req.text()
    console.log("📥 update-order – rawBody:", rawBody)
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var order_code = body.order_code
    var orderHeader = body.orderHeader
    var itemsList = body.itemsList
    var branchCode = body.branchCode

    if (!order_code || !orderHeader || !itemsList || !itemsList.length) {
      throw new Error("البيانات غير مكتملة")
    }

    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var authResult = await supabase.auth.getUser(token)
    if (authResult.error || !authResult.data.user) throw new Error("جلسة غير صالحة")
    var user = authResult.data.user

    var orderResult = await supabase.from("orders")
      .select("*")
      .eq("order_code", order_code)
      .maybeSingle()
    if (orderResult.error || !orderResult.data) throw new Error("الأوردر غير موجود")
    var order = orderResult.data

    if (order.order_status !== "Draft" && order.order_status !== "Confirmed") {
      throw new Error("لا يمكن تعديل أوردر في حالة: " + order.order_status)
    }
    if (order.runsheet_id) {
      throw new Error("لا يمكن تعديل أوردر مرتبط برانشيت")
    }

    var customerUuid = order.customer_id
    if (orderHeader.customer_code) {
      var custRes = await supabase.from("customers")
        .select("id")
        .eq("customer_code", orderHeader.customer_code)
        .maybeSingle()
      if (custRes.data) customerUuid = custRes.data.id
    }

    var branchUuid = order.branch_id
    if (branchCode) {
      var branchRes = await supabase.from("branches")
        .select("id")
        .eq("branch_code", branchCode)
        .maybeSingle()
      if (branchRes.data) branchUuid = branchRes.data.id
    }

    var updateResult = await supabase.from("orders").update({
      customer_id: customerUuid,
      customer_name: orderHeader.custName || order.customer_name,
      area: orderHeader.area || order.area,
      total_amount: orderHeader.total,
      original_total_amount: orderHeader.total,
      delivery_fee: orderHeader.deliveryFees || 0,
      payment_type: orderHeader.paymentType || order.payment_type,
      branch_id: branchUuid,
      customer_phone: orderHeader.customerPhone || order.customer_phone,
      customer_email: orderHeader.customerEmail || order.customer_email,
      notes: orderHeader.notes || order.notes
    }).eq("order_code", order_code)

    if (updateResult.error) throw new Error("فشل تحديث رأس الأوردر: " + updateResult.error.message)

    var deleteDetailsResult = await supabase.from("order_details")
      .delete()
      .eq("order_id", order.id)
    if (deleteDetailsResult.error) throw new Error("فشل حذف التفاصيل القديمة: " + deleteDetailsResult.error.message)

    for (var i = 0; i < itemsList.length; i++) {
      var item = itemsList[i]
      var itemRes = await supabase.from("items")
        .select("id")
        .eq("item_code", item.code)
        .maybeSingle()
      var itemId = itemRes && itemRes.data ? itemRes.data.id : null

      await supabase.from("order_details").insert({
        order_id: order.id,
        item_id: itemId,
        item_code: item.code,
        item_name: item.name,
        unit: item.unit || "حبة",
        unit_price: item.price,
        qty: item.qty
      })
    }

    await supabase.from("audit_log").insert({
      user_email: user.email,
      action: "update_order",
      table_name: "orders",
      record_id: order_code,
      old_data: { total_amount: order.total_amount, customer_id: order.customer_id },
      new_data: { total_amount: orderHeader.total, customer_id: customerUuid }
    })

    console.log("✅ Order updated:", order_code)
    return new Response(JSON.stringify({ success: true, msg: "تم تحديث الأوردر", orderID: order_code }), {
      headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
    })

  } catch (error) {
    console.error("❌ update-order error:", error.message)
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400,
      headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
    })
  }
})
