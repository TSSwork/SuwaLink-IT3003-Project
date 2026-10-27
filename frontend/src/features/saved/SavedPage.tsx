import { Link } from "@tanstack/react-router"
import { BookmarkIcon, Trash2Icon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { Bookmark } from "@/api/types"
import { useBookmarks, useRemoveBookmark } from "@/api/bookmarks"
import { AddToCartButton } from "@/components/cart/AddToCartButton"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { RxBadge } from "@/components/medicine/RxBadge"
import { StockIndicator } from "@/components/medicine/StockIndicator"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/format"
import { translateError } from "@/lib/translateError"
import { useLanguageStore } from "@/stores/languageStore"

export function SavedPage() {
  const { t } = useTranslation()
  const bookmarks = useBookmarks()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("saved.title")}
        </h1>
        <p className="text-muted-foreground">{t("saved.subtitle")}</p>
      </div>

      {bookmarks.isPending ? (
        <LoadingState label={t("saved.loading")} rows={4} />
      ) : bookmarks.isError ? (
        <ErrorState
          title={t("saved.loadError")}
          description={translateError(t, bookmarks.error)}
          onRetry={() => void bookmarks.refetch()}
        />
      ) : bookmarks.data.length === 0 ? (
        <EmptyState
          icon={BookmarkIcon}
          title={t("saved.emptyTitle")}
          description={t("saved.emptyBody")}
          action={
            <Button asChild>
              <Link to="/search">{t("nav.findMedicine")}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col divide-y overflow-hidden rounded-3xl border bg-card">
          {bookmarks.data.map((saved) => (
            <SavedRow key={saved.id} saved={saved} />
          ))}
        </ul>
      )}
    </div>
  )
}

function SavedRow({ saved }: { saved: Bookmark }) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const remove = useRemoveBookmark()
  const { inventory } = saved
  const { medicine, pharmacy } = inventory
  const requiresPrescription = medicine.legalCategory !== "OTC"
  const reservable = inventory.available && inventory.stockQuantity > 0

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/medicines/$id"
              params={{ id: medicine.id }}
              className="rounded-md font-semibold underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              {medicine.brandName}
            </Link>
            {requiresPrescription && <RxBadge />}
          </div>
          <p className="text-sm text-muted-foreground">
            {[medicine.genericName, medicine.strength, medicine.dosageForm]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <Link
            to="/pharmacies/$id"
            params={{ id: pharmacy.id }}
            className="w-fit rounded-md text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            {pharmacy.name}
          </Link>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("saved.remove", {
            name: medicine.brandName,
            interpolation: { escapeValue: false },
          })}
          disabled={remove.isPending}
          onClick={() =>
            remove.mutate(inventory.id, {
              onSuccess: () => toast.success(t("saved.removed")),
              onError: (error) => toast.error(translateError(t, error)),
            })
          }
        >
          <Trash2Icon aria-hidden />
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-semibold tabular-nums">
            {formatPrice(inventory.unitPrice, language)}
          </span>
          {reservable ? (
            <StockIndicator stock={inventory.stockQuantity} />
          ) : (
            <span className="text-sm text-muted-foreground">
              {t("saved.unavailable")}
            </span>
          )}
        </div>
        {reservable && (
          <AddToCartButton
            stock={inventory.stockQuantity}
            item={{
              inventoryItemId: inventory.id,
              pharmacyId: pharmacy.id,
              pharmacyName: pharmacy.name,
              medicineId: medicine.id,
              medicineName: medicine.brandName,
              strength: medicine.strength,
              unitPrice: inventory.unitPrice,
              requiresPrescription,
            }}
          />
        )}
      </div>
    </li>
  )
}
