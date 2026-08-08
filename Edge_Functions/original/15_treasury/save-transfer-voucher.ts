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
    const { fromCashId, toCashId, amount, notes } = await req.json();
    if (!fromCashId || !toCashId || !amount) throw new Error("البيانات غير مكتملة");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("جلسة غير صالحة");

    const refNumber = "TRF-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const now = new Date();

    await supabase.from("cash_box").insert([
      { voucher_code: refNumber, voucher_date: now.toISOString().split("T")[0], treasury_id: fromCashId, type: "Transfer-Out", amount, reference: refNumber, notes: notes || "", status: "Active", user_email: user.email, company_id: "00000000-0000-0000-0000-000000000001" },
      { voucher_code: refNumber + "-IN", voucher_date: now.toISOString().split("T")[0], treasury_id: toCashId, type: "Transfer-In", amount, reference: refNumber, notes: notes || "", status: "Active", user_email: user.email, company_id: "00000000-0000-0000-0000-000000000001" }
    ]);

    const entryCode = "JE-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const { data: entryInsert } = await supabase.from("journal_entries").insert({
      entry_code: entryCode, entry_date: now.toISOString().split("T")[0],
      reference: refNumber, description: notes || "تحويل نقدي",
      entry_type: "Transfer", status: "Posted", created_by: user.email,
      posting_date: now.toISOString(), company_id: "00000000-0000-0000-0000-000000000001"
    }).select("id").single();

    if (entryInsert) {
      await supabase.from("journal_lines").insert([
        { entry_id: entryInsert.id, account_id: toCashId, account_name: toCashId, debit: amount, credit: 0 },
        { entry_id: entryInsert.id, account_id: fromCashId, account_name: fromCashId, debit: 0, credit: amount }
      ]);
    }

    // ✅ المادة 29: تحديث رصيد الخزينة المصدر (خصم)
    var { data: fromTreasury } = await supabase.from("treasury")
        .select("current_balance")
        .eq("account_code", fromCashId)
        .maybeSingle();
    var fromBalance = Number(fromTreasury?.current_balance) || 0;
    var newFromBalance = Math.max(0, fromBalance - amount);
    var { error: updateFromError } = await supabase.from("treasury")
        .update({ current_balance: newFromBalance })
        .eq("account_code", fromCashId);
    if (updateFromError) {
        console.warn("⚠️ فشل تحديث رصيد الخزينة المصدر:", updateFromError.message);
    }

    // ✅ المادة 29: تحديث رصيد الخزينة الهدف (إضافة)
    var { data: toTreasury } = await supabase.from("treasury")
        .select("current_balance")
        .eq("account_code", toCashId)
        .maybeSingle();
    var toBalance = Number(toTreasury?.current_balance) || 0;
    var newToBalance = toBalance + amount;
    var { error: updateToError } = await supabase.from("treasury")
        .update({ current_balance: newToBalance })
        .eq("account_code", toCashId);
    if (updateToError) {
        console.warn("⚠️ فشل تحديث رصيد الخزينة الهدف:", updateToError.message);
    }

    return new Response(JSON.stringify({ success: true, refNumber }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
