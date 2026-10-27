import { BookmarkIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  useAddBookmark,
  useBookmarks,
  useRemoveBookmark,
} from "@/api/bookmarks"
import { Button } from "@/components/ui/button"
import { translateError } from "@/lib/translateError"
import { cn } from "@/lib/utils"
import { useSessionStore } from "@/stores/sessionStore"

/** Save / Saved toggle (a bookmark) for one offer; signed-in customers only. */
export function SaveButton({
  inventoryId,
  className,
}: {
  inventoryId: string
  className?: string
}) {
  const { t } = useTranslation()
  const isCustomer = useSessionStore((state) => state.user?.role === "CUSTOMER")
  const bookmarks = useBookmarks()
  const addBookmark = useAddBookmark()
  const removeBookmark = useRemoveBookmark()

  if (!isCustomer || !bookmarks.isSuccess) return null
  const saved = bookmarks.data.some((b) => b.inventory.id === inventoryId)
  const busy =
    addBookmark.isPending || removeBookmark.isPending || bookmarks.isFetching

  const toggle = () => {
    const mutation = saved ? removeBookmark : addBookmark
    mutation.mutate(inventoryId, {
      onError: (error) => toast.error(translateError(t, error)),
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      aria-pressed={saved}
      disabled={busy}
      onClick={toggle}
      className={cn(saved && "text-primary", className)}
    >
      <BookmarkIcon
        data-icon="inline-start"
        aria-hidden
        className={cn(saved && "fill-current")}
      />
      {saved ? t("medicine.saved") : t("medicine.save")}
    </Button>
  )
}
