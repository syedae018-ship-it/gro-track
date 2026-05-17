import { redirect } from "next/navigation"

export default function RootPage() {
  // Redirect the root page to the dashboard. 
  // The middleware will automatically handle routing unauthenticated users to /login.
  redirect("/dashboard")
}
