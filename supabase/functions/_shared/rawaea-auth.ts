import { createClient } from "npm:@supabase/supabase-js@2"

export const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
)

export async function requireUser(req: Request) {
  const header = req.headers.get("Authorization")
  if (!header) throw new Error("غير مصرح")
  const token = header.replace(/^Bearer\s+/i, "")
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) throw new Error("جلسة غير صالحة")
  return data.user
}

export async function getCompanyContext() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("company_id, main_branch_id")
    .single()

  if (error || !data?.company_id) {
    throw new Error("سياق الشركة غير محدد بشكل وحيد في الإعدادات")
  }

  return {
    companyId: data.company_id as string,
    mainBranchId: data.main_branch_id as string | null,
  }
}

export function corsHeaders(req: Request) {
  return {
    "Access-Control-Allow-Origin": req.headers.get("Origin") || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  }
}

export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(req),
  })
}
