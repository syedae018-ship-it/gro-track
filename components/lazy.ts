import dynamic from "next/dynamic"
import {
  DashboardSkeleton,
  TaskBoardSkeleton,
  AnalyticsSkeleton,
  EmployeeGridSkeleton,
  PaymentsSkeleton,
  EarningsSkeleton,
  SettingsSkeleton,
  TaskFeedSkeleton,
} from "@/components/shared/Skeletons"

export const LazyAdminDashboard = dynamic(
  () => import("@/components/dashboard/AdminDashboard").then(m => ({ default: m.AdminDashboard })),
  { loading: () => DashboardSkeleton({}), ssr: false }
)

export const LazyEmployeeDashboard = dynamic(
  () => import("@/components/dashboard/EmployeeDashboard").then(m => ({ default: m.EmployeeDashboard })),
  { loading: () => DashboardSkeleton({}), ssr: false }
)

export const LazyAdminTaskBoard = dynamic(
  () => import("@/components/dashboard/AdminTaskBoard").then(m => ({ default: m.AdminTaskBoard })),
  { loading: () => TaskBoardSkeleton({}), ssr: false }
)

export const LazyEmployeeTaskFeed = dynamic(
  () => import("@/components/tasks/EmployeeTaskFeed").then(m => ({ default: m.EmployeeTaskFeed })),
  { loading: () => TaskFeedSkeleton({}), ssr: false }
)

export const LazyAnalyticsDashboard = dynamic(
  () => import("@/components/analytics/AnalyticsDashboard").then(m => ({ default: m.AnalyticsDashboard })),
  { loading: () => AnalyticsSkeleton({}), ssr: false }
)

export const LazyTeamDirectory = dynamic(
  () => import("@/components/employees/TeamDirectory").then(m => ({ default: m.TeamDirectory })),
  { loading: () => EmployeeGridSkeleton({}), ssr: false }
)

export const LazyPaymentsDashboard = dynamic(
  () => import("@/components/payments/PaymentsDashboard").then(m => ({ default: m.PaymentsDashboard })),
  { loading: () => PaymentsSkeleton({}), ssr: false }
)

export const LazyEarningsClient = dynamic(
  () => import("@/components/earnings/EarningsClient").then(m => ({ default: m.EarningsClient })),
  { loading: () => EarningsSkeleton({}), ssr: false }
)

export const LazyProfileSettingsForm = dynamic(
  () => import("@/components/settings/ProfileSettingsForm").then(m => ({ default: m.ProfileSettingsForm })),
  { loading: () => SettingsSkeleton({}), ssr: false }
)
