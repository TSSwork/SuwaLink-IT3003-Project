import { useEffect, useRef } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import type { LinkProps } from "@tanstack/react-router"

export interface Section {
  to: NonNullable<LinkProps["to"]>
  /** Already translated. */
  label: string
}

/**
 * The tab row under a section's heading (/pharmacy, /admin). The first link is
 * the section's own index, so it only matches exactly; the others also match
 * their sub-pages. Scrolls sideways on phones and wraps from md up.
 */
export function SectionNav({
  label,
  sections,
}: {
  label: string
  sections: Array<Section>
}) {
  const nav = useRef<HTMLElement>(null)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  // On phones the row scrolls; keep the current section in view.
  useEffect(() => {
    nav.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [pathname])

  return (
    <nav
      ref={nav}
      aria-label={label}
      className="-mx-4 flex [scrollbar-width:none] gap-1 overflow-x-auto border-b px-4 md:mx-0 md:flex-wrap md:px-0"
    >
      {sections.map((section, index) => (
        <Link
          key={section.to}
          to={section.to}
          // A filtered list (?status=…) is still the same section.
          activeOptions={{ exact: index === 0, includeSearch: false }}
          className="-mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 border-transparent px-3 text-sm font-medium whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:border-primary aria-[current=page]:text-foreground"
        >
          {section.label}
        </Link>
      ))}
    </nav>
  )
}
