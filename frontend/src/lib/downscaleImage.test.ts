import { describe, expect, it, vi } from "vitest"
import type { ImageCodec } from "@/lib/downscaleImage"
import { downscaleImage } from "@/lib/downscaleImage"

const MB = 1024 * 1024
const LIMIT = { maxBytes: 5 * MB }

function file(name: string, size: number, type = "image/jpeg") {
  const f = new File(["x"], name, { type })
  Object.defineProperty(f, "size", { value: size })
  return f
}

function codec(width: number, height: number, out = new Blob(["small"])) {
  const close = vi.fn()
  const encode = vi.fn(() => Promise.resolve(out))
  const fake: ImageCodec = {
    decode: () => Promise.resolve({ width, height, source: {}, close }),
    encode,
  }
  return { fake, encode, close }
}

describe("downscaleImage", () => {
  it("keeps a photo within the size and edge limits", async () => {
    const original = file("rx.jpg", 2 * MB)
    const { fake, encode } = codec(2000, 1500)
    expect(await downscaleImage(original, LIMIT, fake)).toBe(original)
    expect(encode).not.toHaveBeenCalled()
  })

  it("shrinks a photo over the size limit to a 2400 px long edge, as JPEG at 0.85", async () => {
    const { fake, encode, close } = codec(4000, 3000)
    const result = await downscaleImage(file("rx.png", 8 * MB), LIMIT, fake)
    expect(encode).toHaveBeenCalledWith({}, 2400, 1800, 0.85)
    expect(result).toBeInstanceOf(File)
    expect(result.name).toBe("rx.jpg")
    expect(result.type).toBe("image/jpeg")
    expect(close).toHaveBeenCalled()
  })

  it("shrinks a small file whose long edge is over 2500 px", async () => {
    const { fake, encode } = codec(1200, 3000)
    await downscaleImage(file("tall.jpg", 1 * MB), LIMIT, fake)
    expect(encode).toHaveBeenCalledWith({}, 960, 2400, 0.85)
  })

  it("does not enlarge a small but heavy image", async () => {
    const { fake, encode } = codec(1000, 800)
    await downscaleImage(file("heavy.png", 6 * MB), LIMIT, fake)
    expect(encode).toHaveBeenCalledWith({}, 1000, 800, 0.85)
  })

  it("fails when the image cannot be decoded", async () => {
    const fake: ImageCodec = {
      decode: () => Promise.reject(new Error("bad image")),
      encode: vi.fn(),
    }
    await expect(
      downscaleImage(file("rx.jpg", 8 * MB), LIMIT, fake)
    ).rejects.toThrow()
  })
})
