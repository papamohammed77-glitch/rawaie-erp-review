import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    var body = await req.json();
    var orderHeader = body.orderHeader;
    var itemsList = body.itemsList;
    var branchCode = body.branchCode;

    if (!orderHeader || !itemsList || !itemsList.length) {
      return new Response(JSON.stringify({ success: false, msg: 'بيانات الفاتورة غير مكتملة' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    var authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, msg: 'غير مصرح' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    var token = authHeader.replace("Bearer ", "");
    var userRes = await supabase.auth.getUser(token);
    if (userRes.error || !userRes.data.user) {
      return new Response(JSON.stringify({ success: false, msg: 'جلسة غير صالحة' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    var user = userRes.data.user;

    // 1. تحويل customer_code إلى UUID
    var customerUuid = null;
    if (orderHeader.customer_code) {
      var custRes = await supabase
        .from("customers")
        .select("id")
        .eq("customer_code", orderHeader.customer_code)
        .maybeSingle();
      if (custRes.data) customerUuid = custRes.data.id;
    }

    // 2. تحويل branchCode إلى UUID
    var branchUuid = null;
    var code = branchCode || "MAIN";
    var branchRes = await supabase
      .from("branches")
      .select("id")
      .eq("branch_code", code)
      .maybeSingle();
    if (branchRes.data) branchUuid = branchRes.data.id;

    var now = new Date().toISOString();

    // 3. الحصول على الرقم التسلسلي مباشرة من آخر أوردر
    var lastOrderRes = await supabase
      .from("orders")
      .select("order_code")
      .order("created_at", { ascending: false })
      .limit(1);

    var nextSerial = 1001;
    if (lastOrderRes && lastOrderRes.data && lastOrderRes.data.length > 0) {
      var lastCode = lastOrderRes.data[0].order_code;
      var match = lastCode.match(/ORD-(\d+)/);
      if (match) {
        nextSerial = parseInt(match[1], 10) + 1;
      }
    }

    var orderCode = "ORD-" + nextSerial;
    var total = orderHeader.total;
    var orderStatus = orderHeader.status || "Confirmed";

    // 4. إنشاء رأس الأوردر
    var orderInsert = await supabase
      .from("orders")
      .insert({
        order_code: orderCode,
        order_date: now.split("T")[0],
        customer_id: customerUuid,
        customer_name: orderHeader.custName,
        area: orderHeader.area || "",
        total_amount: total,
        original_total_amount: total,
        delivery_fee: orderHeader.deliveryFees || 0,
        order_status: orderStatus,
        payment_type: orderHeader.paymentType || "أجل",
        branch_id: branchUuid,
        created_by: user.email,
        source: orderHeader.source || 'pos',
        customer_phone: orderHeader.customerPhone || null,
        customer_email: orderHeader.customerEmail || null,
        coupon_code: orderHeader.couponCode || null,
        discount_amount: orderHeader.discountAmount || 0,
        notes: orderHeader.notes || null,
        company_id: "00000000-0000-0000-0000-000000000001"
      })
      .select("id")
      .single();

    if (!orderInsert || !orderInsert.data) {
      return new Response(JSON.stringify({ success: false, msg: 'فشل إنشاء الأوردر' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    var orderId = orderInsert.data.id;

    // 5. إنشاء تفاصيل الأوردر
    for (var i = 0; i < itemsList.length; i++) {
      var item = itemsList[i];

      var itemRes = await supabase
        .from("items")
        .select("id")
        .eq("item_code", item.code)
        .maybeSingle();

      var itemId = itemRes && itemRes.data ? itemRes.data.id : null;

      await supabase
        .from("order_details")
        .insert({
          order_id: orderId,
          item_id: itemId,
          item_code: item.code,
          item_name: item.name,
          unit: item.unit || "حبة",
          unit_price: item.price,
          qty: item.qty
        });
    }

    // 5.5. إذا كانت الفاتورة Invoiced (POS / بيع مباشر) ← خصم المخزون + قيد محاسبي
    // يدعم: POS العادي، Van Sales (فروع VAN-)
    if (orderStatus === "Invoiced") {
      var mainBranchId = branchUuid;
      if (!mainBranchId) {
        var settingsRes = await supabase
          .from("app_settings")
          .select("main_branch_id")
          .limit(1)
          .single();
        if (settingsRes.data) mainBranchId = settingsRes.data.main_branch_id;
      }

      var isVanSale = (branchCode && typeof branchCode === 'string' && branchCode.indexOf('VAN-') === 0);
      var vanBranchId = isVanSale ? branchUuid : null;
      var totalCostOfGoods = 0;

      for (var j = 0; j < itemsList.length; j++) {
        var invItem = itemsList[j];
        var invQty = Number(invItem.qty) || 0;
        if (invQty <= 0) continue;

        var invItemRes = await supabase
          .from("items")
          .select("id, cost_price")
          .eq("item_code", invItem.code)
          .maybeSingle();
        var invItemId = invItemRes?.data?.id || null;
        var costPrice = Number(invItemRes?.data?.cost_price) || 0;

        // (أ) خصم المخزون من الفرع الرئيسي
        var stockResult = await supabase
          .from("stock_branches")
          .select("qty, allocated_qty")
          .eq("branch_id", mainBranchId)
          .eq("item_id", invItemId)
          .maybeSingle();

        var currentQty = Number(stockResult?.data?.qty || 0);
        var currentAllocated = Number(stockResult?.data?.allocated_qty || 0);
        var newQty = currentQty - invQty;
        if (newQty < 0) newQty = 0;

        if (currentAllocated > 0) {
          var releaseQty = Math.min(currentAllocated, invQty);
          await supabase
            .from("stock_branches")
            .update({ allocated_qty: currentAllocated - releaseQty })
            .eq("branch_id", mainBranchId)
            .eq("item_id", invItemId);
        }

        await supabase
          .from("stock_branches")
          .update({ qty: newQty })
          .eq("branch_id", mainBranchId)
          .eq("item_id", invItemId);

        var mainLogCode = "POS-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
        await supabase.from("inventory_log").insert({
          company_id: "00000000-0000-0000-0000-000000000001",
          log_code: mainLogCode,
          movement_date: new Date().toISOString().split("T")[0],
          voucher_id: orderCode,
          item_id: invItemId,
          item_code: invItem.code,
          item_name: invItem.name,
          movement_type: "POS_Sale",
          qty: invQty,
          reference: orderCode,
          user_email: user.email
        });

        // (ب) خصم إضافي من فرع المندوب (Van Sales)
        if (isVanSale && vanBranchId) {
          var vanStockRes = await supabase
            .from("stock_branches")
            .select("qty")
            .eq("branch_id", vanBranchId)
            .eq("item_id", invItemId)
            .maybeSingle();

          var vanCurrentQty = Number(vanStockRes?.data?.qty || 0);
          var vanNewQty = Math.max(0, vanCurrentQty - invQty);

          await supabase
            .from("stock_branches")
            .update({ qty: vanNewQty })
            .eq("branch_id", vanBranchId)
            .eq("item_id", invItemId);

          var vanLogCode = "VAN-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
          await supabase.from("inventory_log").insert({
            company_id: "00000000-0000-0000-0000-000000000001",
            log_code: vanLogCode,
            movement_date: new Date().toISOString().split("T")[0],
            voucher_id: orderCode,
            item_id: invItemId,
            item_code: invItem.code,
            item_name: invItem.name,
            movement_type: "VanSale",
            qty: invQty,
            reference: orderCode,
            user_email: user.email
          });
        }

        totalCostOfGoods += invQty * costPrice;
      }

      // (ج) إنشاء قيد محاسبي
      if (total > 0) {
        var entryCode = "JE-POS-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
        var isCash = orderHeader.paymentType === "نقدي";
        var entryResult = await supabase
          .from("journal_entries")
          .insert({
            company_id: "00000000-0000-0000-0000-000000000001",
            entry_code: entryCode,
            entry_date: new Date().toISOString().split("T")[0],
            reference: orderCode,
            description: "فاتورة نقطة بيع – " + orderCode + (isVanSale ? " (Van Sales)" : ""),
            entry_type: isVanSale ? "VanSales" : "POS_Sale",
            status: "Posted",
            created_by: user.email,
            posting_date: new Date().toISOString()
          })
          .select("id")
          .single();

        if (entryResult.data) {
          await supabase.from("journal_lines").insert([
            {
              entry_id: entryResult.data.id,
              account_id: isCash ? "121" : (customerUuid || "123"),
              account_name: isCash ? "الخزينة" : (orderHeader.custName || "العميل"),
              debit: total,
              credit: 0
            },
            {
              entry_id: entryResult.data.id,
              account_id: "41",
              account_name: "إيرادات المبيعات",
              debit: 0,
              credit: total
            }
          ]);

          if (totalCostOfGoods > 0) {
            await supabase.from("journal_lines").insert([
              {
                entry_id: entryResult.data.id,
                account_id: "51",
                account_name: "تكلفة المبيعات",
                debit: totalCostOfGoods,
                credit: 0
              },
              {
                entry_id: entryResult.data.id,
                account_id: "124",
                account_name: "المخزون السلعي",
                debit: 0,
                credit: totalCostOfGoods
              }
            ]);
          }
        }
      }

      // تحديث customer_ledger للفواتير الآجلة
      if (!isCash && customerUuid) {
        var ledgerResult = await supabase
          .from("customer_ledger")
          .select("balance")
          .eq("customer_id", customerUuid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        var previousBalance = Number(ledgerResult?.data?.balance || 0);
        var newBalance = previousBalance + total;

        await supabase.from("customer_ledger").insert({
          customer_id: customerUuid,
          entry_date: new Date().toISOString().split("T")[0],
          reference: orderCode,
          description: "فاتورة نقطة بيع – " + orderCode,
          debit: total,
          credit: 0,
          balance: newBalance,
          due_date: new Date().toISOString().split("T")[0],
          user_email: user.email
        });
      }

      // 🆕 P1: تسجيل مديونية على المندوب في driver_ledger (للبيع الآجل من Van Sales)
      if (isVanSale && !isCash) {
        await supabase.from("driver_ledger").insert({
          driver_email: user.email,
          entry_date: new Date().toISOString().split("T")[0],
          description: "بيع آجل – " + orderCode + " (" + (orderHeader.custName || "عميل") + ")",
          debit: total,
          credit: 0,
          reference: orderCode
        });
      }
    }

    // 6. تحديث order_serial في app_settings
    var settingsRes = await supabase
      .from("app_settings")
      .select("id")
      .limit(1)
      .single();

    if (settingsRes && settingsRes.data && settingsRes.data.id) {
      await supabase
        .from("app_settings")
        .update({ order_serial: nextSerial })
        .eq("id", settingsRes.data.id);
    }

    return new Response(JSON.stringify({ success: true, orderID: orderCode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
