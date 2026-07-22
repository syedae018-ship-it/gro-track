"use client"

import React, { useState, useRef, useEffect } from "react"
import { 
 Bell, Search, LogOut, Settings, Menu, Download, X, 
 Share, PlusSquare, Trash2, Check, CheckSquare, BellOff, Info, AlertTriangle, CheckCircle2
} from "lucide-react"
import { logout } from "@/app/(auth)/actions"
import { useSidebar } from "./SidebarContext"
import { usePWA } from "@/components/providers/PWAProvider"
import { useNotifications } from "@/hooks/use-dashboard-data"
import { createClient } from "@/lib/supabase/client"
import { useSWRConfig } from "swr"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { ThemeToggle } from "@/components/theme-toggle"

interface TopbarProps {
 user: any
 isGuest: boolean
 profile?: { full_name: string; role: string } | null
}

export const Topbar = React.memo(function Topbar({ user, isGuest, profile }: TopbarProps) {
 const displayName = isGuest ? "Guest User" : profile?.full_name || user?.user_metadata?.full_name || "User"
 const displayEmail = isGuest ? "demo@grotrack.app" : user?.email
 
 const [dropdownOpen, setDropdownOpen] = useState(false)
 const [notificationsOpen, setNotificationsOpen] = useState(false)
 
 const dropdownRef = useRef<HTMLDivElement>(null)
 const notificationsRef = useRef<HTMLDivElement>(null)
 
 const { toggle } = useSidebar()
 const { mutate } = useSWRConfig()
 
 const { 
 isInstallable, 
 isInstalled, 
 isIOS, 
 installApp, 
 showIOSPrompt, 
 setShowIOSPrompt,
 requestNotificationPermission 
 } = usePWA()

 // Fetch notifications
 const { data: notifications = [] } = useNotifications(user?.id)
 
 // Calculate unread count
 const unreadCount = notifications.filter((n: any) => !n.is_read).length

 useEffect(() => {
 function handleClickOutside(event: MouseEvent) {
 if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
 setDropdownOpen(false)
 }
 if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
 setNotificationsOpen(false)
 }
 }
 document.addEventListener("mousedown", handleClickOutside)
 return () => document.removeEventListener("mousedown", handleClickOutside)
 }, [])

 // Mark single notification as read
 const handleMarkAsRead = async (notification: any, event: React.MouseEvent) => {
 event.stopPropagation() // prevent dropdown close
 
 if (notification.is_read) {
 if (notification.link) {
 window.location.href = notification.link
 }
 return
 }

 const supabase = createClient()
 const { error } = await supabase
 .from("notifications")
 .update({ is_read: true })
 .eq("id", notification.id)

 if (error) {
 toast.error("Failed to update notification")
 return
 }

 // Refresh notifications SWR cache
 mutate(`notifications-${user?.id}`)
 
 if (notification.link) {
 window.location.href = notification.link
 }
 }

 // Mark all as read
 const handleMarkAllRead = async () => {
 if (unreadCount === 0) return

 const supabase = createClient()
 const { error } = await supabase
 .from("notifications")
 .update({ is_read: true })
 .eq("user_id", user?.id)
 .eq("is_read", false)

 if (error) {
 toast.error("Failed to mark notifications as read")
 return
 }

 mutate(`notifications-${user?.id}`)
 toast.success("All notifications marked as read")
 }

 // Clear all notifications
 const handleClearAll = async () => {
 if (notifications.length === 0) return

 const supabase = createClient()
 const { error } = await supabase
 .from("notifications")
 .delete()
 .eq("user_id", user?.id)

 if (error) {
 toast.error("Failed to clear notifications")
 return
 }

 mutate(`notifications-${user?.id}`)
 toast.success("All notifications cleared")
 }

 // Format created_at nicely
 const formatTimeAgo = (dateString: string) => {
 const date = new Date(dateString)
 const now = new Date()
 const diffMs = now.getTime() - date.getTime()
 const diffMins = Math.floor(diffMs / (1000 * 60))
 const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
 const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

 if (diffMins < 1) return "Just now"
 if (diffMins < 60) return `${diffMins}m ago`
 if (diffHours < 24) return `${diffHours}h ago`
 if (diffDays === 1) return "Yesterday"
 return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
 }

  return (
    <div className="p-4 sm:p-6 sticky top-0 z-30 w-full pb-safe">
      <header className="h-[64px] sm:h-[72px] bg-card/80 backdrop-blur-md rounded-[24px] flex items-center justify-between px-4 sm:px-6 shadow-sm border border-border">
 
 {/* Left side — Hamburger + Search */}
 <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
 {/* Hamburger — mobile only */}
 <button 
 onClick={toggle}
 className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full bg-input border border-border text-secondary-foreground hover:text-primary-foreground hover:bg-primary/20 hover:border-border hover:border-primary/30 transition-all active:scale-95 shrink-0"
 aria-label="Toggle sidebar menu"
 >
 <Menu className="w-[18px] h-[18px]" />
 </button>

        {/* Search — full on desktop, icon on mobile */}
        <button className="hidden sm:flex items-center text-[14px] text-muted-foreground hover:text-foreground transition-colors flex-1 max-w-xl bg-transparent border-0 rounded-full h-12 px-5 focus:outline-none">
          <Search className="w-5 h-5 mr-3 text-[#6D5DFC]" />
          <span className="flex-1 text-left">Search tasks, clients...</span>
          <div className="ml-auto flex items-center gap-1.5">
            <kbd className="bg-[#6D5DFC]/10 text-[#6D5DFC] rounded-md px-2 py-0.5 text-[11px] font-bold font-sans">⌘</kbd>
            <kbd className="bg-[#6D5DFC]/10 text-[#6D5DFC] rounded-md px-2 py-0.5 text-[11px] font-bold font-sans">K</kbd>
          </div>
        </button>
 {/* Mobile search icon */}
 <button className="sm:hidden w-10 h-10 flex items-center justify-center rounded-full bg-input border border-border text-secondary-foreground hover:text-primary-foreground hover:bg-primary/20 transition-all active:scale-95 shrink-0">
 <Search className="w-[18px] h-[18px]" />
 </button>
 </div>

 {/* Right Actions */}
 <div className="flex items-center gap-2 sm:gap-4 shrink-0">
 
 {/* Theme Toggle */}
 <ThemeToggle />

          {/* Notifications Bell */}
          <div className="relative" ref={notificationsRef}>
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-400 rounded-full border border-card" />
              )}
            </button>

 {/* Notifications Dropdown */}
 {notificationsOpen && (
 <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-border hover:border-primary/30 bg-card shadow-md overflow-hidden py-2 z-50 max-h-[480px] flex flex-col">
 <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
 <div>
 <h3 className="text-sm font-bold text-foreground">Notifications</h3>
 <p className="text-[10px] text-muted-foreground mt-0.5">{unreadCount} unread updates</p>
 </div>
 <div className="flex gap-2">
 {unreadCount > 0 && (
 <button 
 onClick={handleMarkAllRead} 
 title="Mark all as read"
 className="p-1.5 rounded-lg bg-muted border border-border text-muted-foreground hover:text-primary-foreground hover:bg-primary/20 transition-all"
 >
 <CheckSquare className="w-3.5 h-3.5" />
 </button>
 )}
 {notifications.length > 0 && (
 <button 
 onClick={handleClearAll} 
 title="Clear all"
 className="p-1.5 rounded-lg bg-muted border border-border text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 )}
 </div>
 </div>

 <div className="flex-1 overflow-y-auto divide-y divide-border/50 overscroll-contain">
 {notifications.length === 0 ? (
 <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
 <BellOff className="w-8 h-8 text-muted-foreground" />
 <p className="text-xs">No notifications yet</p>
 </div>
 ) : (
 notifications.map((n: any) => {
 // Icon color based on type
 let iconColor = "text-primary bg-primary/10"
 if (n.type === "success") iconColor = "text-emerald-400 bg-emerald-500/10"
 if (n.type === "warning") iconColor = "text-yellow-400 bg-yellow-500/10"
 if (n.type === "alert") iconColor = "text-red-400 bg-red-500/10"
 
 return (
 <div 
 key={n.id} 
 onClick={(e) => handleMarkAsRead(n, e)}
 className={`p-3.5 flex gap-3 hover:bg-card/[0.02] cursor-pointer transition-colors relative group ${!n.is_read ? 'bg-primary/5' : ''}`}
 >
 <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
 {n.type === "success" ? (
 <CheckCircle2 className="w-4 h-4" />
 ) : n.type === "warning" || n.type === "alert" ? (
 <AlertTriangle className="w-4 h-4" />
 ) : (
 <Info className="w-4 h-4" />
 )}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between gap-1">
 <p className={`text-xs font-semibold text-muted-foreground truncate ${!n.is_read ? 'font-bold text-foreground' : ''}`}>{n.title}</p>
 <span className="text-[9px] text-muted-foreground shrink-0 mt-0.5">{formatTimeAgo(n.created_at)}</span>
 </div>
 <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
 </div>
 
 {!n.is_read && (
 <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
 <button 
 onClick={(e) => handleMarkAsRead(n, e)}
 title="Mark read"
 className="w-6 h-6 rounded-full bg-card border border-border hover:border-primary/30 flex items-center justify-center text-primary hover:text-primary-foreground hover:bg-primary transition-all"
 >
 <Check className="w-3 h-3" />
 </button>
 </div>
 )}
 </div>
 )
 })
 )}
 </div>

 <div className="px-4 py-2.5 border-t border-border text-center bg-card/[0.015]">
 <button 
 onClick={() => { setNotificationsOpen(false); window.location.href = "/dashboard/notifications" }}
 className="text-xs text-primary hover:text-foreground font-bold transition-colors"
 >
 View All Notifications
 </button>
 </div>
 </div>
 )}
 </div>

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-10 h-10 rounded-full bg-[#6D5DFC] shadow-sm flex items-center justify-center overflow-hidden hover:brightness-110 hover:shadow-md transition-all active:scale-95"
            >
              <span className="text-sm font-bold text-white">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </button>

 {dropdownOpen && (
 <div className="absolute right-0 mt-3 w-52 rounded-2xl border border-border hover:border-primary/30 bg-card shadow-md overflow-hidden py-2 z-50">
 <div className="px-4 py-3 border-b border-border/50 mb-1">
 <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
 <p className="text-xs text-muted-foreground truncate hidden sm:block">{displayEmail}</p>
 </div>
 
 {/* Custom Install App CTA */}
 {isInstallable && !isInstalled && (
 <button 
 onClick={() => { setDropdownOpen(false); installApp() }}
 className="w-full text-left px-4 py-2.5 text-sm text-primary hover:text-primary-foreground hover:bg-primary/20 flex items-center gap-3 transition-colors font-semibold"
 >
 <Download className="w-4 h-4 animate-bounce" />
 Install GroTrack App
 </button>
 )}

 {isIOS && !isInstalled && (
 <button 
 onClick={() => { setDropdownOpen(false); setShowIOSPrompt(true) }}
 className="w-full text-left px-4 py-2.5 text-sm text-primary hover:text-primary-foreground hover:bg-primary/20 flex items-center gap-3 transition-colors font-semibold"
 >
 <Download className="w-4 h-4" />
 Install App (iOS)
 </button>
 )}

 {/* Enable Notifications Permission Helper */}
 {typeof window !== "undefined" && "Notification" in window && Notification.permission === "default" && (
 <button 
 onClick={() => { setDropdownOpen(false); requestNotificationPermission() }}
 className="w-full text-left px-4 py-2.5 text-sm text-muted-foregroundmber-400 hover:text-foreground hover:bg-amber-500/10 flex items-center gap-3 transition-colors font-medium"
 >
 <Bell className="w-4 h-4" />
 Enable Alerts
 </button>
 )}

 <button 
 onClick={() => { setDropdownOpen(false); window.location.href = "/dashboard/settings" }}
 className="w-full text-left px-4 py-2.5 text-sm text-secondary-foreground hover:text-primary hover:bg-primary/10 flex items-center gap-3 transition-colors"
 >
 <Settings className="w-4 h-4" />
 Account Settings
 </button>
 
 <form action={logout}>
 <button type="submit" className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-3 transition-colors border-t border-border mt-1 pt-2">
 <LogOut className="w-4 h-4" />
 Sign Out
 </button>
 </form>
 </div>
 )}
 </div>
 </div>
 </header>

 {/* iOS Install Prompt Dialog */}
 <AnimatePresence>
 {showIOSPrompt && (
 <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-muted ">
 <motion.div
 initial={{ y: 100, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 exit={{ y: 100, opacity: 0 }}
 transition={{ type: "spring", damping: 25, stiffness: 280 }}
 className="w-full max-w-md bg-card border border-border hover:border-primary/30 rounded-t-[2.5rem] sm:rounded-3xl p-6 relative shadow-2xl pb-safe"
 >
 <button
 onClick={() => setShowIOSPrompt(false)}
 className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-muted"
 aria-label="Close"
 >
 <X className="w-5 h-5" />
 </button>
 
 <div className="flex flex-col items-center text-center gap-4">
 <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-sm shrink-0">
 <img src="/icons/icon-180x180.png" alt="GroTrack" className="w-12 h-12 object-contain rounded-xl" />
 </div>
 <div>
 <h3 className="text-xl font-extrabold text-foreground font-syne tracking-tight">Install GroTrack PWA</h3>
 <p className="text-xs text-muted-foreground mt-1.5 px-4">Install GroTrack to run as a fullscreen standalone app, with offline access and instant push alerts.</p>
 </div>
 
 <div className="w-full bg-card/[0.02] border border-border rounded-2xl p-5 text-left space-y-4 text-sm text-muted-foreground mt-2">
 <div className="flex items-start gap-4">
 <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
 <p className="leading-relaxed">
 Tap the <span className="font-bold text-primary">Share</span> button in Safari's bottom browser bar (looks like <Share className="w-4 h-4 inline align-middle text-primary mx-1" />).
 </p>
 </div>
 <div className="flex items-start gap-4">
 <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
 <p className="leading-relaxed">
 Scroll down the options and select <span className="font-bold text-primary">Add to Home Screen</span> (looks like <PlusSquare className="w-4 h-4 inline align-middle text-primary mx-1" />).
 </p>
 </div>
 </div>
 
 <button
 onClick={() => setShowIOSPrompt(false)}
 className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-xl text-sm transition-all hover:opacity-90 active:scale-95 mt-4"
 >
 Okay, Got It
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 </div>
 )
})
