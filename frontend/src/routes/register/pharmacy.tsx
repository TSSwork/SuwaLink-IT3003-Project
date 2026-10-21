import { createFileRoute } from "@tanstack/react-router"
import { PharmacyRegisterPage } from "@/features/pharmacyRegister/PharmacyRegisterPage"

export const Route = createFileRoute("/register/pharmacy")({
  component: PharmacyRegisterPage,
})
