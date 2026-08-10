import { requireWarehouseVoucherAccess, getCompanyContext, supabase, json } from "../_shared/rawaea-auth.ts"
import { validateVoucherEndpoints } from "../_shared/manual-voucher-rules.ts"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(req, "ok")
  if (req.method !== "POST") return json(req, { success: false, msg: "طريقة الطلب غير مدعومة" }, 405)

  try {
    const user = await requireWarehouseVoucherAccess(req)
    const { companyId } = await getCompanyContext()
    const body = await req.json()

    const items = Array.isArray(body.items) ? body.items : []
    if (!body.type || items.length === 0) throw new Error("النوع والأصناف مطلوبة")

    const fromType = body.fromType || "Branch"
    const fromId = body.fromId || null
    const toType = body.toType || "Branch"
    const toId = body.toId || null

    validateVoucherEndpoints({
      type: body.type,
      from_type: fromType,
      from_id: fromId,
      to_type: toType,
      to_id: toId,
    })

    const branchIds = [
      fromType === "Branch" ? fromId : null,
      toType === "Branch" ? toId : null,
    ].filter(Boolean)

    if (branchIds.length) {
      const { data: branches, error: branchError } = await supabase
        .from("branches")
        .select("id")
        .eq("company_id", companyId)
        .in("id", branchIds)

      if (branchError) throw new Error(branchError.message)
      const found = new Set((branches || []).map((b) => b.id))
      for (const branchId of branchIds) {
        if (!found.has(branchId)) throw new Error("الفرع غير موجود أو لا يتبع الشركة الحالية")
      }
    }

    const { data, error } = await supabase.rpc("create_manual_stock_voucher_atomic", {
      p_company_id: companyId,
      p_type: body.type,
      p_reference: body.reference || "",
      p_from_type: fromType,
      p_from_id: fromId,
      p_to_type: toType,
      p_to_id: toId,
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
