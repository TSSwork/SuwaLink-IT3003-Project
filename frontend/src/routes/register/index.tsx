import { createFileRoute } from "@tanstack/react-router"
import { RegisterPage } from "@/features/auth/RegisterPage"

// register/index.tsx rather than register.tsx, so /register/pharmacy (Task 6)
// is a sibling page and not a child that /register would have to render.
export const Route = createFileRoute("/register/")({ component: RegisterPage })
