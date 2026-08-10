import { requireUser, getCompanyContext, supabase, json } from "../_shared/rawaea-auth.ts"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(req, "ok")
  if (req.method !== "POST") return json(req, { success: false, msg: "طريقة الطلب غير مدعومة" }, 405)

  try {
    const user = await requireUser(req)
    const { companyId } = await getCompanyContext()
    const body = await req.json()
    const voucherCode = body.voucher_code
    if (!voucherCode) throw new Error("رقم الإذن مطلوب")

    const { error } = await supabase.rpc("cancel_manual_stock_voucher_atomic", {
      p_company_id: companyId,
      p_voucher_code: voucherCode,
      p_user_email: user.email || "",
    })

    if (error) throw new Error(error.message)
    return json(req, { success: true, msg: "تم إلغاء الإذن" })
  } catch (error) {
    return json(req, { success: false, msg: error instanceof Error ? error.message : String(error) }, 400)
  }
})
