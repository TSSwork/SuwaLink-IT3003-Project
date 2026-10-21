import { DISTRICTS } from "@/api/types"
import type {
  LocationStepValues,
  OwnerStepValues,
  PharmacyStepInput,
} from "@/features/pharmacyRegister/schema"

export const DRAFT_STORAGE_KEY = "suwalink.pharmacyRegisterDraft"

/** Everything the wizard has collected so far. */
export interface WizardData {
  owner: OwnerStepValues
  pharmacy: PharmacyStepInput
  location: LocationStepValues
  acceptTerms: boolean
}

export const EMPTY_WIZARD: WizardData = {
  owner: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
  pharmacy: {
    pharmacyName: "",
    licenceNo: "",
    address: "",
    district: "",
    city: "",
    openingHours: "",
  },
  location: { latitude: "", longitude: "" },
  acceptTerms: false,
}

/** What survives a reload: the wizard data minus the passwords and consent. */
interface StoredDraft {
  owner: Pick<OwnerStepValues, "name" | "email" | "phone">
  pharmacy: PharmacyStepInput
  location: LocationStepValues
}

/** The string values of `source` under `keys`; anything else is dropped. */
function pickStrings<T extends object>(
  source: unknown,
  keys: ReadonlyArray<keyof T>
) {
  const picked: Partial<Record<keyof T, string>> = {}
  if (typeof source !== "object" || source === null) return picked
  for (const key of keys) {
    const value = (source as Record<string, unknown>)[key as string]
    if (typeof value === "string") picked[key] = value
  }
  return picked
}

/** The saved draft merged over empty values, or undefined when there is none. */
export function loadDraft(): WizardData | undefined {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return undefined
    const draft: unknown = JSON.parse(raw)
    const section = (name: string) =>
      typeof draft === "object" && draft !== null
        ? (draft as Record<string, unknown>)[name]
        : undefined
    const pharmacy = pickStrings<PharmacyStepInput>(section("pharmacy"), [
      "pharmacyName",
      "licenceNo",
      "address",
      "district",
      "city",
      "openingHours",
    ])
    if (!(DISTRICTS as readonly string[]).includes(pharmacy.district ?? "")) {
      delete pharmacy.district
    }
    return {
      ...EMPTY_WIZARD,
      owner: {
        ...EMPTY_WIZARD.owner,
        ...pickStrings<OwnerStepValues>(section("owner"), [
          "name",
          "email",
          "phone",
        ]),
      },
      pharmacy: { ...EMPTY_WIZARD.pharmacy, ...pharmacy },
      location: {
        ...EMPTY_WIZARD.location,
        ...pickStrings<LocationStepValues>(section("location"), [
          "latitude",
          "longitude",
        ]),
      },
    }
  } catch {
    return undefined
  }
}

export function saveDraft({ owner, pharmacy, location }: WizardData) {
  const draft: StoredDraft = {
    owner: { name: owner.name, email: owner.email, phone: owner.phone },
    pharmacy,
    location,
  }
  try {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // Storage full or blocked: the wizard still works, it just won't survive a reload.
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY)
  } catch {
    // Nothing to clear.
  }
}

/** True when a draft holds anything worth restoring. */
export function hasContent({ owner, pharmacy, location }: WizardData): boolean {
  return [
    owner.name,
    owner.email,
    owner.phone,
    ...Object.values(pharmacy),
    location.latitude,
    location.longitude,
  ].some((value) => value.trim() !== "")
}
