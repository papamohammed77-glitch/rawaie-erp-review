// receive-purchase – استلام أمر شراء وإضافة المخزون
// الإصدار 4.0.1 – إصلاح: استبدال Template Literals بدمج نصوص ES5
// الالتزام: var فقط، function فقط، fetch يدوي فقط

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
    console.log("📥 receive-purchase v4.0.1 – rawBody:", rawBody)
    var body = {}
    if (rawBody && rawBody.trim() !== "") {
      try { body = JSON.parse(rawBody) } catch (e) { throw new Error("صيغة JSON غير صالحة") }
    }

    var po_code = body.po_code
    var itemsReceived = body.itemsReceived
    var notes = body.notes
    if (!po_code || !itemsReceived || !itemsReceived.length) throw new Error("البيانات غير مكتملة")

    // مصادقة
    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var authResult = await supabase.auth.getUser(token)
    if (authResult.error || !authResult.data.user) throw new Error("جلسة غير صالحة")
    var user = authResult.data.user

    // جلب public.users.id
    var pubUserResult = await supabase.from("users")
      .select("id, name")
      .eq("email", user.email)
      .maybeSingle()
    var responsibleName = pubUserResult.data ? (pubUserResult.data.name || user.email) : user.email

    // جلب main_branch_id من الإعدادات
    var settingsResult = await supabase.from("app_settings")
      .select("main_branch_id").limit(1).maybeSingle()
    if (!settingsResult.data || !settingsResult.data.main_branch_id) throw new Error("الفرع الرئيسي غير محدد في الإعدادات")
    var mainBranchId = settingsResult.data.main_branch_id

    // جلب أمر الشراء
    var poResult = await supabase.from("purchase_orders")
      .select("id, status, supplier_id, supplier_name, company_id")
      .eq("po_code", po_code)
      .maybeSingle()
    if (poResult.error || !poResult.data) throw new Error("أمر الشراء غير موجود")
    var po = poResult.data

    var companyId =
    po.company_id
    
    var totalReceivedValue = 0

    // 🆕 ١. إنشاء سجل عملية الاستلام في receiving
    var now = new Date()
    var operationId = "REC-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
    var receivingResult = await supabase.from("receiving").insert({
      operation_id: operationId,
      date: now.toISOString().split("T")[0],
      po_number: po_code,
      responsible: responsibleName,
      start_time: now.toISOString(),
      end_time: now.toISOString(),
      status: "مكتمل",
      company_id: companyId
    }).select("id").single()

    if (receivingResult.error) {
      console.warn("⚠️ فشل إنشاء سجل receiving:", receivingResult.error.message)
    }

    // إضافة الكميات المستلمة إلى المخزون
    for (var i = 0; i < itemsReceived.length; i++) {
      var item = itemsReceived[i]
      var receivedQty = Number(item.receivedQty) || 0
      if (receivedQty <= 0) continue

      // جلب item_id من items
      var itemResult = await supabase.from("items")
        .select("id").eq("item_code", item.itemCode).maybeSingle()
      if (!itemResult.data) throw new Error("الصنف غير موجود: " + item.itemCode)
      var itemId = itemResult.data.id

      // جلب qty_expected من purchase_order_details
      var poDetailResult = await supabase.from("purchase_order_details")
        .select("qty_ordered, unit_price , qty_received")
        .eq("po_id", po.id)
        .eq("item_code", item.itemCode)
        .maybeSingle()

      if (!poDetailResult.data) {
        throw new Error(
          "الصنف " +
          item.itemCode +
          " غير موجود داخل أمر الشراء " +
          po_code
        )
      }
      var qtyExpected = Number(poDetailResult.data?.qty_ordered) || 0
      var unitPrice = Number(poDetailResult.data?.unit_price) || 0
      var difference = receivedQty - qtyExpected

      // تحديث stock_branches
      var stockResult = await supabase
        .from("stock_branches")
        .select("qty, allocated_qty")
        .eq("branch_id", mainBranchId)
        .eq("item_id", itemId)
        .maybeSingle()
if (
  stockResult.error
) {
  throw new Error(
    stockResult.error.message
  )
}

      var currentQty =
        Number(stockResult.data?.qty || 0)

      var allocatedQty =
        Number(stockResult.data?.allocated_qty || 0)

      var newQty =
        currentQty + receivedQty

      var newAvailableQty =
          newQty - allocatedQty

      var stockError =
        await supabase
          .from("stock_branches")
          .upsert(
            {
              branch_id: mainBranchId,
              item_id: itemId,
              qty: newQty,
              allocated_qty: allocatedQty,
              available_qty: newAvailableQty
            },
            {
              onConflict:
                "branch_id,item_id"
            }
          )

      if (stockError.error) {
        throw new Error(
          "فشل تحديث المخزون لـ " +
          item.itemCode +
          ": " +
          stockError.error.message
        )
      }

      // 🆕 ٢. إدراج تفاصيل الاستلام في receiving_details
      if (receivingResult.data) {
        var reasonText = item.reason || ""
        if (receivedQty < qtyExpected && !reasonText) {
          reasonText = "نقص في الاستلام"
        } else if (receivedQty > qtyExpected && !reasonText) {
          reasonText = "زيادة في الاستلام"
        }

        await supabase.from("receiving_details").insert({
          operation_id: operationId,
          item_code: item.itemCode,
          item_name: item.itemName || item.itemCode,
          unit: item.unit || "حبة",
          qty_expected: qtyExpected,
          qty_received: receivedQty,
          difference: difference,
          reason: reasonText || null
        })
      }

      // تجميع قيمة المخزون للقيد المحاسبي
      totalReceivedValue += receivedQty * unitPrice

      var previousReceived =
        Number(
          poDetailResult.data.qty_received || 0
        )

      var totalReceived =
        previousReceived + receivedQty

      await supabase
        .from("purchase_order_details")
        .update({
          qty_received: totalReceived
        })
        .eq("po_id", po.id)
        .eq("item_code", item.itemCode)

      // كتابة inventory_log – استلام بضاعة
      var logCode = "RCV-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
      await supabase.from("inventory_log").insert({
        company_id: companyId,
        log_code: logCode,
        movement_date: now.toISOString().split("T")[0],
        voucher_id: po_code,
        item_id: itemId,
        item_code: item.itemCode,
        item_name: item.itemName || item.itemCode,
        movement_type: "Purchase",
        qty: receivedQty,
        reference: po_code,
        user_email: user.email
      })
    }

    // إنشاء قيد محاسبي – مدين المخزون، دائن المورد
var supplierControlAccount =
  await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("account_code", "211")
    .eq("company_id", companyId)
    .maybeSingle()
if (
  supplierControlAccount.error
) {
  throw new Error(
    supplierControlAccount.error.message
  )
}

if (
  !supplierControlAccount.data
) {
  throw new Error(
    "حساب الموردين 211 غير موجود"
  )
}
var inventoryAccount =
  await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("account_code", "124")
    .eq("company_id", companyId)
    .maybeSingle()
if (
  inventoryAccount.error
) {
  throw new Error(
    inventoryAccount.error.message
  )
}

if (
  !inventoryAccount.data
) {
  throw new Error(
    "حساب المخزون 124 غير موجود"
  )
}   
 if (totalReceivedValue > 0) {
      var entryCode = "JE-RCV-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
      var entryResult = await supabase.from("journal_entries").insert({
        company_id: companyId,
        entry_code: entryCode,
        entry_date: now.toISOString().split("T")[0],
        reference: po_code,
        description: "استلام بضاعة – أمر الشراء " + po_code,
        entry_type: "PurchaseReceiving",
        status: "Posted",
        created_by: user.email,
        posting_date: now.toISOString()
      }).select("id").single()

if (
  entryResult.error
) {
  throw new Error(
    entryResult.error.message
  )
}

      if (entryResult.data) {
        var journalLinesResult =
  await supabase
    .from("journal_lines")
    .insert([
          {
            entry_id: entryResult.data.id,
            account_id:
  inventoryAccount.data.id,
            account_name: "المخزون السلعي",
            debit: totalReceivedValue,
            credit: 0
          },
          {
            entry_id: entryResult.data.id,
            account_id: supplierControlAccount.data.id,
            account_name: "الموردون (ذمم دائنة)",
            debit: 0,
            credit: totalReceivedValue
          }
        ])
if (
  journalLinesResult.error
) {
  throw new Error(
    journalLinesResult.error.message
  )
}
        console.log("✅ قيد استلام البضاعة:", entryCode, "بقيمة:", totalReceivedValue)
    if (
      totalReceivedValue > 0 &&
      po.supplier_id
    ) {

      var lastLedger =
        await supabase
          .from("supplier_ledger")
          .select("balance")
          .eq(
            "supplier_id",
            po.supplier_id
          )
          .order(
            "created_at",
            { ascending: false }
          )
          .limit(1)
          .maybeSingle()
if (
  lastLedger.error
) {
  throw new Error(
    lastLedger.error.message
  )
}

      var previousBalance =
        Number(
          lastLedger.data?.balance || 0
        )

      var supplierLedgerResult =
      await supabase
        .from("supplier_ledger")
        .insert({
          supplier_id:
            po.supplier_id,

          entry_date:
            now.toISOString()
              .split("T")[0],

          reference:
            po_code,

          description:
            "استلام بضاعة - " +
            po_code,

          debit: 0,

          credit:
            totalReceivedValue,

          balance:
            Number(previousBalance) +
  Number(totalReceivedValue),

          due_date:
            now.toISOString()
              .split("T")[0],

          user_email:
            user.email
        })
if (
  supplierLedgerResult.error
) {
  throw new Error(
    supplierLedgerResult.error.message
  )
}
    }

      }
    }

    // تحديد حالة أمر الشراء الجديدة
var detailsCheck =
  await supabase
    .from("purchase_order_details")
    .select(
      "qty_ordered,qty_received"
    )
    .eq("po_id", po.id)
if (
  detailsCheck.error
) {
  throw new Error(
    detailsCheck.error.message
  )
}

if (
  !detailsCheck.data ||
  !detailsCheck.data.length
) {
  throw new Error(
    "لا توجد تفاصيل لأمر الشراء"
  )
}

var allReceived = true

for (
  var j = 0;
  j < detailsCheck.data.length;
  j++
) {
  var row =
    detailsCheck.data[j]

  if (
    Number(row.qty_received || 0)
    <
    Number(row.qty_ordered || 0)
  ) {
    allReceived = false
    break
  }
}
    await supabase.from("purchase_orders").update({
      status: allReceived ? "Received" : "Partially Received"
    }).eq("id", po.id)

    console.log("✅ Purchase received:", po_code, "| سجل الاستلام:", operationId)
    return new Response(JSON.stringify({
      success: true,
      msg: "تم استلام البضاعة",
      operationId: operationId
    }), {
      headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
    })

  } catch (error) {
    console.error("❌ Error:", error.message)
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400,
      headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" })
    })
  }
})
