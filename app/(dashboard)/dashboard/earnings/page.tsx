"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useProfile, useEarningsPage } from "@/hooks/use-dashboard-data"
import { EarningsSkeleton } from "@/components/shared/Skeletons"
import { LazyEarningsClient } from "@/components/lazy"
import { useRouter } from "next/navigation"

export default function EarningsPage() {
  const [userId, setUserId] = useState<string | undefined>()
  const [userEmail, setUserEmail] = useState("")
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace("/auth/login"); return }
      setUserId(data.user.id)
      setUserEmail(data.user.email || "")
    })
  }, [router])

  const { data: profile } = useProfile(userId)

  // Only employees can access
  useEffect(() => {
    if (profile && profile.role !== "employee") router.replace("/dashboard")
  }, [profile, router])

  const { data: earningsData } = useEarningsPage(userId)

  if (!userId || !profile || !earningsData) return <EarningsSkeleton />

  return (
    <LazyEarningsClient
      initialTasks={earningsData.tasks as any[]}
      initialPayouts={earningsData.payouts}
      employeeName={profile.full_name || "Employee"}
      employeeEmail={userEmail}
      employeeId={userId}
    />
  )
}
