import { requireWarehouseVoucherAccess, getCompanyContext, supabase, json } from "../_shared/rawaea-auth.ts"
import { validateVoucherEndpoints } from "../_shared/manual-voucher-rules.ts"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function resolveBranchId(companyId: string, branchRef: string) {
  if (!branchRef) throw new Error("معرف الفرع مطلوب")
  if (UUID_RE.test(branchRef)) {
    const { data, error } = await supabase.from("branches").select("id").eq("company_id", companyId).eq("id", branchRef).maybeSingle()
    if (error) throw new Error(error.message)
    if (!data?.id) throw new Error("الفرع غير موجود أو لا يتبع الشركة الحالية")
    return data.id
  }
  const { data, error } = await supabase.from("branches").select("id").eq("company_id", companyId).eq("branch_code", branchRef).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error("الفرع غير موجود: " + branchRef)
  return data.id
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(req, "ok")
  if (req.method !== "POST") return json(req, { success: false, msg: "طريقة الطلب غير مدعومة" }, 405)
  try {
    const user = await requireWarehouseVoucherAccess(req)
    const { companyId } = await getCompanyContext()
    const body = await req.json()
    const items = Array.isArray(body.items) ? body.items : []
    if (!body.type || items.length === 0) throw new Error("النوع والأصناف مطلوبة")

    let fromType = body.fromType || "Branch"
    let fromId = body.fromId || null
    let toType = body.toType || "Branch"
    let toId = body.toId || null

    if (fromType === "Branch" && fromId) fromId = await resolveBranchId(companyId, fromId)
    if (toType === "Branch" && toId) toId = await resolveBranchId(companyId, toId)

    if (body.type === "DirectSale") {
      if (!fromId) fromId = await resolveBranchId(companyId, "MAIN")
      if (!toId) toId = await resolveBranchId(companyId, "VAN-" + (user.email || ""))
    }
    if (body.type === "DirectReturn") {
      if (!fromId) fromId = await resolveBranchId(companyId, "VAN-" + (user.email || ""))
      if (!toId) toId = await resolveBranchId(companyId, "MAIN")
    }
    if (body.type === "SupplierReturn" && !fromId) fromId = await resolveBranchId(companyId, "MAIN")
    if (body.type === "Transfer" && !fromId) fromId = await resolveBranchId(companyId, "MAIN")

    validateVoucherEndpoints({ type: body.type, from_type: fromType, from_id: fromId, to_type: toType, to_id: toId })

    const branchIds = [fromType === "Branch" ? fromId : null, toType === "Branch" ? toId : null].filter(Boolean)
    if (branchIds.length) {
      const { data: branches, error: branchError } = await supabase.from("branches").select("id").eq("company_id", companyId).in("id", branchIds)
      if (branchError) throw new Error(branchError.message)
      const found = new Set((branches || []).map((b) => b.id))
      for (const branchId of branchIds) if (!found.has(branchId)) throw new Error("الفرع غير موجود أو لا يتبع الشركة الحالية")
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
