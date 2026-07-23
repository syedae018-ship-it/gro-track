"use client"
import { useAuth } from "@/hooks/use-auth"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useProfile, useNotifications } from "@/hooks/use-dashboard-data"
import { isAdmin } from "@/lib/utils/roles"
import { 
 Bell, Send, ShieldAlert, Laptop, Smartphone, Tablet, 
 Trash2, Check, CheckSquare, BellOff, Info, AlertTriangle, 
 CheckCircle2, Loader2, Calendar, User, Radio, Settings, Layers,
 Activity, Copy, Cpu, ShieldCheck, AlertCircle
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { useSWRConfig } from "swr"
import { usePWA } from "@/components/providers/PWAProvider"
import { 
 getEmployeesList, sendAdminNotification, 
 getNotificationLogs, registerFCMToken, unregisterFCMToken,
 sendTestPushAction
} from "./actions"

type Tab = "inbox" | "broadcast" | "logs" | "settings" | "diagnostics"
type CategoryFilter = "all" | "tasks" | "payments" | "attendance" | "announcements" | "system"

export default function NotificationsPage() {
 const [activeTab, setActiveTab] = useState<Tab>("inbox")
 const [filter, setFilter] = useState<CategoryFilter>("all")
 const [userId, setUserId] = useState<string | undefined>()

 const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    if(profile && profile.notification_settings) {
      setTaskSettings({
        deadline_notifications_enabled: profile.notification_settings.deadline_notifications_enabled || false,
        default_reminder_timings: profile.notification_settings.default_reminder_timings || []
      });
    }
  }, [profile])
 
 // Broadcast form states
 const [recipientType, setRecipientType] = useState<"single" | "selected" | "all">("all")
 const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
 const [broadcastTitle, setBroadcastTitle] = useState("")
 const [broadcastMessage, setBroadcastMessage] = useState("")
 const [broadcastCategory, setBroadcastCategory] = useState<any>("system")
 const [broadcastLink, setBroadcastLink] = useState("/dashboard/overview")
 const [sending, setSending] = useState(false)
 const [employees, setEmployees] = useState<any[]>([])
 const [deliveryLogs, setDeliveryLogs] = useState<any[]>([])
 
 // Device settings states
 const [devices, setDevices] = useState<any[]>([])
 const [loadingDevices, setLoadingDevices] = useState(false)

  const [taskSettings, setTaskSettings] = useState({ deadline_notifications_enabled: false, default_reminder_timings: [] });
  const [savingTaskSettings, setSavingTaskSettings] = useState(false);


  // Diagnostics states
  const [permissionStatus, setPermissionStatus] = useState<string>("checking...")
  const [swStatus, setSwStatus] = useState<string>("checking...")
  const [fcmToken, setFcmToken] = useState<string>("")
  const [firebaseInitialized, setFirebaseInitialized] = useState<boolean | null>(null)
  const [tokenSaved, setTokenSaved] = useState<boolean>(false)
  const [pendingReminderCount, setPendingReminderCount] = useState<number>(0)
  const [schedulerActive, setSchedulerActive] = useState<boolean>(false)
  const [backgroundMessagingActive, setBackgroundMessagingActive] = useState<boolean>(false)
  const [backgroundLogs, setBackgroundLogs] = useState<any[]>([])
  const [lastClickedTime, setLastClickedTime] = useState<string>("")
  const [testPushLoading, setTestPushLoading] = useState<boolean>(false)
  const [testPushResult, setTestPushResult] = useState<{
    success?: boolean;
    message?: string;
    mode?: "admin" | "mock";
    payload?: any;
    response?: any;
  } | null>(null)
  const [foregroundLogs, setForegroundLogs] = useState<any[]>([])
  const [testCategory, setTestCategory] = useState<"tasks" | "payments" | "attendance" | "announcements" | "system">("system")
  const [testType, setTestType] = useState<"info" | "success" | "warning" | "alert">("info")
  const [testTitle, setTestTitle] = useState("")
  const [testMessage, setTestMessage] = useState("")

  const { mutate } = useSWRConfig()
  const { requestNotificationPermission, isOnline } = usePWA()

  const runDiagnostics = async () => {
    if (typeof window === "undefined") return

    // 1. Permission status
    if (!("Notification" in window)) {
      setPermissionStatus("unsupported")
    } else {
      setPermissionStatus(Notification.permission)
    }

    // 2. Firebase initialized
    const isConfigured = !!(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    )
    setFirebaseInitialized(isConfigured)

    // 3. Service Worker status
    if (!("serviceWorker" in navigator)) {
      setSwStatus("unsupported")
    } else {
      try {
        const regs = await navigator.serviceWorker.getRegistrations()
        const mainSw = regs.find(r => r.active?.scriptURL.includes("sw.js"))
        if (mainSw) {
          setSwStatus(`active (combined SW running)`)
          setBackgroundMessagingActive(true)
        } else {
          setSwStatus("inactive")
          setBackgroundMessagingActive(false)
        }
      } catch (err: any) {
        setSwStatus(`error: ${err.message}`)
      }
    }

    // 4. Current FCM token & Database Save Check & Pending Count
    if (isConfigured && "Notification" in window && Notification.permission === "granted") {
      try {
        const { requestFCMToken } = await import("@/lib/firebase/config")
        const token = await requestFCMToken()
        setFcmToken(token || "Failed to retrieve token (VAPID key error or permission issues)")
        
        if (token && !token.includes(" ") && !token.includes("error")) {
          const supabase = createClient()
          
          // Check if token is in Database
          const { data: tokRecord } = await supabase
            .from("fcm_tokens")
            .select("id")
            .eq("token", token)
            .maybeSingle()
          setTokenSaved(!!tokRecord)

          // Get pending count
          const { count } = await supabase
            .from("task_reminders")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending")
          setPendingReminderCount(count || 0)

          // Check scheduler active (database connection + sent logs check)
          const { data: sentLogs, error: dbErr } = await supabase
            .from("task_reminders")
            .select("reminder_time")
            .eq("status", "sent")
            .limit(1)
          setSchedulerActive(!dbErr)
        } else {
          setTokenSaved(false)
        }
      } catch (err: any) {
        setFcmToken(`error: ${err.message}`)
        setTokenSaved(false)
      }
    } else {
      setFcmToken("Not registered (Notifications must be granted first)")
      setTokenSaved(false)
    }
  }

  const loadStoredLogs = () => {
    if (typeof window === "undefined") return
    const bLogs = JSON.parse(localStorage.getItem('background_notif_logs') || '[]')
    setBackgroundLogs(bLogs)
    const clicked = localStorage.getItem('last_notification_clicked') || ""
    setLastClickedTime(clicked)
  }

  useEffect(() => {
    loadStoredLogs()
    window.addEventListener('background_logs_updated', loadStoredLogs)
    window.addEventListener('last_clicked_updated', loadStoredLogs)
    return () => {
      window.removeEventListener('background_logs_updated', loadStoredLogs)
      window.removeEventListener('last_clicked_updated', loadStoredLogs)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "diagnostics") {
      runDiagnostics()

      // Subscribe to foreground messaging for dynamic console logs in diagnostics tab
      let unsubscribe = () => {}
      import("@/lib/firebase/config").then(({ onForegroundMessage }) => {
        unsubscribe = onForegroundMessage((payload) => {
          console.log("[Diagnostics Foreground Capture]", payload)
          setForegroundLogs((prev) => [
            {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              payload: payload
            },
            ...prev
          ])
          toast.success("Foreground notification captured by Diagnostics Console! ⚡")
        })
      }).catch(err => {
        console.warn("Diagnostics foreground registration failed:", err)
      })

      return () => unsubscribe()
    }
  }, [activeTab])

  const handleBypassTest = async () => {
    try {
      if (!("serviceWorker" in navigator)) {
        toast.error("Service Workers not supported in this browser.")
        return
      }
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification("GrowTrack Native Test", {
        body: "Bypass Test Successful! Chrome desktop notifications work.",
        icon: "/icons/icon-192x192.png",
        requireInteraction: true,
        tag: "bypass-test"
      })
      toast.success("Bypass test dispatched to Service Worker!")
    } catch (e: any) {
      toast.error(`Bypass test failed: ${e.message}`)
      console.error(e)
    }
  }

 const handleSendTestPush = async () => {
 if (!fcmToken || fcmToken.startsWith("error") || fcmToken.startsWith("Not registered") || fcmToken.startsWith("Failed")) {
 toast.error("Please enable notification permissions and verify your FCM token is valid first.")
 return
 }

 setTestPushLoading(true)
 setTestPushResult(null)

 try {
 const res = await sendTestPushAction(
  fcmToken,
  testCategory,
  testType,
  testTitle.trim() || undefined,
  testMessage.trim() || undefined
 )
 if (res.success) {
 setTestPushResult({
 success: true,
 message: "Test push sent from server successfully! If your browser permission is allowed, you should see a toast or push banner shortly.",
 mode: res.mode as "admin" | "mock" | undefined,
 payload: res.payload,
 response: res.response
 })
 toast.success("Diagnostic push triggered!")
 } else {
 setTestPushResult({
 success: false,
 message: (res as any).error || "An unknown error occurred while dispatching test notification.",
 mode: res.mode as "admin" | "mock" | undefined,
 payload: res.payload,
 response: res.response || (res as any).error
 })
 toast.error("Failed to send test push")
 }
 } catch (err: any) {
 setTestPushResult({
 success: false,
 message: err.message || "Network error occurred."
 })
 toast.error("Error triggering diagnostic push")
 } finally {
 setTestPushLoading(false)
 }
 }


 const handleCopyToken = () => {
 if (!fcmToken || fcmToken.includes(" ") || fcmToken.includes("error") || fcmToken.includes("Not registered")) {
 toast.error("No valid token to copy")
 return
 }
 navigator.clipboard.writeText(fcmToken)
 toast.success("FCM Token copied to clipboard! 📋")
 }

  const { data: session } = useAuth()

  // Fetch session & profile
  useEffect(() => {
    // @ts-ignore
    const id = session?.user?.id as string | undefined
    if (id) {
      setUserId(id)
      const supabase = createClient()
      supabase.from("profiles").select("*").eq("id", id).single().then(({ data: prof }) => {
        setProfile(prof)
      })
    }
  }, [session])

 // Fetch notifications
 const { data: notifications = [], mutate: mutateNotif } = useNotifications(userId)
 const admin = profile ? isAdmin(profile.role) : false

 // Load Admin broadcast data
 useEffect(() => {
 if (admin) {
 getEmployeesList().then(setEmployees)
 loadLogs()
 }
 }, [admin])

 // Load device tokens
 useEffect(() => {
 if (userId) {
 loadDevices()
 }
 }, [userId])

 const loadLogs = async () => {
 const logs = await getNotificationLogs()
 setDeliveryLogs(logs)
 }

 const loadDevices = async () => {
 setLoadingDevices(true)
 const supabase = createClient()
 const { data } = await supabase
 .from("fcm_tokens")
 .select("*")
 .eq("user_id", userId)
 setDevices(data || [])
 setLoadingDevices(false)
 }

 // Filtered notifications
 const filteredNotifications = notifications.filter((n: any) => {
 if (filter === "all") return true
 return n.category === filter
 })

 const unreadCount = notifications.filter((n: any) => !n.is_read).length

 // Action handlers
 const handleMarkAsRead = async (id: string, isRead: boolean) => {
 if (isRead) return
 const supabase = createClient()
 const { error } = await supabase
 .from("notifications")
 .update({ is_read: true })
 .eq("id", id)

 if (error) {
 toast.error("Failed to update notification")
 return
 }
 mutateNotif()
 mutate(`notifications-${userId}`)
 }

 const handleMarkAllRead = async () => {
 if (unreadCount === 0) return
 const supabase = createClient()
 const { error } = await supabase
 .from("notifications")
 .update({ is_read: true })
 .eq("user_id", userId)
 .eq("is_read", false)

 if (error) {
 toast.error("Failed to mark notifications read")
 return
 }
 mutateNotif()
 mutate(`notifications-${userId}`)
 toast.success("All notifications marked as read")
 }

 const handleClearAll = async () => {
 if (notifications.length === 0) return
 const supabase = createClient()
 const { error } = await supabase
 .from("notifications")
 .delete()
 .eq("user_id", userId)

 if (error) {
 toast.error("Failed to clear notifications")
 return
 }
 mutateNotif()
 mutate(`notifications-${userId}`)
 toast.success("Notifications cleared")
 }

 
  const handleSaveTaskSettings = async () => {
    setSavingTaskSettings(true);
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({ notification_settings: taskSettings }).eq('id', userId);
    setSavingTaskSettings(false);
    if(error) toast.error("Failed to save task settings");
    else toast.success("Task notification settings updated!");
  }

  const handleRemoveDevice = async (token: string) => {
 const res = await unregisterFCMToken(token)
 if (res.error) {
 toast.error("Failed to remove device")
 } else {
 toast.success("Device removed successfully")
 loadDevices()
 }
 }

 const handleSendBroadcast = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!broadcastTitle || !broadcastMessage) {
 toast.error("Title and Message are required")
 return
 }

 let recipientIds: string[] = []
 if (recipientType === "all") {
 recipientIds = employees.map(emp => emp.id)
 } else if (recipientType === "single" || recipientType === "selected") {
 recipientIds = selectedEmployees
 }

 if (recipientIds.length === 0) {
 toast.error("Please select at least one recipient")
 return
 }

 setSending(true)
 const res = await sendAdminNotification(
 recipientIds,
 broadcastTitle,
 broadcastMessage,
 broadcastCategory,
 broadcastLink
 )
 setSending(false)

 if (res.error) {
 toast.error(res.error)
 } else {
 toast.success("Broadcast sent successfully!")
 setBroadcastTitle("")
 setBroadcastMessage("")
 setSelectedEmployees([])
 loadLogs()
 }
 }

 const requestAlerts = async () => {
 const granted = await requestNotificationPermission()
 if (granted) {
 // Re-register FCM token
 const { requestFCMToken } = await import("@/lib/firebase/config")
 const token = await requestFCMToken()
 if (token) {
 let deviceType = "desktop"
 if (/Mobi|Android/i.test(navigator.userAgent)) deviceType = "mobile"
 else if (/Tablet|iPad/i.test(navigator.userAgent)) deviceType = "tablet"
 
 await registerFCMToken(token, deviceType)
 loadDevices()
 }
 }
 }

  return (
  <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-8">
    {permissionStatus === "denied" && (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed">
        <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
        <div>
          <span className="font-bold text-[13px] block">Notification Permissions Denied!</span>
          <p className="mt-1 opacity-90">
            Chrome is currently blocking native desktop notifications for this application. To receive critical task reminders:
          </p>
          <ul className="list-disc pl-4 mt-1.5 space-y-1 opacity-95">
            <li>Click the site controls icon (lock/sliders) to the left of the URL address bar.</li>
            <li>Change the **Notifications** selection from **Block** to **Allow**.</li>
            <li>Refresh this tab to automatically re-register your device.</li>
          </ul>
        </div>
      </div>
    )}
  {/* Navigation tabs */}
 <div className="flex border-b border-border gap-1.5 overflow-x-auto mobile-scroll-x scrollbar-none">
 <button
 onClick={() => setActiveTab("inbox")}
 className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
 activeTab === "inbox" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-muted-foreground"
 }`}
 >
 <Bell className="w-4 h-4" />
 Inbox Feed ({unreadCount})
 </button>

 {admin && (
 <>
 <button
 onClick={() => setActiveTab("broadcast")}
 className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
 activeTab === "broadcast" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-muted-foreground"
 }`}
 >
 <Send className="w-4 h-4" />
 Broadcast Centre
 </button>
 <button
 onClick={() => setActiveTab("logs")}
 className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
 activeTab === "logs" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-muted-foreground"
 }`}
 >
 <Layers className="w-4 h-4" />
 Delivery Logs
 </button>
 </>
 )}

 <button
 onClick={() => setActiveTab("settings")}
 className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
 activeTab === "settings" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-muted-foreground"
 }`}
 >
 <Settings className="w-4 h-4" />
 Device Registry
 </button>

 {admin && (
 <button
 onClick={() => setActiveTab("diagnostics")}
 className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
 activeTab === "diagnostics" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-muted-foreground"
 }`}
 >
 <Activity className="w-4 h-4" />
 PWA Diagnostics
 </button>
 )}
 </div>

 {/* Tab Contents */}
 <div className="flex-1">
 <AnimatePresence mode="wait">
 {activeTab === "inbox" && (
 <motion.div
 key="inbox"
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -8 }}
 className="flex flex-col gap-4"
 >
 {/* Category filters */}
 <div className="flex gap-1.5 overflow-x-auto mobile-scroll-x scrollbar-none pb-2 border-b border-border">
 {(["all", "tasks", "payments", "attendance", "announcements", "system"] as CategoryFilter[]).map(c => (
 <button
 key={c}
 onClick={() => setFilter(c)}
 className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all border shrink-0 ${
 filter === c
 ? "bg-primary/20 text-primary border-border hover:border-primary/30 shadow-sm"
 : "bg-muted text-muted-foreground border-transparent hover:text-muted-foreground hover:bg-muted"
 }`}
 >
 {c}
 </button>
 ))}

 <div className="ml-auto flex items-center gap-2 shrink-0">
 {unreadCount > 0 && (
 <button
 onClick={handleMarkAllRead}
 className="px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-primary-foreground bg-muted border border-border hover:bg-primary/20 hover:border-border hover:border-primary/30 rounded-xl transition-all flex items-center gap-1.5"
 >
 <CheckSquare className="w-3.5 h-3.5" />
 Mark Read
 </button>
 )}
 {notifications.length > 0 && (
 <button
 onClick={handleClearAll}
 className="px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-red-400 bg-muted border border-border hover:bg-red-500/10 hover:border-red-500/20 rounded-xl transition-all flex items-center gap-1.5"
 >
 <Trash2 className="w-3.5 h-3.5" />
 Clear
 </button>
 )}
 </div>
 </div>

 {/* Feed items */}
 <div className="flex flex-col divide-y divide-white/5 bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
 {filteredNotifications.length === 0 ? (
 <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
 <BellOff className="w-10 h-10 text-muted-foreground" />
 <p className="text-sm font-semibold">Inbox is clear</p>
 <p className="text-xs text-muted-foreground">No notifications in {filter} category.</p>
 </div>
 ) : (
 filteredNotifications.map((n: any) => {
 let catColor = "text-primary bg-primary/10 border-border hover:border-primary/30"
 if (n.category === "payments") catColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
 if (n.category === "attendance") catColor = "text-muted-foregroundmber-400 bg-amber-500/10 border-amber-500/20"
 if (n.category === "announcements") catColor = "text-violet-400 bg-violet-500/10 border-violet-500/20"
 if (n.category === "system") catColor = "text-muted-foreground bg-muted border-border"

 let typeColor = "text-primary"
 if (n.type === "success") typeColor = "text-emerald-400"
 if (n.type === "warning" || n.type === "alert") typeColor = "text-red-400"

 return (
 <div
 key={n.id}
 onClick={() => handleMarkAsRead(n.id, n.is_read)}
 className={`p-4 sm:p-5 flex gap-4 hover:bg-card/[0.015] cursor-pointer transition-colors relative group ${
 !n.is_read ? "bg-primary/[0.02]" : ""
 }`}
 >
 <div className="shrink-0 mt-0.5">
 <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${typeColor} bg-muted border border-border`}>
 {n.type === "success" ? (
 <CheckCircle2 className="w-4.5 h-4.5" />
 ) : n.type === "warning" || n.type === "alert" ? (
 <AlertTriangle className="w-4.5 h-4.5" />
 ) : (
 <Info className="w-4.5 h-4.5" />
 )}
 </div>
 </div>

 <div className="flex-1 min-w-0 pr-6">
 <div className="flex items-center gap-2 mb-1 flex-wrap">
 <h4 className={`text-sm font-semibold text-muted-foreground ${!n.is_read ? "font-bold text-foreground" : ""}`}>
 {n.title}
 </h4>
 <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${catColor}`}>
 {n.category}
 </span>
 <span className="text-[10px] text-muted-foreground">
 {new Date(n.created_at).toLocaleDateString(undefined, {
 month: "short",
 day: "numeric",
 hour: "2-digit",
 minute: "2-digit",
 })}
 </span>
 </div>
 <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">{n.message}</p>
 {n.link && (
 <a
 href={n.link}
 className="text-[11px] text-primary hover:text-primary-foreground font-semibold inline-flex items-center gap-0.5 mt-2 transition-colors"
 >
 Open Details →
 </a>
 )}
 </div>

 {!n.is_read && (
 <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={(e) => {
 e.stopPropagation()
 handleMarkAsRead(n.id, false)
 }}
 title="Mark read"
 className="w-8 h-8 rounded-xl bg-card border border-border hover:border-primary/30 flex items-center justify-center text-primary hover:text-primary-foreground hover:bg-primary transition-all shadow-sm"
 >
 <Check className="w-4 h-4" />
 </button>
 </div>
 )}
 </div>
 )
 })
 )}
 </div>
 </motion.div>
 )}

 {activeTab === "broadcast" && admin && (
 <motion.div
 key="broadcast"
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -8 }}
 className="grid grid-cols-1 lg:grid-cols-3 gap-6"
 >
 {/* Form */}
 <div className="lg:col-span-2 enterprise-card p-5 sm:p-6 bg-card">
 <h3 className="text-md font-bold text-foreground mb-5 flex items-center gap-2 font-syne uppercase tracking-wider">
 <Radio className="w-4 h-4 text-primary animate-pulse" /> Launch Push Broadcast
 </h3>

 <form onSubmit={handleSendBroadcast} className="flex flex-col gap-4">
 {/* Recipient Selection */}
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recipient Targeting</label>
 <div className="grid grid-cols-3 gap-2">
 {([
 { value: "all", label: "All Employees" },
 { value: "selected", label: "Select Multiple" },
 { value: "single", label: "Single User" }
 ] as const).map(t => (
 <button
 key={t.value}
 type="button"
 onClick={() => {
 setRecipientType(t.value)
 setSelectedEmployees([])
 }}
 className={`py-2 rounded-xl text-xs font-bold border transition-all ${
 recipientType === t.value
 ? "bg-primary/20 text-primary border-border hover:border-primary/30 shadow-sm"
 : "bg-muted border-transparent text-muted-foreground hover:text-muted-foreground"
 }`}
 >
 {t.label}
 </button>
 ))}
 </div>
 </div>

 {/* Multiple Select Dropdown / Checkboxes */}
 {(recipientType === "single" || recipientType === "selected") && (
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 {recipientType === "single" ? "Target Employee" : "Target Employees"}
 </label>
 <div className="max-h-40 overflow-y-auto border border-border bg-muted rounded-xl p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
 {employees
 .filter(emp => emp.role !== "managing_director")
 .map(emp => {
 const isChecked = selectedEmployees.includes(emp.id)
 return (
 <label
 key={emp.id}
 className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer border transition-all ${
 isChecked 
 ? "bg-primary/10 border-border hover:border-primary/30 text-foreground" 
 : "bg-transparent border-transparent text-muted-foreground hover:text-muted-foreground"
 }`}
 >
 <input
 type={recipientType === "single" ? "radio" : "checkbox"}
 name="targeted_employees"
 value={emp.id}
 checked={isChecked}
 onChange={(e) => {
 if (recipientType === "single") {
 setSelectedEmployees([emp.id])
 } else {
 if (e.target.checked) {
 setSelectedEmployees([...selectedEmployees, emp.id])
 } else {
 setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id))
 }
 }
 }}
 className="accent-primary"
 />
 <span className="text-xs font-semibold">{emp.full_name}</span>
 </label>
 )
 })}
 </div>
 </div>
 )}

 {/* Category & Link */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category</label>
 <select
 value={broadcastCategory}
 onChange={(e) => setBroadcastCategory(e.target.value)}
 className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-violet-500/50 appearance-none font-semibold capitalize"
 >
 {["tasks", "payments", "attendance", "announcements", "system"].map(c => (
 <option key={c} value={c} className="bg-background">{c}</option>
 ))}
 </select>
 </div>

 <div className="space-y-1.5">
 <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Destination Link (Deep-Link)</label>
 <input
 type="text"
 value={broadcastLink}
 onChange={(e) => setBroadcastLink(e.target.value)}
 placeholder="/dashboard/tasks"
 className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50"
 />
 </div>
 </div>

 {/* Title & Message */}
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notification Title</label>
 <input
 type="text"
 value={broadcastTitle}
 onChange={(e) => setBroadcastTitle(e.target.value)}
 placeholder="Enter broadcast title..."
 required
 className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Push Message Body</label>
 <textarea
 value={broadcastMessage}
 onChange={(e) => setBroadcastMessage(e.target.value)}
 placeholder="Enter body content..."
 rows={3}
 required
 className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 resize-none"
 />
 </div>

 <button
 type="submit"
 disabled={sending}
 className="w-full h-11 bg-primary rounded-xl text-xs uppercase tracking-wider font-bold text-primary-foreground shadow-sm transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
 >
 {sending ? (
 <><Loader2 className="w-4 h-4 animate-spin" /> Dispersing...</>
 ) : (
 <><Send className="w-3.5 h-3.5" /> Send Push Broadcast</>
 )}
 </button>
 </form>
 </div>

 {/* Quick Info */}
 <div className="enterprise-card p-5 flex flex-col gap-4 h-fit bg-card">
 <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
 <ShieldAlert className="w-4 h-4 text-violet-400" /> Broadcaster Guidelines
 </h4>
 <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
 <p>• Announcements push automatically to **all** active device tokens registered by the target employees.</p>
 <p>• Avoid sending multiple duplicate pushes. FCM will multicast to individual sockets.</p>
 <p>• The deep link specifies which page is opened when the employee clicks the mobile push banner.</p>
 </div>
 </div>
 </motion.div>
 )}

 {activeTab === "logs" && admin && (
 <motion.div
 key="logs"
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -8 }}
 className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl"
 >
 <div className="mobile-scroll-x">
 <div className="grid grid-cols-[1.5fr_2fr_3fr_1fr_1.5fr] px-4 py-3 border-b border-border min-w-[700px]">
 {["Recipient", "Title", "Message", "Category", "Sent At"].map(h => (
 <span key={h} className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{h}</span>
 ))}
 </div>

 <div className="divide-y divide-white/5 min-w-[700px]">
 {deliveryLogs.length === 0 ? (
 <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
 <Layers className="w-8 h-8 text-muted-foreground" />
 <p className="text-xs">No dispatch logs available</p>
 </div>
 ) : (
 deliveryLogs.map((log: any) => (
 <div key={log.id} className="grid grid-cols-[1.5fr_2fr_3fr_1fr_1.5fr] px-4 py-3 items-center gap-4 text-left">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-primary/10 border border-border hover:border-primary/30 flex items-center justify-center text-primary text-[10px] font-bold uppercase">
 {log.recipient?.full_name?.charAt(0) || "?"}
 </div>
 <span className="text-xs font-semibold text-muted-foreground truncate">{log.recipient?.full_name || "System"}</span>
 </div>
 <span className="text-xs font-semibold text-muted-foreground truncate">{log.title}</span>
 <span className="text-xs text-muted-foreground truncate pr-4">{log.message}</span>
 <div>
 <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">
 {log.category}
 </span>
 </div>
 <span className="text-xs text-muted-foreground">
 {new Date(log.created_at).toLocaleString(undefined, {
 month: "short",
 day: "numeric",
 hour: "2-digit",
 minute: "2-digit",
 })}
 </span>
 </div>
 ))
 )}
 </div>
 </div>
 </motion.div>
 )}

 {activeTab === "settings" && (
 <motion.div
 key="settings"
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -8 }}
 className="grid grid-cols-1 lg:grid-cols-3 gap-6"
 >
 
          {/* Task Settings */}
          <div className="lg:col-span-1 enterprise-card p-5 sm:p-6 bg-card flex flex-col gap-6">
            <div>
              <h3 className="text-md font-bold text-foreground font-syne uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" /> Task Notifications
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Configure default notification timings for new tasks.</p>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Enable Defaults</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={taskSettings.deadline_notifications_enabled} onChange={e => setTaskSettings(s => ({...s, deadline_notifications_enabled: e.target.checked}))} />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {taskSettings.deadline_notifications_enabled && (
                <div className="flex flex-col gap-2 border-t border-border pt-4">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Default Reminder Timings
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "5m before", value: 5 },
                      { label: "15m before", value: 15 },
                      { label: "30m before", value: 30 },
                      { label: "1h before", value: 60 },
                      { label: "6h before", value: 360 },
                      { label: "1d before", value: 1440 },
                      { label: "2d before", value: 2880 },
                    ].map(opt => {
                      const isSel = taskSettings.default_reminder_timings.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setTaskSettings(s => {
                               const timings = isSel ? s.default_reminder_timings.filter(v => v !== opt.value) : [...s.default_reminder_timings, opt.value];
                               return {...s, default_reminder_timings: timings};
                            });
                          }}
                          className={`px-2 py-1.5 text-[10px] rounded-lg font-medium border transition-all ${
                            isSel
                              ? "bg-primary/20 border-primary/40 text-primary"
                              : "bg-muted border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              
              <button
                onClick={handleSaveTaskSettings}
                disabled={savingTaskSettings}
                className="w-full h-10 bg-primary rounded-xl text-xs uppercase tracking-wider font-bold text-primary-foreground shadow-sm transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50 mt-2"
              >
                {savingTaskSettings ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </div>


          {/* Device token status */}
 <div className="lg:col-span-2 enterprise-card p-5 sm:p-6 bg-card flex flex-col gap-6">
 <div>
 <h3 className="text-md font-bold text-foreground font-syne uppercase tracking-wider flex items-center gap-2">
 <Laptop className="w-4 h-4 text-primary" /> Active Notification Devices
 </h3>
 <p className="text-xs text-muted-foreground mt-1">Below are the devices authorized to receive background push notifications on your account.</p>
 </div>

 <div className="flex flex-col divide-y divide-white/5 border border-border rounded-2xl bg-muted overflow-hidden">
 {loadingDevices ? (
 <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
 <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading devices...
 </div>
 ) : devices.length === 0 ? (
 <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
 <Smartphone className="w-8 h-8 text-muted-foreground" />
 <p className="text-xs font-semibold">No registered devices</p>
 <p className="text-[10px] text-muted-foreground px-6">You have not enabled push notifications on any device yet.</p>
 </div>
 ) : (
 devices.map((device: any) => {
 const DeviceIcon = 
 device.device_type === "mobile" ? Smartphone : 
 device.device_type === "tablet" ? Tablet : Laptop
 
 return (
 <div key={device.id} className="p-4 flex items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl bg-primary/10 border border-border hover:border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-sm">
 <DeviceIcon className="w-4.5 h-4.5" />
 </div>
 <div>
 <p className="text-xs font-bold text-foreground capitalize">{device.device_type} Terminal</p>
 <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[240px] sm:max-w-md">
 Token: {device.token.substring(0, 24)}...
 </p>
 <p className="text-[9px] text-muted-foreground">
 Active: {new Date(device.last_active).toLocaleString()}
 </p>
 </div>
 </div>

 <button
 onClick={() => handleRemoveDevice(device.token)}
 className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 flex items-center justify-center transition-all shrink-0 active:scale-90"
 title="De-authorize device"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 )
 })
 )}
 </div>
 </div>

 {/* Permission setup */}
 <div className="enterprise-card p-5 flex flex-col gap-4 h-fit bg-card">
 <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
 <Bell className="w-4 h-4 text-violet-400" /> Push Status
 </h4>
 
 <div className="text-xs text-muted-foreground leading-relaxed space-y-3">
 <p>In order to receive real-time push alerts when the app is closed, you must authorize browser permissions.</p>
 
 <div className="p-3 bg-muted border border-border rounded-xl text-muted-foreground">
 <p className="font-bold flex items-center gap-1.5 text-[11px] text-primary">
 Status: {typeof window !== "undefined" && "Notification" in window ? Notification.permission : "Not Supported"}
 </p>
 </div>

 <button
 onClick={requestAlerts}
 disabled={!isOnline}
 className="w-full h-10 bg-primary rounded-xl text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 mt-2"
 >
 Enable Push Notifications
 </button>
 </div>
 </div>
 </motion.div>
 )}

 {activeTab === "diagnostics" && admin && (
    <motion.div
      key="diagnostics"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Left Column: Diagnostics status list */}
      <div className="lg:col-span-2 enterprise-card p-5 sm:p-6 bg-card flex flex-col gap-6">
        <div>
          <h3 className="text-md font-bold text-foreground font-syne uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary animate-pulse" /> FCM Diagnostics Console
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time network, permission, service worker, and token validation for push notifications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Permission Status Card */}
          <div className="p-4 bg-muted border border-border rounded-2xl flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Permissions</span>
              {permissionStatus === "granted" ? (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Granted
                </span>
              ) : permissionStatus === "denied" ? (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  Denied
                </span>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Prompt Needed
                </span>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Browser Notifications</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {permissionStatus === "granted"
                  ? "Authorized to display native visual banner overlays on this operating system."
                  : permissionStatus === "denied"
                  ? "Explicitly blocked. You must clear browser notification permissions to retry."
                  : "Needs permission to trigger token generation and display notifications."}
              </p>
            </div>
          </div>

          {/* Service Worker Status Card */}
          <div className="p-4 bg-muted border border-border rounded-2xl flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Service Worker</span>
              {swStatus.startsWith("active") ? (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  Not Running
                </span>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Background SW Registry</p>
              <p className="text-[10px] text-muted-foreground mt-1 truncate" title={swStatus}>
                Status: <span className="font-semibold text-muted-foreground">{swStatus}</span>
              </p>
            </div>
          </div>

          {/* Firebase Config Status Card */}
          <div className="p-4 bg-muted border border-border rounded-2xl flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Firebase Connection</span>
              {firebaseInitialized ? (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Initialized
                </span>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Not Setup
                </span>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">SDK Client Credentials</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {firebaseInitialized
                  ? "Credentials successfully loaded. Client SDK is connected to Firebase projectId 'grotrack-5b1a7'."
                  : "Firebase API config variables are missing from .env.local on the server. Falling back to Realtime."}
              </p>
            </div>
          </div>

          {/* Token Saved Status Card */}
          <div className="p-4 bg-muted border border-border rounded-2xl flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Token Sync Status</span>
              {tokenSaved ? (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Synced
                </span>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  Not Saved
                </span>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Token Saved in Database</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {tokenSaved
                  ? "FCM Token is securely recorded in fcm_tokens database table for your session."
                  : "Token is not registered or found in the DB. Refresh to trigger auto-sync."}
              </p>
            </div>
          </div>

          {/* Scheduler Status Card */}
          <div className="p-4 bg-muted border border-border rounded-2xl flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reminder Engine</span>
              {schedulerActive ? (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Running
                </span>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  Inactive
                </span>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Scheduler Cron Status</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {schedulerActive
                  ? "Cron triggers are active. Background reminder checks are processed on schedule."
                  : "Scheduler database contact failed. Verify table permissions and migrations."}
              </p>
            </div>
          </div>

          {/* Pending Count Card */}
          <div className="p-4 bg-muted border border-border rounded-2xl flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Queue</span>
              <span className="text-[10px] font-extrabold font-mono px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                {pendingReminderCount}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Active Pending Reminders</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Total reminders currently scheduled in task_reminders table queue awaiting dispatch.
              </p>
            </div>
          </div>

          {/* Background Messaging Status Card */}
          <div className="p-4 bg-muted border border-border rounded-2xl flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Background Push</span>
              {backgroundMessagingActive ? (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  Inactive
                </span>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Background Messaging State</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {backgroundMessagingActive
                  ? "PWA is listening for background FCM triggers even when tab is minimized/closed."
                  : "No active service worker instance listening for notifications."}
              </p>
            </div>
          </div>

          {/* Last Clicked Status Card */}
          <div className="p-4 bg-muted border border-border rounded-2xl flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Interaction</span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Captured
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Last Click Event</p>
              <p className="text-[10px] text-muted-foreground mt-1 truncate" title={lastClickedTime || "None in active session"}>
                {lastClickedTime ? new Date(lastClickedTime).toLocaleString() : "No click recorded yet."}
              </p>
            </div>
          </div>

          {/* Network Connectivity Status Card */}
          <div className="p-4 bg-muted border border-border rounded-2xl flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Connectivity</span>
              {isOnline ? (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Online
                </span>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  Offline
                </span>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Network Link Status</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {isOnline 
                  ? "System is connected to the internet. Ready to receive server FCM push packets." 
                  : "Currently offline. Native push socket connections will queue until connection returns."}
              </p>
            </div>
          </div>
        </div>

        {/* Token Console */}
        <div className="p-4 sm:p-5 bg-muted border border-border rounded-2xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">FCM Registration Token</span>
            {fcmToken && !fcmToken.includes(" ") && !fcmToken.includes("error") && !fcmToken.includes("Not registered") && (
              <button
                onClick={handleCopyToken}
                className="text-[10px] font-bold text-primary hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Token
              </button>
            )}
          </div>
          <textarea
            readOnly
            value={fcmToken}
            rows={2}
            className="w-full bg-muted border border-border rounded-xl p-3 text-[11px] font-mono text-muted-foreground select-all focus:outline-none focus:border-border resize-none leading-relaxed"
          />
          <p className="text-[10px] text-muted-foreground leading-normal">
            This unique token identifies this browser/PWA instance. It is stored securely in the database to target push payloads to this device.
          </p>
        </div>

        {/* Live Captures Console */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Foreground Captures */}
          <div className="p-4 sm:p-5 bg-muted border border-border rounded-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Live Foreground Captures (Active Session)</span>
              {foregroundLogs.length > 0 && (
                <button
                  onClick={() => setForegroundLogs([])}
                  className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear Logs
                </button>
              )}
            </div>
            {foregroundLogs.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-[11px] border border-dashed border-border rounded-xl font-mono">
                Listening for incoming foreground push notifications...
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {foregroundLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-card border border-border rounded-xl flex flex-col gap-1.5 font-mono text-[10px] text-muted-foreground">
                    <div className="flex justify-between text-muted-foreground border-b border-border pb-1">
                      <span>Time: {log.timestamp}</span>
                      <span className="text-primary font-bold">Captured ⚡</span>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap text-[9px] text-emerald-400">{JSON.stringify(log.payload, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Background Captures */}
          <div className="p-4 sm:p-5 bg-muted border border-border rounded-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Live Background Captures</span>
              {backgroundLogs.length > 0 && (
                <button
                  onClick={() => {
                    localStorage.removeItem('background_notif_logs')
                    setBackgroundLogs([])
                  }}
                  className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear Logs
                </button>
              )}
            </div>
            {backgroundLogs.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-[11px] border border-dashed border-border rounded-xl font-mono">
                Listening for background push notifications... (Captured via SW BroadcastChannel)
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {backgroundLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-card border border-border rounded-xl flex flex-col gap-1.5 font-mono text-[10px] text-muted-foreground">
                    <div className="flex justify-between text-muted-foreground border-b border-border pb-1">
                      <span>Time: {log.timestamp}</span>
                      <span className="text-violet-400 font-bold">SW Received 📥</span>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap text-[9px] text-violet-400">{JSON.stringify(log.payload, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

 {/* Right Column: Actions */}
 <div className="flex flex-col gap-4">
 <div className="enterprise-card p-5 bg-card flex flex-col gap-4">
 <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
 <Cpu className="w-4 h-4 text-primary" /> Test Controls
 </h4>
 <p className="text-xs text-muted-foreground leading-relaxed">
 Trigger a server-side push notification targeted directly to the above token on this device.
 </p>

 {/* Custom Test Configuration */}
 <div className="grid grid-cols-2 gap-3">
   <div className="flex flex-col gap-1.5">
     <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category</label>
     <select
       value={testCategory}
       onChange={(e) => setTestCategory(e.target.value as any)}
       className="w-full h-9 bg-muted border border-border rounded-xl px-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
     >
       <option value="system">System</option>
       <option value="tasks">Tasks</option>
       <option value="payments">Payments</option>
       <option value="attendance">Attendance</option>
       <option value="announcements">Announcements</option>
     </select>
   </div>

   <div className="flex flex-col gap-1.5">
     <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Alert Type</label>
     <select
       value={testType}
       onChange={(e) => setTestType(e.target.value as any)}
       className="w-full h-9 bg-muted border border-border rounded-xl px-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
     >
       <option value="info">Info</option>
       <option value="success">Success</option>
       <option value="warning">Warning</option>
       <option value="alert">Alert</option>
     </select>
   </div>
 </div>

 <div className="flex flex-col gap-1.5">
   <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Custom Title (Optional)</label>
   <input
     type="text"
     placeholder="e.g. Task Deadline Approaching ⏰"
     value={testTitle}
     onChange={(e) => setTestTitle(e.target.value)}
     className="w-full h-9 bg-muted border border-border rounded-xl px-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
   />
 </div>

 <div className="flex flex-col gap-1.5">
   <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Custom Body (Optional)</label>
   <textarea
     placeholder="Enter custom testing message..."
     value={testMessage}
     onChange={(e) => setTestMessage(e.target.value)}
     rows={2}
     className="w-full bg-muted border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary resize-none"
   />
 </div>

  <div className="flex flex-col gap-2">
  <button
  onClick={handleSendTestPush}
  disabled={testPushLoading || !fcmToken || fcmToken.includes(" ") || fcmToken.includes("error") || fcmToken.includes("Not registered")}
  className="w-full h-11 bg-primary rounded-xl text-xs uppercase tracking-wider font-bold text-primary-foreground shadow-sm transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
  >
  {testPushLoading ? (
  <><Loader2 className="w-4.5 h-4.5 animate-spin" /> Transmitting...</>
  ) : (
  <><Send className="w-4 h-4" /> Trigger Local Push</>
  )}
  </button>

  <button
  onClick={handleBypassTest}
  className="w-full h-10 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl text-xs font-bold transition-all border border-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
  >
  <ShieldCheck className="w-4 h-4" /> Bypass SW Test
  </button>

  <button
  onClick={runDiagnostics}
  className="w-full h-10 bg-muted hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl text-xs font-bold transition-all border border-border active:scale-95 mt-1"
  >
  Refresh Status
  </button>
  </div>
 </div>

 {/* Diagnostic Results Box */}
 {testPushResult && (
 <div className={`p-5 rounded-2xl border text-xs flex flex-col gap-3 ${
 testPushResult.success 
 ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
 : "bg-red-500/5 border-red-500/20 text-red-300"
 }`}>
 <div className="flex items-center justify-between border-b border-border pb-2">
 <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
 {testPushResult.success ? (
 <>
 <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" /> Dispatch Successful
 </>
 ) : (
 <>
 <AlertCircle className="w-4 h-4 text-red-400" /> Dispatch Failed
 </>
 )}
 </div>
 <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${
 testPushResult.mode === "admin" 
 ? "bg-primary/20 text-primary border-border hover:border-primary/30" 
 : "bg-amber-500/10 text-muted-foregroundmber-400 border-amber-500/20"
 }`}>
 {testPushResult.mode === "admin" ? "Firebase Admin SDK" : "Mock / Bypass Mode"}
 </span>
 </div>

 <p className="leading-relaxed text-[11px]">{testPushResult.message}</p>

 {/* Exact JSON Payload */}
 {testPushResult.payload && (
 <div className="space-y-1.5 mt-1">
 <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold block">Exact Push Payload (JSON)</span>
 <pre className="p-3 bg-muted border border-border rounded-xl font-mono text-[9px] text-muted-foreground overflow-x-auto whitespace-pre">
 {JSON.stringify(testPushResult.payload, null, 2)}
 </pre>
 </div>
 )}

 {/* Exact Firebase Response */}
 {testPushResult.response && (
 <div className="space-y-1.5">
 <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold block">Firebase SDK / Mock Response</span>
 <pre className="p-3 bg-muted border border-border rounded-xl font-mono text-[9px] text-muted-foreground overflow-x-auto whitespace-pre">
 {JSON.stringify(testPushResult.response, null, 2)}
 </pre>
 </div>
 )}

 {!testPushResult.success && !testPushResult.mode && (
 <div className="mt-2 pt-2 border-t border-red-500/10 text-[10px] text-red-400/70 leading-normal">
 <strong>Troubleshooting Tip:</strong> Make sure you have added your Firebase Service Account JSON credentials to `.env.local` to enable server messaging. If it is empty, pushes run in Mock (bypass) mode.
 </div>
 )}
 </div>
 )}
 </div>
 </motion.div>
 )}

 </AnimatePresence>
 </div>
 </div>
 )
}
