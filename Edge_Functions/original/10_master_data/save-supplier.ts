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
    const { supplier, isEdit, supplier_code } = await req.json();
    if (!supplier || !supplier.name) throw new Error("اسم المورد مطلوب");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("جلسة غير صالحة");

    const suppData: any = {
        name: supplier.name, phone: supplier.phone || null, area: supplier.area || null,
        address: supplier.address || null, supplier_type: supplier.supplier_type || 'مورد عام',
        payment_type: supplier.payment_type || 'نقدي', accounts_payable: Number(supplier.accounts_payable) || 0,
        contact_person: supplier.contact_person || null, purchase_rep: supplier.purchase_rep || null,
        notes: supplier.notes || null, is_active: true,
        company_id: '00000000-0000-0000-0000-000000000001'
    };

    if (isEdit && supplier_code) {
        const { error } = await supabase.from("suppliers").update(suppData).eq("supplier_code", supplier_code);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, action: 'updated' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
        const { data: maxSupp } = await supabase.from("suppliers").select("supplier_code").order("supplier_code", { ascending: false }).limit(1);
        var newCode = "SUPP-1001";
        if (maxSupp && maxSupp.length > 0) {
            var num = parseInt(maxSupp[0].supplier_code.replace("SUPP-", "")) || 1000;
            newCode = "SUPP-" + (num + 1);
        }
        suppData.supplier_code = newCode;
        const { error } = await supabase.from("suppliers").insert(suppData);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, supplier_code: newCode, action: 'created' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
