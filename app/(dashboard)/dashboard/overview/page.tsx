"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { createClient } from "@/lib/supabase/client"
import { isAdmin } from "@/lib/utils/roles"
import { useProfile, useAdminOverview, useEmployeeOverview } from "@/hooks/use-dashboard-data"
import { DashboardSkeleton } from "@/components/shared/Skeletons"
import {
  LazyAdminDashboard,
  LazyEmployeeDashboard,
} from "@/components/lazy"

export default function OverviewPage() {
  const { data: session, status } = useSession()
  const userId = session?.user?.id as string | undefined

  const { data: profile } = useProfile(userId)
  const role = profile?.role || "employee"
  const admin = isAdmin(role)

  const { data: adminData } = useAdminOverview(!!userId && admin)
  const { data: empData } = useEmployeeOverview(!admin ? userId : undefined)

  if (status === "loading") return <DashboardSkeleton />


  if (!userId || !profile) return <DashboardSkeleton />

  if (admin) {
    if (!adminData) return <DashboardSkeleton />
    return (
      <LazyAdminDashboard
        totalRevenue={adminData.totalRevenue}
        pendingPayouts={adminData.pendingPayouts}
        activeEmployees={adminData.activeEmployees}
        totalClients={adminData.totalClients}
        overdueTasks={adminData.overdueTasks}
        tasksByStatus={adminData.tasksByStatus}
        recentTasks={adminData.recentTasks}
        userName={profile.full_name || "Admin"}
      />
    )
  }

  if (!empData) return <DashboardSkeleton />
  return (
    <LazyEmployeeDashboard
      userId={userId}
      userName={profile.full_name || "there"}
      tasksDoneTotal={empData.tasksDoneTotal}
      tasksDoneThisWeek={empData.tasksDoneThisWeek}
      tasksDoneToday={empData.tasksDoneToday}
      overdueTasks={empData.overdueTasks}
      inReview={empData.inReview}
      inProgress={empData.inProgress}
      pending={empData.pending}
      totalEarnings={empData.totalEarnings}
      totalPaid={empData.totalPaid}
      pendingEarnings={empData.pendingEarnings}
      avgTurnaroundHours={empData.avgTurnaroundHours}
      activeTasks={empData.activeTasks}
      attendanceLogs={empData.attendanceLogs}
    />
  )
}
