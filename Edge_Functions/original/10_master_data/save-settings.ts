import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const settings = await req.json()
    if (!settings) throw new Error("البيانات مطلوبة")

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error("جلسة غير صالحة")

    const { data: existing } = await supabase.from("app_settings").select("id").limit(1)

    const updateData: any = {}
    if (settings.delivery_fee !== undefined) updateData.delivery_fee = Number(settings.delivery_fee) || 0
    if (settings.min_invoice_amount !== undefined) updateData.min_invoice_amount = Number(settings.min_invoice_amount) || 0
    if (settings.tax_rate !== undefined) updateData.tax_rate = Number(settings.tax_rate) || 0
    if (settings.company_name !== undefined) updateData.company_name = settings.company_name
    if (settings.company_logo !== undefined) updateData.company_logo = settings.company_logo
    if (settings.status !== undefined) updateData.status = settings.status
    if (settings.trial_end_date !== undefined) updateData.trial_end_date = settings.trial_end_date || null
    if (settings.subscription_end_date !== undefined) updateData.subscription_end_date = settings.subscription_end_date || null
    if (settings.currency !== undefined) updateData.currency = settings.currency || 'SAR';

    if (existing && existing.length > 0) {
      const { error } = await supabase.from("app_settings").update(updateData).eq("id", existing[0].id)
      if (error) throw error
    } else {
      updateData.company_id = '00000000-0000-0000-0000-000000000001'
      const { error } = await supabase.from("app_settings").insert(updateData)
      if (error) throw error
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
