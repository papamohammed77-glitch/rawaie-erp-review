export const MANUAL_VOUCHER_TYPES = {
  OUTBOUND: ["Transfer", "DirectSale", "SupplierReturn"],
  INBOUND: ["Transfer", "DirectReturn"],
  LIFECYCLE: ["Transfer", "DirectSale", "DirectReturn", "SupplierReturn"],
} as const

export function requiresOutboundStock(type: string) {
  return (MANUAL_VOUCHER_TYPES.OUTBOUND as readonly string[]).includes(type)
}

export function requiresInboundStock(type: string) {
  return (MANUAL_VOUCHER_TYPES.INBOUND as readonly string[]).includes(type)
}

export function completionExpectedStatus(type: string) {
  return type === "Transfer" ? "Received" : "Sent"
}
