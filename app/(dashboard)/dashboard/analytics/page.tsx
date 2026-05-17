"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { isAdmin } from "@/lib/utils/roles"
import { useProfile, useAnalytics } from "@/hooks/use-dashboard-data"
import { AnalyticsSkeleton } from "@/components/shared/Skeletons"
import { LazyAnalyticsDashboard } from "@/components/lazy"
import { useRouter } from "next/navigation"

export default function AnalyticsPage() {
  const [userId, setUserId] = useState<string | undefined>()
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id))
  }, [])

  const { data: profile } = useProfile(userId)
  const admin = isAdmin(profile?.role || "")

  // Redirect non-admins
  useEffect(() => {
    if (profile && !admin) router.replace("/dashboard/overview")
  }, [profile, admin, router])

  const { data: analyticsData } = useAnalytics(!!userId && admin)

  if (!userId || !profile || !analyticsData) return <AnalyticsSkeleton />

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-3xl font-syne font-bold text-white">Analytics</h1>
        <p className="text-sm text-white/40 mt-1">Agency performance intelligence — employee output, revenue, and operational insights.</p>
      </div>
      <LazyAnalyticsDashboard
        employees={analyticsData.employees}
        tasks={analyticsData.tasks}
        payouts={analyticsData.payouts}
      />
    </div>
  )
}
