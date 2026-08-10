import { requireUser, getCompanyContext, supabase, json } from "../_shared/rawaea-auth.ts"
import { buildReceiveEffects } from "../_shared/manual-voucher-rules.ts"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(req, "ok")
  if (req.method !== "POST") return json(req, { success: false, msg: "طريقة الطلب غير مدعومة" }, 405)

  try {
    const user = await requireUser(req)
    const { companyId } = await getCompanyContext()
    const body = await req.json()
    const voucherCode = body.voucher_code
    const receivedItems = Array.isArray(body.receivedItems) ? body.receivedItems : []
    if (!voucherCode || receivedItems.length === 0) throw new Error("البيانات غير مكتملة")

    const { data: voucher, error: voucherError } = await supabase
      .from("stock_vouchers")
      .select("id, type, status, from_type, from_id, to_type, to_id")
      .eq("company_id", companyId)
      .eq("voucher_code", voucherCode)
      .maybeSingle()
    if (voucherError || !voucher) throw new Error("الإذن غير موجود")
    if (voucher.status !== "Sent") throw new Error("يمكن استلام الأذونات المرسلة فقط")

    const { data: details, error: detailsError } = await supabase
      .from("stock_voucher_details")
      .select("item_id, item_code, item_name, qty")
      .eq("voucher_id", voucher.id)
      .order("id")
    if (detailsError) throw new Error(detailsError.message)
    if (!details?.length) throw new Error("الإذن لا يحتوي على أصناف")

    const effects = buildReceiveEffects(voucher, receivedItems, details)
    const { error } = await supabase.rpc("post_manual_stock_voucher_atomic", {
      p_company_id: companyId,
      p_voucher_code: voucherCode,
      p_operation: "RECEIVE",
      p_user_email: user.email || "",
      p_effects: effects,
    })
    if (error) throw new Error(error.message)

    return json(req, { success: true, msg: "تم الاستلام بنجاح" })
  } catch (error) {
    return json(req, { success: false, msg: error instanceof Error ? error.message : String(error) }, 400)
  }
})
