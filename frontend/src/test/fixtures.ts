import type { MedicineSearchResult, Reservation } from "@/api/types"

export function searchResult(
  over: Partial<MedicineSearchResult> = {}
): MedicineSearchResult {
  return {
    medicineId: "9b1d0c1e-1111-4e2f-9b1a-0c5d7e8f9a10",
    brandName: "Panadol",
    genericName: "Paracetamol",
    dosageForm: "Tablet",
    strength: "500 mg",
    category: "Pain relief",
    manufacturer: "GSK",
    legalCategory: "OTC",
    requiresPrescription: false,
    imageUrl: null,
    pharmacyCount: 3,
    lowestPrice: 12.5,
    currency: "LKR",
    nearestDistanceKm: null,
    ...over,
  }
}

export function reservation(over: Partial<Reservation> = {}): Reservation {
  return {
    id: "r1",
    pickupCode: "K7Q2MX",
    status: "CONFIRMED",
    expiresAt: "2026-10-22T18:00:00",
    createdAt: "2026-10-21T09:30:00",
    cancelReason: null,
    cancelledBy: null,
    prescriptionRequestId: null,
    requiresPrescription: false,
    total: 375,
    pharmacy: {
      id: "p1",
      name: "City Pharmacy",
      phone: "0112345678",
      address: "12 Galle Road",
      city: "Colombo 03",
      district: "COLOMBO",
      latitude: 6.9,
      longitude: 79.85,
    },
    customer: { id: "u1", name: "Nimal" },
    items: [
      {
        id: "i1",
        inventoryItemId: "inv1",
        medicineName: "Panadol 500 mg",
        quantity: 30,
        unitPrice: 12.5,
        lineTotal: 375,
        requiresPrescription: false,
      },
    ],
    ...over,
  }
}
