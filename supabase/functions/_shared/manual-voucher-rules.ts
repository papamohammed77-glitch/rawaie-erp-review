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
  return type === "Transfer" ? "Received" : "Sent"
}

export function buildSendEffects(voucher: any, details: any[]) {
  if (!requiresOutboundStock(voucher.type)) throw new Error("هذا النوع لا يخصم المخزون عند الإرسال")
  if (voucher.from_type !== "Branch" || !voucher.from_id) throw new Error("مصدر المخزون يجب أن يكون فرعًا محددًا")

  const effects = details.map((d) => ({
    direction: "OUT",
    branch_id: voucher.from_id,
    item_id: d.item_id,
    item_code: d.item_code,
    qty: Number(d.qty),
  }))

  if (voucher.type === "DirectSale") {
    if (voucher.to_type !== "Branch" || !voucher.to_id) {
      throw new Error("صرف السيارة يجب أن يكون إلى فرع العهدة الخاص بها")
    }
    for (const d of details) {
      effects.push({
        direction: "IN",
        branch_id: voucher.to_id,
        item_id: d.item_id,
        item_code: d.item_code,
        qty: Number(d.qty),
      })
    }
  }

  return effects
}

export function buildReceiveEffects(voucher: any, receivedItems: any[], details: any[]) {
  if (!requiresInboundStock(voucher.type)) throw new Error("هذا النوع لا يضيف المخزون عند الاستلام")
  if (voucher.to_type !== "Branch" || !voucher.to_id) throw new Error("وجهة المخزون يجب أن تكون فرعًا محددًا")

  const detailByCode = new Map(details.map((d) => [d.item_code, d]))
  const effects: any[] = []

  for (const item of receivedItems) {
    const d = detailByCode.get(item.itemCode)
    if (!d) throw new Error("الصنف غير موجود في الإذن: " + item.itemCode)
    const qty = Number(item.receivedQty)
    if (!Number.isFinite(qty) || qty <= 0) throw new Error("كمية الاستلام غير صالحة: " + item.itemCode)
    if (qty > Number(d.qty)) throw new Error("الكمية المستلمة أكبر من كمية الإذن للصنف " + item.itemCode)

    if (voucher.type === "DirectReturn") {
      if (voucher.from_type !== "Branch" || !voucher.from_id) {
        throw new Error("المرتجع المباشر يجب أن يأتي من فرع العهدة الخاص بالسيارة")
      }
      effects.push({ direction: "OUT", branch_id: voucher.from_id, item_id: d.item_id, item_code: d.item_code, qty })
    }

    effects.push({ direction: "IN", branch_id: voucher.to_id, item_id: d.item_id, item_code: d.item_code, qty })
  }

  return effects
}
