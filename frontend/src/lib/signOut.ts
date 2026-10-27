import { useCartStore } from "@/stores/cartStore"
import { useLocationStore } from "@/stores/locationStore"
import { useSessionStore } from "@/stores/sessionStore"

/**
 * An explicit sign-out (or a deleted account): nothing of this person stays
 * for the next one on this browser. The cart is forgotten (an expired session
 * keeps it for its owner, see cartStore) and the location goes back to none,
 * so the next account starts from its own district.
 */
export function signOut(): void {
  useCartStore.getState().reset()
  useLocationStore.getState().clear()
  useSessionStore.getState().clear()
}
