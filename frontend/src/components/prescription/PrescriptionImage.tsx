import { ImageOffIcon, MinusIcon, PlusIcon, RotateCcwIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch"
import { usePrescriptionImage } from "@/api/prescriptions"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { translateError } from "@/lib/translateError"

/**
 * The private prescription photo on a neutral surface: never cropped
 * (object-contain), pinch / wheel / drag to zoom, with buttons and +, -, 0
 * keys for the same.
 */
export function PrescriptionImage({
  imageUrl,
  alt,
}: {
  imageUrl: string
  /** Defaults to "Your prescription", the customer's view. */
  alt?: string
}) {
  const { t } = useTranslation()
  const image = usePrescriptionImage(imageUrl)

  if (image.isError) {
    return (
      <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-3xl border bg-muted p-6 text-center text-sm text-muted-foreground">
        <ImageOffIcon aria-hidden className="size-8" />
        {translateError(t, image.error)}
      </div>
    )
  }
  if (!image.src) {
    return (
      <div role="status" className="aspect-[3/4]">
        <span className="sr-only">{t("prescriptions.imageLoading")}</span>
        <Skeleton aria-hidden className="size-full rounded-3xl" />
      </div>
    )
  }

  return (
    <TransformWrapper minScale={1} maxScale={6} centerOnInit>
      {({ zoomIn, zoomOut, resetTransform }) => (
        <div className="flex flex-col gap-2">
          <div
            tabIndex={0}
            aria-label={t("prescriptions.imageKeys")}
            onKeyDown={(event) => {
              if (event.key === "+" || event.key === "=") zoomIn()
              else if (event.key === "-") zoomOut()
              else if (event.key === "0") resetTransform()
              else return
              event.preventDefault()
            }}
            className="overflow-hidden rounded-3xl border bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <TransformComponent
              wrapperClass="!w-full !h-[min(70dvh,40rem)]"
              contentClass="!w-full !h-full"
            >
              <img
                src={image.src}
                alt={alt ?? t("prescriptions.imageAlt")}
                className="size-full object-contain"
              />
            </TransformComponent>
          </div>
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label={t("prescriptions.zoomOut")}
              onClick={() => zoomOut()}
            >
              <MinusIcon aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={t("prescriptions.zoomReset")}
              onClick={() => resetTransform()}
            >
              <RotateCcwIcon aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={t("prescriptions.zoomIn")}
              onClick={() => zoomIn()}
            >
              <PlusIcon aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </TransformWrapper>
  )
}
