import { requireWarehouseVoucherAccess, getCompanyContext, supabase, json } from "../_shared/rawaea-auth.ts"
import { completionExpectedStatus } from "../_shared/manual-voucher-rules.ts"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(req, "ok")
  if (req.method !== "POST") return json(req, { success: false, msg: "طريقة الطلب غير مدعومة" }, 405)

  try {
    const user = await requireWarehouseVoucherAccess(req)
    const { companyId } = await getCompanyContext()
    const body = await req.json()
    const voucherCode = body.voucher_code
    if (!voucherCode) throw new Error("رقم الإذن مطلوب")

    const { data: voucher, error: voucherError } = await supabase
      .from("stock_vouchers")
      .select("id, type, status")
      .eq("company_id", companyId)
      .eq("voucher_code", voucherCode)
      .maybeSingle()

    if (voucherError || !voucher) throw new Error("الإذن غير موجود")
    const expected = completionExpectedStatus(voucher.type)
    if (voucher.status !== expected) throw new Error("حالة الإذن لا تسمح بالإكمال")

    const { error } = await supabase.rpc("complete_manual_stock_voucher_atomic", {
      p_company_id: companyId,
      p_voucher_code: voucherCode,
      p_user_email: user.email || "",
    })

    if (error) throw new Error(error.message)
    return json(req, { success: true, msg: "تم إكمال الإذن" })
  } catch (error) {
    return json(req, { success: false, msg: error instanceof Error ? error.message : String(error) }, 400)
  }
})
