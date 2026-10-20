import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({ component: IndexPage })

// Temporary placeholder; replaced by the translated landing page in Task 3.
export function IndexPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-medium">SuwaLink</h1>
    </main>
  )
}
