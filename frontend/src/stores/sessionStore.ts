import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type { Role } from "@/api/types"

/** localStorage key (spec §9: the JWT lives in browser storage for the MVP). */
export const SESSION_STORAGE_KEY = "suwalink.session"

export interface SessionUser {
  id: string
  name: string
  role: Role
}

interface SessionState {
  token: string | null
  user: SessionUser | null
  setSession: (token: string, user: SessionUser) => void
  clear: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      clear: () => set({ token: null, user: null }),
    }),
    {
      name: SESSION_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ token, user }) => ({ token, user }),
      // A half-written or tampered entry must never look signed in.
      merge: (persisted, current) => {
        const stored = persisted as
          Partial<Pick<SessionState, "token" | "user">> | undefined
        return stored?.token && stored.user
          ? { ...current, token: stored.token, user: stored.user }
          : current
      },
    }
  )
)
