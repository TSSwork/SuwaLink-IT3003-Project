import { z } from "zod"
import type { InventoryItem } from "@/api/types"
import { LOW_STOCK } from "@/components/medicine/StockIndicator"

export const EXPIRY_WARNING_DAYS = 30

/** A LocalDate ("YYYY-MM-DD") `days` from today, in local time. */
export function localDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Matches StockIndicator's "Only N left". */
export function isLowStock(item: InventoryItem): boolean {
  return item.stockQuantity <= LOW_STOCK
}

/** Before today. An item expiring today is still on sale today. */
export function isExpired(item: InventoryItem): boolean {
  return item.expireDate < localDate(0)
}

/** Expiring within 30 days, or already expired: both need attention. */
export function needsExpiryAttention(item: InventoryItem): boolean {
  return item.expireDate <= localDate(EXPIRY_WARNING_DAYS)
}

const DECIMAL = /^\d+(\.\d+)?$/

/**
 * Price, stock and expiry as typed, checked like Create/UpdateInventoryRequest:
 * unitPrice > 0 with at most 2 decimals, stockQuantity a whole number >= 0, expireDate after today
 * (@Future). Messages are i18n keys.
 */
export const stockFieldsSchema = z.object({
  unitPrice: z
    .string()
    .trim()
    .min(1, "validation.required")
    .refine(
      (value) => DECIMAL.test(value) && Number(value) > 0,
      "validation.pricePositive"
    )
    // unit_price is decimal(38,2): more decimals would be rounded silently.
    .refine((value) => !/\.\d{3,}$/.test(value), "validation.priceDecimals"),
  stockQuantity: z
    .string()
    .trim()
    .min(1, "validation.required")
    .regex(/^\d+$/, "validation.stockWhole"),
  expireDate: z
    .string()
    .min(1, "validation.required")
    .refine((value) => value > localDate(0), "validation.expiryFuture"),
})
export type StockFieldsInput = z.input<typeof stockFieldsSchema>
export type StockFieldsValues = z.infer<typeof stockFieldsSchema>

export const addItemSchema = stockFieldsSchema.extend({
  medicineMasterId: z.string().min(1, "pharmacyOwner.inventory.chooseMedicine"),
})
export type AddItemInput = z.input<typeof addItemSchema>
export type AddItemValues = z.infer<typeof addItemSchema>

export const STOCK_FIELDS = [
  "unitPrice",
  "stockQuantity",
  "expireDate",
] as const satisfies ReadonlyArray<keyof StockFieldsInput>

export const ADD_FIELDS = [
  ...STOCK_FIELDS,
  "medicineMasterId",
] as const satisfies ReadonlyArray<keyof AddItemInput>

/** The PUT body: exactly UpdateInventoryRequest's fields. */
export function toStockRequest(values: StockFieldsValues) {
  return {
    unitPrice: Number(values.unitPrice),
    stockQuantity: Number(values.stockQuantity),
    expireDate: values.expireDate,
  }
}

export function toStockFormValues(item: InventoryItem): StockFieldsInput {
  return {
    unitPrice: String(item.unitPrice),
    stockQuantity: String(item.stockQuantity),
    expireDate: item.expireDate,
  }
}
