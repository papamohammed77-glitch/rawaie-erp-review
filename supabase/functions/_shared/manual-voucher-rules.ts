export const MANUAL_VOUCHER_TYPES = {
  OUTBOUND_ON_SEND: ["Transfer", "DirectSale", "SupplierReturn"],
  INBOUND_ON_RECEIVE: ["Transfer", "DirectReturn"],
  LIFECYCLE: ["Transfer", "DirectSale", "DirectReturn", "SupplierReturn"],
} as const

export function requiresOutboundStock(type: string) {
  return (MANUAL_VOUCHER_TYPES.OUTBOUND_ON_SEND as readonly string[]).includes(type)
}

export function requiresInboundStock(type: string) {
  return (MANUAL_VOUCHER_TYPES.INBOUND_ON_RECEIVE as readonly string[]).includes(type)
}

export function completionExpectedStatus(type: string) {
  if (type === "Transfer" || type === "DirectReturn") return "Received"
  if (type === "DirectSale" || type === "SupplierReturn") return "Sent"
  throw new Error("نوع الإذن غير مدعوم في دورة الأذونات الحالية")
}

export function validateVoucherEndpoints(voucher: any) {
  const { type, from_type, from_id, to_type, to_id } = voucher
  if (!(MANUAL_VOUCHER_TYPES.LIFECYCLE as readonly string[]).includes(type)) {
    throw new Error("نوع الإذن غير مدعوم في دورة الأذونات الحالية")
  }
  if (type === "Transfer") {
    if (from_type !== "Branch" || !from_id) throw new Error("مصدر التحويل يجب أن يكون فرعًا محددًا")
    if (to_type !== "Branch" || !to_id) throw new Error("وجهة التحويل يجب أن تكون فرعًا محددًا")
  }
  if (type === "DirectSale") {
    if (from_type !== "Branch" || !from_id) throw new Error("مصدر صرف السيارة يجب أن يكون فرعًا محددًا")
    if (to_type !== "Branch" || !to_id) throw new Error("صرف السيارة يجب أن يكون إلى فرع العهدة الخاص بها")
  }
  if (type === "DirectReturn") {
    if (from_type !== "Branch" || !from_id) throw new Error("المرتجع المباشر يجب أن يأتي من فرع العهدة الخاص بالسيارة")
    if (to_type !== "Branch" || !to_id) throw new Error("وجهة المرتجع المباشر يجب أن تكون فرعًا محددًا")
  }
  if (type === "SupplierReturn") {
    if (from_type !== "Branch" || !from_id) throw new Error("مرتجع المورد يجب أن يخرج من فرع مخزني محدد")
    if (to_type !== "Supplier" || !to_id) throw new Error("مرتجع المورد يجب أن يتجه إلى مورد محدد")
  }
}

export function buildSendEffects(voucher: any, details: any[]) {
  validateVoucherEndpoints(voucher)
  if (!requiresOutboundStock(voucher.type)) throw new Error("هذا النوع لا يخصم المخزون عند الإرسال")

  return details.map((d) => ({
    direction: "OUT",
    branch_id: voucher.from_id,
    item_id: d.item_id,
    item_code: d.item_code,
    qty: Number(d.qty),
  }))
}

export function buildReceiveEffects(voucher: any, receivedItems: any[], details: any[]) {
  validateVoucherEndpoints(voucher)
  if (!requiresInboundStock(voucher.type)) throw new Error("هذا النوع لا يضيف المخزون عند الاستلام")

  const detailByCode = new Map(details.map((d) => [d.item_code, d]))
  const effects: any[] = []

  for (const item of receivedItems) {
    const d = detailByCode.get(item.itemCode)
    if (!d) throw new Error("الصنف غير موجود في الإذن: " + item.itemCode)
    const qty = Number(item.receivedQty)
    if (!Number.isFinite(qty) || qty <= 0) throw new Error("كمية الاستلام غير صالحة: " + item.itemCode)
    if (qty > Number(d.qty) - Number(d.received_qty || 0)) {
      throw new Error("الكمية المستلمة أكبر من الكمية المتبقية للصنف " + item.itemCode)
    }

    effects.push({
      direction: "IN",
      branch_id: voucher.to_id,
      item_id: d.item_id,
      item_code: d.item_code,
      qty,
    })
  }

  return effects
}
