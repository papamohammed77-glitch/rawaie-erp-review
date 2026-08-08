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
    const { customer, isEdit, customer_code } = await req.json();
    if (!customer || !customer.name) throw new Error("اسم العميل مطلوب");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("جلسة غير صالحة");

    const custData: any = {
        name: customer.name, phone: customer.phone || null, area: customer.area || null,
        location: customer.location || null, customer_type: customer.customer_type || 'عادي',
        payment_type: customer.payment_type || 'نقدي', debt: Number(customer.debt) || 0,
        visit_day: customer.visit_day || null, contact_person: customer.contact_person || null,
        notes: customer.notes || null, is_active: true,
        company_id: '00000000-0000-0000-0000-000000000001'
    };

    if (isEdit && customer_code) {
        const { error } = await supabase.from("customers").update(custData).eq("customer_code", customer_code);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, action: 'updated' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
        const { data: maxCust } = await supabase.from("customers").select("customer_code").order("customer_code", { ascending: false }).limit(1);
        var newCode = "CUST-1001";
        if (maxCust && maxCust.length > 0) {
            var num = parseInt(maxCust[0].customer_code.replace("CUST-", "")) || 1000;
            newCode = "CUST-" + (num + 1);
        }
        custData.customer_code = newCode;
        const { error } = await supabase.from("customers").insert(custData);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, customer_code: newCode, action: 'created' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error: any) {
    const errOrigin = req.headers.get("Origin") || "*";
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": errOrigin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Content-Type": "application/json"
      }
    });
  }
});
