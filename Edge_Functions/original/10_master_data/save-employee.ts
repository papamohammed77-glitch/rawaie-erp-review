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
    const { employee, isEdit, originalEmail } = await req.json();
    if (!employee || !employee.name || !employee.email) throw new Error("الاسم والبريد مطلوبان");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("غير مصرح");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("جلسة غير صالحة");

    // ✅ دمج صلاحيات الدور مع الصلاحيات المخصصة
    var rolePermissions = [];
    if (employee.role) {
      var { data: roleData } = await supabase.from("roles").select("permissions").eq("role_name", employee.role).maybeSingle();
      if (roleData && roleData.permissions) {
        rolePermissions = roleData.permissions;
      }
    }
    var customPerms = employee.permissions || [];
    var mergedPermissions = rolePermissions.slice();
    for (var i = 0; i < customPerms.length; i++) {
      if (mergedPermissions.indexOf(customPerms[i]) === -1) {
        mergedPermissions.push(customPerms[i]);
      }
    }

    const empData: any = {
        name: employee.name, email: employee.email, phone: employee.phone || null,
        role: employee.role || 'موظف', status: employee.status || 'Active',
        expiry_date: employee.expiry_date || null, allowed_branch_ids: employee.allowed_branch_ids || '*',
        permissions: mergedPermissions,
        allow_all_customers: employee.allow_all_customers || false,
        restrict_to_visit_day: employee.restrict_to_visit_day !== false,
        device_id: employee.device_id || null,
        company_id: '00000000-0000-0000-0000-000000000001',
        password_hash: 'managed_by_supabase_auth'
    };

    if (isEdit && originalEmail) {
        const { error } = await supabase.from("users").update(empData).eq("email", originalEmail);
        if (error) throw error;
        if (employee.password) {
            try {
                const { data: authUser } = await supabase.auth.admin.listUsers();
                var targetUser = null;
                for (var j = 0; j < (authUser.users || []).length; j++) {
                    if (authUser.users[j].email === originalEmail) { targetUser = authUser.users[j]; break; }
                }
                if (targetUser) {
                    await supabase.auth.admin.updateUserById(targetUser.id, {
                        password: employee.password,
                        user_metadata: {
                            name: employee.name,
                            role: employee.role || 'موظف',
                            isOwner: false,
                            permissions: mergedPermissions
                        }
                    });
                }
            } catch(e) {}
        }
        return new Response(JSON.stringify({ success: true, action: 'updated' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
        const { data: newAuthUser, error: authError2 } = await supabase.auth.admin.createUser({
            email: employee.email,
            password: employee.password || '123456',
            email_confirm: true,
            user_metadata: {
                name: employee.name,
                role: employee.role || 'موظف',
                isOwner: false,
                permissions: mergedPermissions
            }
        });
        if (authError2) throw authError2;
        empData.auth_id = newAuthUser.user.id;
        const { error } = await supabase.from("users").insert(empData);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, action: 'created' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
