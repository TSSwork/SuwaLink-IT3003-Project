/**
 * The query key of GET /api/settings/public (the login page's demo accounts).
 * Its own module so tests that mock @/api/auth keep it; admin demo changes
 * invalidate it.
 */
export const publicSettingsKey = ["settings", "public"] as const
