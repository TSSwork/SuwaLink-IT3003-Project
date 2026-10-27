/**
 * The in-app path to open (sign-in return, notification link), or undefined when `target` is
 * missing or would leave the site ("//host", "/\\host", "https:…",
 * "javascript:…", or anything with control characters, which browsers strip
 * before parsing). Resolved against the current origin and reduced to
 * pathname + search + hash.
 */
export function safeRedirect(target: string | undefined): string | undefined {
  // eslint-disable-next-line no-control-regex
  if (!target?.startsWith("/") || /[\u0000-\u001f\u007f]/.test(target)) {
    return undefined
  }
  let url: URL
  try {
    url = new URL(target, window.location.origin)
  } catch {
    return undefined
  }
  if (url.origin !== window.location.origin) return undefined
  return url.pathname + url.search + url.hash
}
