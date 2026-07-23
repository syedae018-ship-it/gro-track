"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useProfile, useEarningsPage } from "@/hooks/use-dashboard-data"
import { EarningsSkeleton } from "@/components/shared/Skeletons"
import { LazyEarningsClient } from "@/components/lazy"
import { useRouter } from "next/navigation"

import { useAuth } from "@/hooks/use-auth"
export default function EarningsPage() {
  const { data: session, role } = useAuth()
  // @ts-ignore
  const userId = session?.user?.id as string | undefined
  const userEmail = session?.user?.email || ""
  const userName = session?.user?.name || "Employee"
  const router = useRouter()

  // Only employees can access
  useEffect(() => {
    if (userId && role !== "employee") router.replace("/dashboard/overview")
  }, [userId, role, router])

  const { data: earningsData } = useEarningsPage(userId)

  if (!userId || !earningsData) return <EarningsSkeleton />

  return (
    <LazyEarningsClient
      initialTasks={earningsData.tasks as any[]}
      initialPayouts={earningsData.payouts}
      employeeName={userName}
      employeeEmail={userEmail}
      employeeId={userId}
    />
  )
}
