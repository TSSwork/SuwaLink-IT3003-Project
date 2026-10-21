// Usage: node shot.mjs <url> <lang> <out.png> <width>
import { spawn } from "node:child_process"
import { writeFileSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const [url, lang, out, width = "360"] = process.argv.slice(2)
const port = 9300 + Math.floor(Math.random() * 500)
const chrome = spawn("google-chrome", [
  "--headless=new", "--disable-gpu", "--no-sandbox",
  `--remote-debugging-port=${port}`, `--window-size=${width},720`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "cdp-"))}`, "about:blank",
], { stdio: "ignore" })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 50 && !target; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
    target = list.find((t) => t.type === "page")
  } catch { await sleep(200) }
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener("open", r))
let id = 0
const pending = new Map()
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id) }
})
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })

await send("Page.enable")
await send("Emulation.setDeviceMetricsOverride", { width: Number(width), height: 720, deviceScaleFactor: 1, mobile: Number(width) < 600 })
await send("Page.navigate", { url })
await sleep(2500)
await send("Runtime.evaluate", { expression: `localStorage.setItem("suwalink.lang", JSON.stringify({state:{language:${JSON.stringify(lang)}},version:0}))` })
await send("Page.reload")
await sleep(3000)
const { data } = await send("Page.captureScreenshot", { format: "png" })
writeFileSync(out, Buffer.from(data, "base64"))
ws.close(); chrome.kill()
process.exit(0)
