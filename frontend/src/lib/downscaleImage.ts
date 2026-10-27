/** Long edge (px) above which a photo is shrunk even when small enough in bytes. */
export const DOWNSCALE_TRIGGER_EDGE = 2500
/** Long edge (px) of a shrunk photo: still sharp enough to read a prescription. */
export const DOWNSCALE_LONG_EDGE = 2400
export const DOWNSCALE_QUALITY = 0.85

export interface DecodedImage {
  width: number
  height: number
  source: CanvasImageSource | object
  close?: () => void
}

/** How an image is read and written; the browser's by default, a fake in tests (jsdom has no canvas). */
export interface ImageCodec {
  decode: (file: Blob) => Promise<DecodedImage>
  /** A JPEG of `source` drawn at width × height. */
  encode: (
    source: DecodedImage["source"],
    width: number,
    height: number,
    quality: number
  ) => Promise<Blob>
}

const browserCodec: ImageCodec = {
  // createImageBitmap applies the EXIF orientation, so phone photos stay upright.
  decode: async (file) => {
    const bitmap = await createImageBitmap(file)
    return {
      width: bitmap.width,
      height: bitmap.height,
      source: bitmap,
      close: () => bitmap.close(),
    }
  },
  encode: (source, width, height, quality) =>
    new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext("2d")
      if (!context) {
        reject(new Error("No 2D canvas"))
        return
      }
      // JPEG has no transparency: a PNG's clear parts become white, not black.
      context.fillStyle = "#fff"
      context.fillRect(0, 0, width, height)
      context.drawImage(source as CanvasImageSource, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          canvas.width = 0
          canvas.height = 0
          if (blob) resolve(blob)
          else reject(new Error("Could not encode the image"))
        },
        "image/jpeg",
        quality
      )
    }),
}

/**
 * Phone photos are often over the upload limit. A photo over `maxBytes`, or
 * with a long edge over 2500 px, is redrawn as a JPEG with a long edge of at
 * most 2400 px; anything else is returned as it is. Rejects when the image
 * cannot be read or written; the caller then checks the original's size.
 */
export async function downscaleImage(
  file: File,
  { maxBytes }: { maxBytes: number },
  codec: ImageCodec = browserCodec
): Promise<File> {
  const image = await codec.decode(file)
  try {
    const longEdge = Math.max(image.width, image.height)
    if (file.size <= maxBytes && longEdge <= DOWNSCALE_TRIGGER_EDGE) {
      return file
    }
    const scale = Math.min(1, DOWNSCALE_LONG_EDGE / longEdge)
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const blob = await codec.encode(
      image.source,
      width,
      height,
      DOWNSCALE_QUALITY
    )
    const name = file.name.replace(/\.[^./]*$/, "") + ".jpg"
    return new File([blob], name, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    })
  } finally {
    image.close?.()
  }
}
