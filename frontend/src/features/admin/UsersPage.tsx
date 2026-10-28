import { useId, useState } from "react"
import { getRouteApi } from "@tanstack/react-router"
import { SearchIcon, UsersIcon } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import type { AccountStatus, AdminUser } from "@/api/types"
import type { UserFilter } from "@/features/admin/usersSearch"
import type { TranslatableError } from "@/lib/translateError"
import {
  useAdminUsers,
  useDeleteUser,
  useReactivateUser,
  useSuspendUser,
} from "@/api/admin"
import { ConfirmButton } from "@/components/feedback/ConfirmButton"
import { EmptyState } from "@/components/feedback/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { LoadingState } from "@/components/feedback/LoadingState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { USER_FILTERS } from "@/features/admin/usersSearch"
import { translateError } from "@/lib/translateError"
import { useDebouncedValue } from "@/lib/useDebouncedValue"

const route = getRouteApi("/admin/users")

const STATUS_VARIANT: Record<
  AccountStatus,
  "secondary" | "outline" | "destructive"
> = {
  ACTIVE: "secondary",
  SUSPENDED: "destructive",
  DELETED: "outline",
}

/** Every account, searchable by name or email; suspend, reactivate or delete. */
export function UsersPage() {
  const { t } = useTranslation()
  const { status } = route.useSearch()
  const navigate = route.useNavigate()
  const searchId = useId()
  const [query, setQuery] = useState("")
  const q = useDebouncedValue(query).trim()
  const users = useAdminUsers({ q, status })
  const filter: UserFilter = status ?? "ALL"

  const setFilter = (next: UserFilter) =>
    void navigate({
      search: { status: next === "ALL" ? undefined : next },
      replace: true,
    })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t("admin.users.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("admin.users.subtitle")}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex max-w-md flex-col gap-2">
          <label htmlFor={searchId} className="text-sm font-medium">
            {t("admin.users.searchLabel")}
          </label>
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon aria-hidden />
            </InputGroupAddon>
            <InputGroupInput
              id={searchId}
              type="search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("admin.users.searchPlaceholder")}
            />
          </InputGroup>
        </div>
        <div
          role="group"
          aria-label={t("admin.users.filtersLabel")}
          className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {USER_FILTERS.map((name) => (
            <Button
              key={name}
              type="button"
              size="sm"
              variant={filter === name ? "default" : "outline"}
              aria-pressed={filter === name}
              onClick={() => setFilter(name)}
              className="shrink-0 rounded-full px-4"
            >
              {t(`admin.users.filter.${name}`)}
            </Button>
          ))}
        </div>
      </div>

      {users.isPending ? (
        <LoadingState label={t("admin.users.loading")} rows={4} />
      ) : users.isError ? (
        <ErrorState
          title={t("admin.users.loadError")}
          description={translateError(t, users.error)}
          onRetry={() => void users.refetch()}
        />
      ) : users.data.length === 0 ? (
        q ? (
          <EmptyState
            icon={SearchIcon}
            title={t("admin.users.noMatch", {
              q,
              interpolation: { escapeValue: false },
            })}
            description={t("admin.users.noMatchBody")}
            action={
              <Button variant="outline" onClick={() => setQuery("")}>
                {t("admin.users.clearSearch")}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={UsersIcon}
            title={t(`admin.users.none.${filter}`)}
            description={t(
              filter === "ALL"
                ? "admin.users.noneAllBody"
                : "admin.users.noneBody"
            )}
            action={
              filter !== "ALL" && (
                <Button variant="outline" onClick={() => setFilter("ALL")}>
                  {t("admin.users.showAll")}
                </Button>
              )
            }
          />
        )
      ) : (
        <ul
          aria-label={t("admin.users.listLabel")}
          aria-busy={users.isFetching}
          className="grid gap-3 lg:grid-cols-2"
        >
          {users.data.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </ul>
      )}
    </div>
  )
}

/** A pharmacy owner's open reservations block deletion; the generic text speaks to the owner. */
function actionError(t: TFunction, error: TranslatableError) {
  return error.code === "OPEN_RESERVATIONS"
    ? t("admin.users.openReservations")
    : translateError(t, error)
}

function UserRow({ user }: { user: AdminUser }) {
  const { t } = useTranslation()
  const suspend = useSuspendUser()
  const reactivate = useReactivateUser()
  const remove = useDeleteUser()
  const busy = suspend.isPending || reactivate.isPending || remove.isPending
  const name = { name: user.name, interpolation: { escapeValue: false } }
  const onError = (error: Error) => toast.error(actionError(t, error))
  // The backend refuses both for admins; they are not offered.
  const manageable = user.role !== "ADMIN"
  const roleKey = user.role === "PHARMACY_OWNER" ? "PHARMACY_OWNER" : "CUSTOMER"

  return (
    <li className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h3 className="font-semibold break-words">{user.name}</h3>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="h-auto whitespace-normal">
              {t(`admin.users.role.${user.role}`)}
            </Badge>
            <Badge
              variant={STATUS_VARIANT[user.status]}
              className="h-auto whitespace-normal"
            >
              {t(`admin.users.status.${user.status}`)}
            </Badge>
          </div>
        </div>
        <p className="flex flex-col text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-3">
          <span className="break-all">{user.email}</span>
          <span>{user.phone}</span>
        </p>
      </div>

      {manageable ? (
        <div className="flex flex-wrap gap-2">
          {user.status === "SUSPENDED" ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                reactivate.mutate(user.id, {
                  onSuccess: () =>
                    toast.success(t("admin.users.reactivated", name)),
                  onError,
                })
              }
            >
              {t("admin.users.reactivate")}
            </Button>
          ) : (
            <ConfirmButton
              label={t("admin.users.suspend")}
              title={t("admin.users.suspendTitle", name)}
              description={t(`admin.users.suspendBody.${roleKey}`)}
              destructive
              disabled={busy}
              onConfirm={() =>
                suspend.mutate(user.id, {
                  onSuccess: () =>
                    toast.success(t("admin.users.suspended", name)),
                  onError,
                })
              }
            />
          )}
          <ConfirmButton
            label={t("admin.users.delete")}
            title={t("admin.users.deleteTitle", name)}
            description={t(`admin.users.deleteBody.${roleKey}`)}
            variant="ghost"
            destructive
            disabled={busy}
            onConfirm={() =>
              remove.mutate(user.id, {
                onSuccess: () => toast.success(t("admin.users.deleted", name)),
                onError,
              })
            }
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("admin.users.adminNote")}
        </p>
      )}
    </li>
  )
}
