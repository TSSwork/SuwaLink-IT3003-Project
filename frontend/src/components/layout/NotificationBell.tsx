import { useState } from "react"
import { useRouter } from "@tanstack/react-router"
import { BellIcon, BellOffIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from "@/api/notifications"
import type { NotificationItem } from "@/api/types"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatRelative } from "@/lib/format"
import { translateError } from "@/lib/translateError"
import { cn } from "@/lib/utils"
import { useLanguageStore } from "@/stores/languageStore"
import { useSessionStore } from "@/stores/sessionStore"

/** Header bell for any signed-in role; renders nothing when signed out. */
export function NotificationBell() {
  const signedIn = useSessionStore((state) => state.token !== null)
  return signedIn ? <Bell /> : null
}

function Bell() {
  const { t } = useTranslation()
  const router = useRouter()
  const language = useLanguageStore((state) => state.language)
  const [open, setOpen] = useState(false)
  const unread = useUnreadCount().data ?? 0
  const list = useNotifications(open)
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()

  const openItem = (item: NotificationItem) => {
    if (!item.read) markRead.mutate(item.id)
    if (item.link) void router.navigate({ href: item.link })
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-11"
          aria-label={
            unread > 0
              ? t("notifications.labelUnread", { count: unread })
              : t("notifications.label")
          }
        >
          <BellIcon className="size-5" aria-hidden />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute top-1 right-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.6875rem] leading-5 font-semibold text-primary-foreground"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        // The default width follows the 44 px trigger; the list needs room
        // but must stay inside a 360 px viewport.
        className="max-h-[min(32rem,var(--radix-dropdown-menu-content-available-height))] w-[min(24rem,calc(100vw-1rem))]"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <DropdownMenuLabel className="text-base font-semibold text-foreground">
            {t("notifications.title")}
          </DropdownMenuLabel>
          <DropdownMenuItem
            className="ml-auto min-h-11 max-w-full text-primary"
            disabled={unread === 0 || markAll.isPending}
            // Keep the list open so the dots clear in front of the reader.
            onSelect={(event) => {
              event.preventDefault()
              markAll.mutate()
            }}
          >
            {t("notifications.markAll")}
          </DropdownMenuItem>
        </div>
        <DropdownMenuSeparator />

        {list.isPending ? (
          <LoadingState className="p-3" rows={3} />
        ) : list.isError ? (
          <ErrorState
            className="m-1"
            title={t("notifications.loadError")}
            description={translateError(t, list.error)}
            onRetry={() => void list.refetch()}
          />
        ) : list.data.length === 0 ? (
          <EmptyState
            className="m-1 border-0"
            icon={BellOffIcon}
            title={t("notifications.emptyTitle")}
            description={t("notifications.emptyBody")}
          />
        ) : (
          list.data.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="min-h-11 items-start gap-3 py-3"
              onSelect={() => openItem(item)}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  item.read ? "bg-transparent" : "bg-primary"
                )}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={cn(
                    "text-sm",
                    item.read ? "font-normal" : "font-semibold"
                  )}
                >
                  {item.title}
                  {!item.read && (
                    <span className="sr-only">
                      {" "}
                      ({t("notifications.unread")})
                    </span>
                  )}
                </span>
                <span className="text-sm break-words text-muted-foreground">
                  {item.message}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelative(item.createdAt, language)}
                </span>
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
