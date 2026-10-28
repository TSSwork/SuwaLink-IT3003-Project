/** The backend's PickupCodeGenerator: 10 characters, no 0/O, 1/I/L look-alikes. */
const PICKUP_CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/

/**
 * The pickup code in a typed code or a scanned QR, upper-cased, or null when
 * it is not one. A link counts only when it is http(s) and its path is exactly
 * `/r/<code>`; only the code is kept, so callers navigate inside the app and
 * never to the scanned address.
 */
export function parsePickupCode(input: string): string | null {
  const text = input.trim()
  if (PICKUP_CODE.test(text.toUpperCase())) return text.toUpperCase()

  let url: URL
  try {
    url = new URL(text)
  } catch {
    return null
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null
  const code = /^\/r\/([^/]+)$/.exec(url.pathname)?.[1].toUpperCase()
  return code && PICKUP_CODE.test(code) ? code : null
}
