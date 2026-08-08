// get-driver-dashboard – لوحة بيانات السائق دفعة واحدة
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

serve(async (req) => {
  const origin = req.headers.get("Origin") || "*"
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    var authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("غير مصرح")
    var token = authHeader.replace("Bearer ", "")
    var { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error("جلسة غير صالحة")

    var { data: pubUser } = await supabase.from("users").select("id, name, vehicle_id").eq("email", user.email).maybeSingle()
    if (!pubUser) throw new Error("المستخدم غير موجود")

    // جلب الرانشيت النشط
    var { data: activeRS } = await supabase.from("runsheets")
      .select("runsheet_code, status, run_date, vehicle_id, delivery_start, total_amount")
      .eq("driver_id", pubUser.id)
      .in("status", ["Loaded", "Delivering"])
      .order("run_date", { ascending: false })
      .limit(1)
      .maybeSingle()

    var orders = []
    var itemsBalance = []

    if (activeRS) {
      // جلب الأوردرات
      var { data: ords } = await supabase.from("orders")
        .select("order_code, customer_name, customer_phone, area, total_amount, order_status")
        .eq("runsheet_id", activeRS.id)
        .neq("order_status", "Cancelled")

      orders = ords || []

      // جلب رصيد السيارة
      var { data: details } = await supabase.from("run_sheet_details")
        .select("item_code, item_name, unit, qty_loaded, qty_delivered")
        .eq("runsheet_id", activeRS.id)

      itemsBalance = details || []
    }

    // جلب إحصائيات سريعة
    var today = new Date().toISOString().split("T")[0]
    var { data: todayStats } = await supabase.from("runsheets")
      .select("id")
      .eq("driver_id", pubUser.id)
      .gte("run_date", today)
      .lte("run_date", today)

    var todayCount = todayStats ? todayStats.length : 0

    return new Response(JSON.stringify({
      success: true,
      driver: { name: pubUser.name, vehicle_id: pubUser.vehicle_id },
      activeRunsheet: activeRS,
      orders: orders,
      vehicleStock: itemsBalance,
      todayStats: { runsheetCount: todayCount }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, msg: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})