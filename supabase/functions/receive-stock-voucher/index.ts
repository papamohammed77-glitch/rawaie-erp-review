import { requireWarehouseVoucherAccess, getCompanyContext, supabase, json } from "../_shared/rawaea-auth.ts"
import { buildReceiveEffects } from "../_shared/manual-voucher-rules.ts"

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
      .select("id, type, status, from_type, from_id, to_type, to_id")
      .eq("company_id", companyId)
      .eq("voucher_code", voucherCode)
      .maybeSingle()
    if (voucherError || !voucher) throw new Error("الإذن غير موجود")
    if (voucher.status !== "Sent") throw new Error("يمكن استلام الأذونات المرسلة فقط")

    const { data: details, error: detailsError } = await supabase
      .from("stock_voucher_details")
      .select("item_id, item_code, item_name, qty, received_qty")
      .eq("voucher_id", voucher.id)
      .order("id")
    if (detailsError) throw new Error(detailsError.message)
    if (!details?.length) throw new Error("الإذن لا يحتوي على أصناف")

    // Empty receivedItems means: receive all remaining quantities.
    // This is intentionally resolved server-side from the voucher details,
    // so the client cannot invent quantities or bypass the remaining balance.
    let receivedItems = Array.isArray(body.receivedItems) ? body.receivedItems : []
    if (receivedItems.length === 0) {
      receivedItems = details
        .map((d) => ({
          itemCode: d.item_code,
          receivedQty: Number(d.qty || 0) - Number(d.received_qty || 0),
        }))
        .filter((x) => x.receivedQty > 0)
    }
    if (receivedItems.length === 0) throw new Error("لا توجد كمية متبقية للاستلام")

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
