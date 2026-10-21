import { createFileRoute } from "@tanstack/react-router"
import { IndexPage } from "@/features/home/IndexPage"

export const Route = createFileRoute("/")({ component: IndexPage })
