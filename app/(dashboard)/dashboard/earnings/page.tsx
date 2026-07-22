"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useProfile, useEarningsPage } from "@/hooks/use-dashboard-data"
import { EarningsSkeleton } from "@/components/shared/Skeletons"
import { LazyEarningsClient } from "@/components/lazy"
import { useRouter } from "next/navigation"

import { useSession } from "next-auth/react"

export default function EarningsPage() {
  const { data: session } = useSession()
  // @ts-ignore
  const userId = session?.user?.id as string | undefined
  const userEmail = session?.user?.email || ""
  const router = useRouter()

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
