import { requireUser, getCompanyContext, supabase, json } from "../_shared/rawaea-auth.ts"
import { requiresOutboundStock } from "../_shared/manual-voucher-rules.ts"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(req, "ok")
  if (req.method !== "POST") return json(req, { success: false, msg: "طريقة الطلب غير مدعومة" }, 405)

  try {
    const user = await requireUser(req)
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
    if (voucher.status !== "Draft") throw new Error("يمكن إرسال المسودات فقط")
    if (!requiresOutboundStock(voucher.type)) throw new Error("هذا النوع لا يخصم المخزون عند الإرسال")

    const { error } = await supabase.rpc("post_manual_stock_voucher_atomic", {
      p_company_id: companyId,
      p_voucher_code: voucherCode,
      p_operation: "SEND",
      p_user_email: user.email || "",
      p_received_items: [],
    })

    if (error) throw new Error(error.message)
    return json(req, { success: true, msg: "تم إرسال الإذن وخصم المخزون" })
  } catch (error) {
    return json(req, { success: false, msg: error instanceof Error ? error.message : String(error) }, 400)
  }
})
