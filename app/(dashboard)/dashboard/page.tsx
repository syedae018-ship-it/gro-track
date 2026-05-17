import { redirect } from "next/navigation"

// /dashboard → redirect to /dashboard/overview
export default function DashboardPage() {
  redirect("/dashboard/overview")
}
