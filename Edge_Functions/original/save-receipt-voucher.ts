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
    const { header, lines } = await req.json();
    if (!header || !lines || !lines.length) throw new Error("البيانات غير مكتملة");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("جلسة غير صالحة");

    var totalAmount = 0;
    for (var i = 0; i < lines.length; i++) { totalAmount += Number(lines[i].amount); }
    const refNumber = "RCV-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const now = new Date();

    const cashBoxResult = await supabase
  .from("cash_box")
  .insert({
      voucher_code: refNumber, voucher_date: now.toISOString().split("T")[0],
      treasury_id: header.cashBoxId || "CASH-01", type: "Receipt", amount: totalAmount,
      source_name: header.mainAccountName || "", reference: refNumber,
      notes: header.notes || "", status: "Active", user_email: user.email,
      company_id: "00000000-0000-0000-0000-000000000001"
    });
if (cashBoxResult.error) {
  throw new Error(
    "فشل إنشاء سند القبض: " +
    cashBoxResult.error.message
  );
}
    const entryCode = "JE-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const {
  data: entryInsert,
  error: entryError
} = await supabase
  .from("journal_entries")
  .insert({
    entry_code: entryCode,
    entry_date: now.toISOString().split("T")[0],
    reference: refNumber,
    description: header.notes || "سند قبض",
    entry_type: "Receipt",
    status: "Posted",
    created_by: user.email,
    posting_date: now.toISOString(),
    company_id: "00000000-0000-0000-0000-000000000001"
  })
  .select("id")
  .single();

if (entryError) {
  throw new Error(
    "فشل إنشاء القيد المحاسبي: " +
    entryError.message
  );
}

    if (entryInsert) {
      const linesResult = await supabase
  .from("journal_lines")
  .insert([

        { entry_id: entryInsert.id, account_id: header.cashBoxId || "CASH-01", account_name: "الخزينة", debit: totalAmount, credit: 0 },
        { entry_id: entryInsert.id, account_id: header.mainAccountId || "41", account_name: header.mainAccountName || "إيرادات", debit: 0, credit: totalAmount }
      ]); 
if (linesResult.error) {
  throw new Error(
    "فشل إنشاء أسطر القيد: " +
    linesResult.error.message
  );
}
    }

    const treasuryResult = await supabase
  .from("treasury")
  .select("current_balance")
  .eq("account_code", header.cashBoxId || "CASH-01")
  .single();

if (treasuryResult.error) {
  throw new Error("فشل جلب رصيد الخزينة");
}

const currentBalance =
  Number(treasuryResult.data.current_balance) || 0;

const updateTreasuryResult = await supabase
  .from("treasury")
  .update({
    current_balance: currentBalance + totalAmount
  })
  .eq("account_code", header.cashBoxId || "CASH-01");

if (updateTreasuryResult.error) {
  throw new Error("فشل تحديث رصيد الخزينة");
}

    // 🆕 P1: تسجيل دائن للمندوب في driver_ledger (تحصيل من عميل)
    if (header.collectedByDriverEmail) {
      const driverLedgerResult =
await supabase
.from("driver_ledger")
.insert({

        driver_email: header.collectedByDriverEmail,
        entry_date: now.toISOString().split("T")[0],
        description: "تحصيل نقدية – " + (header.mainAccountName || "عميل"),
        debit: 0,
        credit: totalAmount,
        reference: refNumber
      });
if (driverLedgerResult.error) {
  throw new Error(
    "فشل تحديث دفتر السائق: " +
    driverLedgerResult.error.message
  );
}
    }

    return new Response(JSON.stringify({ success: true, refNumber }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
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