import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    var body = await req.json();
    var user = body.user;
    var cartItems = body.cartItems;
    var total = body.total;
    var delivery = body.delivery;

    if (!user || !user.name || !user.phone || !user.area) {
      return new Response(JSON.stringify({ success: false, error: 'بيانات العميل غير مكتملة' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!cartItems || !cartItems.length) {
      return new Response(JSON.stringify({ success: false, error: 'السلة فارغة' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ✅ استبدال ANON_KEY بـ SERVICE_ROLE_KEY فقط – بدون global headers
    var supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    var customerName = user.name;
    var customerPhone = user.phone;
    var customerArea = user.area;

    // 1. البحث عن عميل موجود بنفس الهاتف
    var existingCustomer = await supabaseClient
      .from('customers')
      .select('id, customer_code')
      .eq('phone', customerPhone)
      .maybeSingle();

    var customerId = null;
    
    if (existingCustomer && existingCustomer.data) {
      customerId = existingCustomer.data.id;
    } else {
      var newCustCode = 'CUST-' + Date.now().toString().slice(-6);
      var newCustomer = await supabaseClient
        .from('customers')
        .insert({
          customer_code: newCustCode,
          name: customerName,
          phone: customerPhone,
          area: customerArea,
          customer_type: 'اونلاين',
          payment_type: 'نقدي',
          is_active: true,
          company_id: '00000000-0000-0000-0000-000000000001'
        })
        .select('id')
        .single();

      if (newCustomer && newCustomer.data) {
        customerId = newCustomer.data.id;
      }
    }

    // 2. الحصول على آخر رقم أوردر مباشرة من جدول orders
    var lastOrderRes = await supabaseClient
      .from('orders')
      .select('order_code')
      .order('created_at', { ascending: false })
      .limit(1);

    var nextSerial = 1001;
    if (lastOrderRes && lastOrderRes.data && lastOrderRes.data.length > 0) {
      var lastCode = lastOrderRes.data[0].order_code;
      var match = lastCode.match(/ORD-(\d+)/);
      if (match) {
        nextSerial = parseInt(match[1], 10) + 1;
      }
    }

    var orderCode = 'ORD-' + nextSerial;
    var now = new Date().toISOString().split('T')[0];

    // 3. إنشاء الأوردر
    var orderPayload = {
      order_code: orderCode,
      order_date: now,
      customer_id: customerId,
      customer_name: customerName,
      area: customerArea,
      total_amount: total,
      delivery_fee: delivery || 0,
      order_status: 'Pending',
      payment_type: 'نقدي',
      source: 'online_store',
      customer_phone: customerPhone,
      notes: user.notes || '',
      created_by: 'store',
      company_id: '00000000-0000-0000-0000-000000000001'
    };

    var orderInsert = await supabaseClient
      .from('orders')
      .insert(orderPayload)
      .select('id')
      .single();

    if (!orderInsert || !orderInsert.data) {
      return new Response(JSON.stringify({ success: false, error: 'فشل إنشاء الأوردر: ' + (orderInsert?.error?.message || '') }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    var orderId = orderInsert.data.id;

    // 4. إنشاء تفاصيل الأوردر
    for (var i = 0; i < cartItems.length; i++) {
      var item = cartItems[i];

      var itemRes = await supabaseClient
        .from('items')
        .select('id')
        .eq('item_code', item.code)
        .maybeSingle();

      var itemId = itemRes && itemRes.data ? itemRes.data.id : null;

      await supabaseClient
        .from('order_details')
        .insert({
          order_id: orderId,
          item_id: itemId,
          item_code: item.code,
          item_name: item.name,
          unit: item.unit || 'حبة',
          unit_price: item.price,
          qty: item.qty
        });
    }

    // 5. تحديث order_serial في app_settings (باستخدام UPSERT آمن)
    var settingsRes = await supabaseClient
      .from('app_settings')
      .select('id')
      .limit(1)
      .single();

    if (settingsRes && settingsRes.data && settingsRes.data.id) {
      await supabaseClient
        .from('app_settings')
        .update({ order_serial: nextSerial })
        .eq('id', settingsRes.data.id);
    } else {
      await supabaseClient
        .from('app_settings')
        .insert({
          order_serial: nextSerial,
          company_id: '00000000-0000-0000-0000-000000000001'
        });
    }

    return new Response(
      JSON.stringify({ success: true, orderCode: orderCode }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'خطأ غير معروف' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
