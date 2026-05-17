"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { isAdmin } from "@/lib/utils/roles"
import { useProfile, useEmployeesPage } from "@/hooks/use-dashboard-data"
import { EmployeeGridSkeleton } from "@/components/shared/Skeletons"
import { LazyTeamDirectory } from "@/components/lazy"
import { useRouter } from "next/navigation"

export default function EmployeesPage() {
  const [userId, setUserId] = useState<string | undefined>()
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id))
  }, [])

  const { data: profile } = useProfile(userId)
  const admin = isAdmin(profile?.role || "")

  useEffect(() => {
    if (profile && !admin) router.replace("/dashboard/overview")
  }, [profile, admin, router])

  const { data: empData } = useEmployeesPage(!!userId && admin)

  if (!userId || !profile || !empData) return <EmployeeGridSkeleton />

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-3xl font-syne font-bold text-white">Team Directory</h1>
        <p className="text-sm text-white/40 mt-1">
          Contact details, payment info, and client associations for every team member.
        </p>
      </div>
      <LazyTeamDirectory employees={empData.employees} tasks={empData.tasks} />
    </div>
  )
}
