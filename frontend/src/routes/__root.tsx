import { useEffect } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouter,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"

import appCss from "../styles.css?url"
import { registerRouter } from "@/api/client"
import { AccountMenu } from "@/components/layout/AccountMenu"
import { AppShell } from "@/components/layout/AppShell"
import { getCurrentLanguage, startLanguageSync } from "@/i18n"
import { queryClient, startSessionCacheSync } from "@/lib/queryClient"
import { startThemeSync, themeInitScript } from "@/lib/theme"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "SuwaLink",
      },
      // Updated to the active mode by themeInitScript / applyTheme.
    ],
    // Sets .dark and the theme-color meta before first paint so a stored dark
    // choice never flashes. The meta is created by the script, not by React,
    // so hydration never re-adds a second, stale one.
    scripts: [{ children: themeInitScript }],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
  component: RootLayout,
})

function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold">{t("common.notFoundTitle")}</h1>
      <p className="text-muted-foreground">{t("common.notFoundBody")}</p>
    </div>
  )
}

function RootLayout() {
  useEffect(() => startThemeSync(), [])
  useEffect(() => startLanguageSync(), [])
  useEffect(() => startSessionCacheSync(), [])
  const router = useRouter()
  useEffect(() => {
    registerRouter(router)
    return () => registerRouter(null)
  }, [router])
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell account={<AccountMenu />}>
        <Outlet />
      </AppShell>
    </QueryClientProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getCurrentLanguage()} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}
