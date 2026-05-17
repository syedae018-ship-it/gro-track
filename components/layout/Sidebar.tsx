"use client"

import React, { useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { preload } from "swr"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, ListTodo, CreditCard, PieChart,
  Users, Building2, LogOut, Flame, DollarSign, Settings, UserCircle2, X
} from "lucide-react"
import { Avatar } from "../shared/Avatar"
import {
  fetchAdminOverview, fetchEmployeeOverview, fetchTasksPage,
  fetchAnalyticsData, fetchEmployeesData, fetchPaymentsData, fetchEarningsData
} from "@/hooks/use-dashboard-data"
import { logout } from "@/app/(auth)/actions"
import { isAdmin } from "@/lib/utils/roles"
import { useSidebar } from "./SidebarContext"

const employeeNav = [
  {
    title: "My Workspace",
    items: [
      { name: "Overview", href: "/dashboard/overview", icon: LayoutDashboard },
      { name: "My Tasks", href: "/dashboard/tasks", icon: ListTodo },
      { name: "My Earnings", href: "/dashboard/earnings", icon: DollarSign },
    ]
  },
  {
    title: "Account",
    items: [
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ]
  },
]

const adminNav = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", href: "/dashboard/overview", icon: LayoutDashboard },
      { name: "Analytics", href: "/dashboard/analytics", icon: PieChart },
    ]
  },
  {
    title: "Workspace",
    items: [
      { name: "Tasks", href: "/dashboard/tasks", icon: ListTodo },
      { name: "Clients", href: "/dashboard/clients", icon: Building2 },
      { name: "Employees", href: "/dashboard/employees", icon: Users },
    ]
  },
  {
    title: "Finance",
    items: [
      { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
    ]
  },
  {
    title: "Account",
    items: [
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ]
  },
]

interface SidebarProps {
  user?: any
  isGuest?: boolean
  profile?: { full_name: string; role: string; avatar_url?: string | null; specialization?: string | null } | null
}

export const Sidebar = React.memo(function Sidebar({ user, isGuest, profile }: SidebarProps) {
  const pathname = usePathname()
  const currentUserId = user?.id
  const { isOpen, close } = useSidebar()
  const sidebarRef = useRef<HTMLDivElement>(null)

  const userName = isGuest ? "Guest User" : profile?.full_name || user?.user_metadata?.full_name || "User"
  const userRole = isGuest ? "demo" : profile?.role || user?.user_metadata?.role || "employee"
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
  const admin = isGuest ? true : isAdmin(userRole) // guests see admin layout

  const navConfig = admin ? adminNav : employeeNav

  const roleLabel = userRole === 'managing_director' ? 'Director' :
    userRole === 'admin_ops' ? 'Ops Admin' :
    userRole === 'admin_finance' ? 'Finance Admin' :
    isGuest ? 'Demo Mode' : 'Employee'

  // ── Swipe-to-close for mobile ──────────────────────────────────
  const touchStartX = useRef(0)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta < -60) close() // swipe left to close
  }, [close])

  // ── Sidebar content (shared between desktop & mobile) ──────────
  const sidebarContent = (
    <>
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-purple-glow opacity-50 pointer-events-none" />
      
      {/* Logo */}
      <div className="h-[60px] flex items-center px-5 border-b border-border gap-3 relative z-10">
        <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center shadow-luxury-glow">
          <Flame className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-syne font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
          GroTrack
        </span>
        <span className={cn(
          "ml-auto text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider border",
          admin ? "bg-primary/20 text-primary border-primary/30" : "bg-secondary/20 text-secondary border-secondary/30"
        )}>
          {admin ? "Admin" : "Staff"}
        </span>
        {/* Mobile close button */}
        <button 
          onClick={close}
          className="lg:hidden ml-2 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-5 px-3 space-y-5 overscroll-contain">
        {navConfig.map((section, idx) => (
          <div key={idx}>
            <p className="text-[10px] uppercase text-white/20 font-semibold tracking-[0.1em] mb-1.5 px-2">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon
                
                const handleHover = () => {
                  if (!currentUserId || isGuest) return
                  const r = admin ? "admin" : "employee"
                  if (item.href === "/dashboard/overview") {
                    admin ? preload("admin-overview", fetchAdminOverview) : preload(`emp-overview-${currentUserId}`, () => fetchEmployeeOverview(currentUserId))
                  } else if (item.href === "/dashboard/tasks") {
                    preload(`tasks-${currentUserId}-${r}`, () => fetchTasksPage(currentUserId, r))
                  } else if (item.href === "/dashboard/analytics" && admin) {
                    preload("analytics", fetchAnalyticsData)
                  } else if (item.href === "/dashboard/employees" && admin) {
                    preload("employees-page", fetchEmployeesData)
                  } else if (item.href === "/dashboard/payments" && admin) {
                    preload("payments-page", fetchPaymentsData)
                  } else if (item.href === "/dashboard/earnings" && !admin) {
                    preload(`earnings-${currentUserId}`, () => fetchEarningsData(currentUserId))
                  }
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onMouseEnter={handleHover}
                    onClick={close}
                    className={cn(
                      "flex items-center h-11 sm:h-10 px-3 rounded-full text-[13px] font-medium transition-all duration-300 relative group gap-3 active:scale-[0.97]",
                      isActive
                        ? "text-white bg-primary/20 shadow-neon-border border border-primary/30"
                        : "text-muted-foreground hover:text-white hover:bg-white/5 hover:border hover:border-white/10"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary shadow-[0_0_8px_#c084fc] rounded-r-full" />
                    )}
                    <Icon className={cn("w-[16px] h-[16px] shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-white/80")} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Card */}
      <div className="p-4 border-t border-border relative z-10 bg-background/80 backdrop-blur-md">
        <Link href="/dashboard/settings" onClick={close} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-surface border border-transparent hover:border-primary/20 transition-all duration-300 group cursor-pointer shadow-luxury-glow">
          <div className="relative shrink-0">
            {profile?.avatar_url ? (
              <div className="w-[34px] h-[34px] rounded-full overflow-hidden relative border-2 border-primary/50 shadow-purple-bloom">
                <img src={profile.avatar_url} alt={userName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <Avatar initials={userInitials} size="sidebar" gradient={admin ? "purple-pink" : "green-cyan"} />
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-background shadow-[0_0_5px_#34d399]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate leading-tight group-hover:text-primary transition-colors">{userName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{profile?.specialization || roleLabel}</p>
          </div>
          <Settings className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </Link>
      </div>
    </>
  )

  return (
    <>
      {/* ── Desktop Sidebar (≥1024px) ── */}
      <aside className="hidden lg:flex w-[220px] shrink-0 h-screen bg-background border-r border-primary/20 flex-col fixed left-0 top-0 z-40 overflow-hidden">
        {sidebarContent}
      </aside>

      {/* ── Mobile Sidebar Overlay (<1024px) ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={close}
            />
            {/* Panel */}
            <motion.aside
              ref={sidebarRef}
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="fixed left-0 top-0 bottom-0 z-[70] w-[280px] bg-background border-r border-primary/20 flex flex-col overflow-hidden lg:hidden shadow-2xl shadow-black/50"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
})
