import { requireUser, getCompanyContext, supabase, json } from "../_shared/rawaea-auth.ts"
import { validateVoucherEndpoints } from "../_shared/manual-voucher-rules.ts"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(req, "ok")
  if (req.method !== "POST") return json(req, { success: false, msg: "طريقة الطلب غير مدعومة" }, 405)

  try {
    const user = await requireUser(req)
    const { companyId } = await getCompanyContext()
    const body = await req.json()

    const items = Array.isArray(body.items) ? body.items : []
    if (!body.type || items.length === 0) throw new Error("النوع والأصناف مطلوبة")

    validateVoucherEndpoints({
      type: body.type,
      from_type: body.fromType || "Branch",
      from_id: body.fromId || null,
      to_type: body.toType || "Branch",
      to_id: body.toId || null,
    })

    const { data, error } = await supabase.rpc("create_manual_stock_voucher_atomic", {
      p_company_id: companyId,
      p_type: body.type,
      p_reference: body.reference || "",
      p_from_type: body.fromType || "Branch",
      p_from_id: body.fromId || null,
      p_to_type: body.toType || "Branch",
      p_to_id: body.toId || null,
      p_notes: body.notes || "",
      p_created_by: user.email || "",
      p_items: items,
    })

    if (error) throw new Error(error.message)
    return json(req, { success: true, voucherId: data.voucher_code, voucher_id: data.voucher_id })
  } catch (error) {
    return json(req, { success: false, msg: error instanceof Error ? error.message : String(error) }, 400)
  }
})
