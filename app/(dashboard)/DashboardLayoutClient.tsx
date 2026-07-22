"use client"

import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"
import { SidebarProvider } from "@/components/layout/SidebarContext"
import { motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { SWRProvider } from "@/lib/swr-provider"
import { ReminderCron } from "@/components/shared/ReminderCron"

interface DashboardLayoutClientProps {
 children: React.ReactNode
 isGuest: boolean
 user: any
 profile: { full_name: string; role: string; avatar_url?: string | null; specialization?: string | null } | null
}

export function DashboardLayoutClient({
 children,
 isGuest,
 user,
 profile
}: DashboardLayoutClientProps) {
 const pathname = usePathname()

 return (
 <SWRProvider>
 <SidebarProvider>
 <ReminderCron />
 <div className="flex h-[100dvh] overflow-hidden bg-background relative">
 <div className="absolute inset-0 bg-hero-glow pointer-events-none opacity-40 mix-blend-screen" />
 <Sidebar user={user} isGuest={isGuest} profile={profile} />
 <div className="flex flex-col flex-1 ml-0 lg:ml-[220px] min-w-0 z-10 transition-[margin] duration-300">
 {isGuest && (
 <div className="bg-primary/10 border-b border-border hover:border-primary/30 text-primary text-xs font-medium py-2 px-4 text-center shadow-md">
 👀 Guest Demo Mode — Read-only preview
 </div>
 )}
 <Topbar user={user} isGuest={isGuest} profile={profile} />
 <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 pt-2 relative will-change-scroll overscroll-contain">
 <motion.div
 key={pathname}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ duration: 0.12, ease: "easeOut" }}
 className="h-full"
 >
 {children}
 </motion.div>
 </main>
 </div>
 </div>
 </SidebarProvider>
 </SWRProvider>
 )
}
