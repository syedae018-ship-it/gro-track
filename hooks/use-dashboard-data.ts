"use client"

import useSWR from "swr"
import {
  fetchProfile,
  fetchAdminOverview,
  fetchEmployeeOverview,
  fetchTasksPage,
  fetchAnalyticsData,
  fetchEmployeesData,
  fetchPaymentsData,
  fetchEarningsData,
  fetchNotifications,
} from "@/app/(dashboard)/actions/dashboard-data"

export {
  fetchProfile,
  fetchAdminOverview,
  fetchEmployeeOverview,
  fetchTasksPage,
  fetchAnalyticsData,
  fetchEmployeesData,
  fetchPaymentsData,
  fetchEarningsData,
  fetchNotifications,
}
import { getStreakData } from "@/app/(dashboard)/dashboard/tasks/streak-actions"

// ── Exported SWR Hooks ───────────────────────────────────────────────────────

export function useProfile(userId: string | undefined) {
  return useSWR(userId ? `profile-${userId}` : null, () => fetchProfile(userId!), { dedupingInterval: 120_000 })
}

export function useAdminOverview(enabled: boolean) {
  return useSWR(enabled ? "admin-overview" : null, fetchAdminOverview, { dedupingInterval: 60_000 })
}

export function useEmployeeOverview(userId: string | undefined) {
  return useSWR(userId ? `emp-overview-${userId}` : null, () => fetchEmployeeOverview(userId!), { dedupingInterval: 60_000 })
}

export function useTasksPage(userId: string | undefined, role: string | undefined) {
  return useSWR(userId && role ? `tasks-${userId}-${role}` : null, () => fetchTasksPage(userId!, role!), { dedupingInterval: 30_000 })
}

export function useAnalytics(enabled: boolean) {
  return useSWR(enabled ? "analytics" : null, fetchAnalyticsData, { dedupingInterval: 60_000 })
}

export function useEmployeesPage(enabled: boolean) {
  return useSWR(enabled ? "employees-page" : null, fetchEmployeesData, { dedupingInterval: 60_000 })
}

export function usePaymentsPage(enabled: boolean) {
  return useSWR(enabled ? "payments-page" : null, fetchPaymentsData, { dedupingInterval: 60_000 })
}

export function useEarningsPage(userId: string | undefined) {
  return useSWR(userId ? `earnings-${userId}` : null, () => fetchEarningsData(userId!), { dedupingInterval: 30_000 })
}

export function useNotifications(userId: string | undefined) {
  return useSWR(userId ? `notifications-${userId}` : null, () => fetchNotifications(userId!), {
    dedupingInterval: 5_000,
    refreshInterval: 10_000, // 10s auto-refresh fallback
  })
}

export function useStreakData(userId: string | undefined) {
  return useSWR(userId ? `streak-${userId}` : null, () => getStreakData(), {
    dedupingInterval: 30_000,
  })
}

