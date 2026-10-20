import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({ component: IndexPage })

// Temporary placeholder; replaced by the translated landing page in Task 3.
export function IndexPage() {
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-3xl font-extrabold tracking-tight">SuwaLink</h1>
      <p className="max-w-prose text-muted-foreground">
        Find medicines at pharmacies near you.
      </p>
    </section>
  )
}
