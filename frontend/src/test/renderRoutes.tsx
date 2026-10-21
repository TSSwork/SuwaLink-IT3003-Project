import { QueryClientProvider } from "@tanstack/react-query"
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"
import { render } from "@testing-library/react"
import { createQueryClient } from "@/lib/queryClient"

export interface TestRoute {
  path: string
  component?: () => React.ReactNode
  validateSearch?: (search: Record<string, unknown>) => object
}

/**
 * Renders a small router with the given pages (ids match the app's, so
 * getRouteApi works) under a fresh QueryClient. Paths without a component
 * render their path, so tests can see where a page navigated.
 */
export function renderRoutes(routes: Array<TestRoute>, initialPath: string) {
  const queryClient = createQueryClient()
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
    ),
  })
  const children = routes.map(({ path, component, validateSearch }) =>
    createRoute({
      getParentRoute: () => root,
      path,
      validateSearch,
      component: component ?? (() => <p>page:{path}</p>),
    })
  )
  const router = createRouter({
    routeTree: root.addChildren(children),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })
  const view = render(<RouterProvider router={router} />)
  return { ...view, router }
}
