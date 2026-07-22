import React, { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
 CheckCircle2, Clock, AlertTriangle, Zap, IndianRupee, 
 TrendingUp, Flame, Eye, ChevronRight, Play, Coffee, Loader2, LogOut
} from "lucide-react"
import { TASK_STATUSES, PRIORITY_CONFIG } from "@/lib/utils/roles"
import { QuickCompleteModal } from "./QuickCompleteModal"
import { formatINR, safeNum } from "@/lib/utils/currency"
import { useProfile } from "@/hooks/use-dashboard-data"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useSWRConfig } from "swr"

interface EmployeeDashboardProps {
 userId: string
 userName: string
 tasksDoneTotal: number
 tasksDoneThisWeek: number
 tasksDoneToday: number
 overdueTasks: number
 inReview: number
 inProgress: number
 pending: number
 totalEarnings: number
 totalPaid: number
 pendingEarnings: number
 avgTurnaroundHours: number | null
 activeTasks: any[]
 attendanceLogs?: any[]
}

export const EmployeeDashboard = React.memo(function EmployeeDashboard(props: EmployeeDashboardProps) {
 const [earningsFilter, setEarningsFilter] = useState<'30' | '60' | '90' | 'all'>('all')
 const [workedHoursFilter, setWorkedHoursFilter] = useState<'week' | 'month' | '30' | '60' | 'all'>('week')
 const [completeTask, setCompleteTask] = useState<any | null>(null)
 const [updatingStatus, setUpdatingStatus] = useState(false)
 const [time, setTime] = useState(new Date())

 const totalWorkedHours = useMemo(() => {
    const logs = props.attendanceLogs || []
    const now = new Date()
    let filteredLogs = logs

    if (workedHoursFilter === 'week') {
      const cutoff = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
      filteredLogs = logs.filter(log => log.check_in && new Date(log.check_in) >= cutoff)
    } else if (workedHoursFilter === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      filteredLogs = logs.filter(log => log.check_in && new Date(log.check_in) >= startOfMonth)
    } else if (workedHoursFilter === '30') {
      const cutoff = new Date(now.getTime() - 30 * 24 * 3600 * 1000)
      filteredLogs = logs.filter(log => log.check_in && new Date(log.check_in) >= cutoff)
    } else if (workedHoursFilter === '60') {
      const cutoff = new Date(now.getTime() - 60 * 24 * 3600 * 1000)
      filteredLogs = logs.filter(log => log.check_in && new Date(log.check_in) >= cutoff)
    }

    const totalMins = filteredLogs.reduce((acc, log) => acc + (log.duration_minutes || 0), 0)
    return Number((totalMins / 60).toFixed(1))
  }, [props.attendanceLogs, workedHoursFilter])

  // SWR profile binding for check-in status
  const { data: profileData } = useProfile(props.userId)
  const { mutate } = useSWRConfig()

  const currentStatus = profileData?.current_status || "checked_out"

  const [localStatus, setLocalStatus] = useState<'checked_in' | 'break' | 'checked_out' | null>(null)
  const [localActiveCheckInTime, setLocalActiveCheckInTime] = useState<number | null>(null)
  const [isWorkReportOpen, setIsWorkReportOpen] = useState(false)

  // Load from local storage on mount
  useEffect(() => {
    const cachedStatus = localStorage.getItem("grotrack_current_status") as any
    const cachedTime = localStorage.getItem("grotrack_active_check_in_time")
    if (cachedStatus) {
      setLocalStatus(cachedStatus)
    }
    if (cachedTime) {
      setLocalActiveCheckInTime(Number(cachedTime))
    }
  }, [])

  // Sync SWR status to local status and localStorage
  useEffect(() => {
    if (profileData?.current_status) {
      setLocalStatus(profileData.current_status)
      localStorage.setItem("grotrack_current_status", profileData.current_status)
    }
  }, [profileData?.current_status])

  const logs = props.attendanceLogs || []

  // Get active check-in time from DB logs
  const dbActiveCheckInTime = useMemo(() => {
    const active = logs.find(log => !log.check_out)
    return active ? new Date(active.check_in).getTime() : null
  }, [logs])

  // Sync DB active check-in time to local active check-in time and localStorage
  useEffect(() => {
    if (dbActiveCheckInTime) {
      setLocalActiveCheckInTime(dbActiveCheckInTime)
      localStorage.setItem("grotrack_active_check_in_time", dbActiveCheckInTime.toString())
    } else if (props.attendanceLogs) {
      setLocalActiveCheckInTime(null)
      localStorage.removeItem("grotrack_active_check_in_time")
    }
  }, [dbActiveCheckInTime, props.attendanceLogs])

  const statusToUse = localStatus !== null ? localStatus : currentStatus
  const statusEmoji = statusToUse === "checked_in" ? "🟢" : statusToUse === "break" ? "☕" : "🔴"

  // Day Stats Calculator with Clamping & Rollover
  const getDayStats = (date: Date) => {
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)
    const dayStart = targetDate.getTime()
    const dayEnd = targetDate.getTime() + 24 * 3600 * 1000 - 1

    const overlappingLogs = logs.filter(log => {
      const checkIn = new Date(log.check_in).getTime()
      const checkOut = log.check_out ? new Date(log.check_out).getTime() : time.getTime()
      return checkIn <= dayEnd && checkOut >= dayStart
    }).sort((a,b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime())

    let workedSecs = 0
    let breakSecs = 0
    let firstIn = null
    let lastOut = null

    // First Check-in today: must be a check-in that actually happened today
    const firstLogOnDay = overlappingLogs.find(log => new Date(log.check_in).getTime() >= dayStart)
    if (firstLogOnDay) firstIn = firstLogOnDay.check_in
    else if (overlappingLogs.length > 0) firstIn = new Date(dayStart).toISOString()

    // Last Check-out today: must be a check-out that actually happened today
    if (overlappingLogs.length > 0) {
      const lastLog = overlappingLogs[overlappingLogs.length - 1]
      if (lastLog.check_out && new Date(lastLog.check_out).getTime() <= dayEnd) {
        lastOut = lastLog.check_out
      }
    }

    // Sum worked seconds clamped to day boundaries
    overlappingLogs.forEach(log => {
      const sessionStart = Math.max(new Date(log.check_in).getTime(), dayStart)
      const sessionEnd = Math.min(log.check_out ? new Date(log.check_out).getTime() : time.getTime(), dayEnd)
      if (sessionStart < sessionEnd) {
        workedSecs += Math.floor((sessionEnd - sessionStart) / 1000)
      }
    })

    // Sum break seconds (gaps between sessions) clamped to day boundaries
    for (let i = 0; i < overlappingLogs.length - 1; i++) {
      const log = overlappingLogs[i]
      if (log.check_out) {
        const gapStart = Math.max(new Date(log.check_out).getTime(), dayStart)
        const gapEnd = Math.min(new Date(overlappingLogs[i+1].check_in).getTime(), dayEnd)
        if (gapStart < gapEnd) {
          breakSecs += Math.floor((gapEnd - gapStart) / 1000)
        }
      }
    }

    // Add active break if status is break and target date is today
    const todayStart = new Date()
    todayStart.setHours(0,0,0,0)
    if (targetDate.getTime() === todayStart.getTime() && statusToUse === "break" && overlappingLogs.length > 0) {
      const lastLog = overlappingLogs[overlappingLogs.length - 1]
      if (lastLog.check_out) {
        const breakStart = Math.max(new Date(lastLog.check_out).getTime(), dayStart)
        const breakEnd = Math.min(time.getTime(), dayEnd)
        if (breakStart < breakEnd) {
          breakSecs += Math.floor((breakEnd - breakStart) / 1000)
        }
      }
    }

    return {
      workedSecs,
      breakSecs,
      sessions: overlappingLogs.length,
      firstIn,
      lastOut,
      history: overlappingLogs
    }
  }

  // Live stopwatch seconds
  const liveSeconds = useMemo(() => {
    const todayStats = getDayStats(time)
    return todayStats.workedSecs
  }, [logs, time, statusToUse])

  const formatSeconds = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    
    const pad = (n: number) => n.toString().padStart(2, '0')
    if (h > 0) return `${pad(h)}h ${pad(m)}m ${pad(s)}s`
    if (m > 0) return `${pad(m)}m ${pad(s)}s`
    return `${pad(s)}s`
  }

  const formatHM = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  const workReportData = useMemo(() => {
    const todayStats = getDayStats(time)
    
    const yesterday = new Date(time)
    yesterday.setDate(time.getDate() - 1)
    const yesterdayStats = getDayStats(yesterday)
    
    const last7 = []
    let totalWeekWorkedSecs = 0
    let totalWeekBreakSecs = 0
    let longestSessionSecs = 0
    let mostProductiveDay = { name: "-", secs: 0 }
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(time)
      d.setDate(time.getDate() - i)
      const dStats = getDayStats(d)
      
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" })
      last7.push({ dayName, workedSecs: dStats.workedSecs })
      
      totalWeekWorkedSecs += dStats.workedSecs
      totalWeekBreakSecs += dStats.breakSecs
      
      if (dStats.workedSecs > mostProductiveDay.secs) {
        mostProductiveDay = { name: dayName, secs: dStats.workedSecs }
      }
    }

    // Longest true session in the last 7 days without clamping
    const cutoff = new Date(time.getTime() - 7 * 24 * 3600 * 1000)
    logs.forEach(log => {
      if (log.check_in && new Date(log.check_in) >= cutoff) {
        const checkInTime = new Date(log.check_in).getTime()
        const checkOutTime = log.check_out ? new Date(log.check_out).getTime() : time.getTime()
        const dur = Math.floor((checkOutTime - checkInTime) / 1000)
        if (dur > longestSessionSecs) longestSessionSecs = dur
      }
    })
    
    return {
      today: todayStats,
      yesterday: yesterdayStats,
      last7,
      weekly: {
        totalSecs: totalWeekWorkedSecs,
        avgSecs: Math.floor(totalWeekWorkedSecs / 7),
        mostProductiveDay: mostProductiveDay.name,
        longestSessionSecs,
        totalBreakSecs: totalWeekBreakSecs
      }
    }
  }, [logs, time, statusToUse])

  // Tick clock every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeString = time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
  const dateString = time.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })

  // Handle Attendance status update
  const handleAttendanceChange = async (newStatus: 'checked_in' | 'break' | 'checked_out') => {
    if (!props.userId) return
    setUpdatingStatus(true)
    
    let logAction = 'check_in'
    let emoji = '🟢'
    let title = 'Attendance Checked In 🟢'
    let message = 'You have successfully checked in.'
    let toastMsg = 'Checked in successfully!'
    
    if (newStatus === 'break') {
      logAction = 'break'
      emoji = '☕'
      title = 'Attendance Break ☕'
      message = 'You are now on a break.'
      toastMsg = 'Break started!'
    } else if (newStatus === 'checked_out') {
      logAction = 'check_out'
      emoji = '🔴'
      title = 'Attendance Checked Out 🔴'
      message = 'You checked out successfully. Great job today!'
      toastMsg = 'Checked out successfully!'
    }
    
    try {
      // Optimistically update local UI states
      setLocalStatus(newStatus)
      localStorage.setItem("grotrack_current_status", newStatus)
      if (newStatus === 'checked_in') {
        const timeNow = new Date().getTime()
        setLocalActiveCheckInTime(timeNow)
        localStorage.setItem("grotrack_active_check_in_time", timeNow.toString())
      } else {
        setLocalActiveCheckInTime(null)
        localStorage.removeItem("grotrack_active_check_in_time")
      }

      // Call Server Action
      const { updateAttendanceStatus } = await import('@/app/(dashboard)/dashboard/tasks/employee-actions')
      const result = await updateAttendanceStatus(newStatus, title, message)

      if (result.error) {
        throw new Error(result.error)
      }
      
      toast.success(toastMsg)
      mutate(`profile-${props.userId}`)
      mutate(`emp-overview-${props.userId}`)
    } catch (err: any) {
      toast.error(`Error: ${err.message || 'Failed to update attendance'}`)
      // Revert optimistic updates if failed
      setLocalStatus(currentStatus)
      localStorage.setItem("grotrack_current_status", currentStatus)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const firstName = props.userName.split(' ')[0]

 return (
 <div className="flex flex-col gap-6 w-full pb-safe">
 {/* Greeting */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-syne font-bold text-foreground">
 Hey, {firstName} {props.overdueTasks > 0 ? "⚠️" : "🎯"}
 </h1>
 <p className="text-sm text-muted-foreground mt-0.5">
 {props.overdueTasks > 0
 ? `You have ${props.overdueTasks} overdue task${props.overdueTasks > 1 ? 's' : ''} — let's clear them.`
 : props.inReview > 0
 ? `${props.inReview} task${props.inReview > 1 ? 's are' : ' is'} waiting for approval.`
 : `${props.tasksDoneThisWeek} task${props.tasksDoneThisWeek !== 1 ? 's' : ''} completed this week. Keep going!`}
 </p>
 </div>

 {/* Streak badge */}
 {props.tasksDoneToday >= 1 && (
 <motion.div
 initial={{ scale: 0.8, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2"
 >
 <Flame className="w-4 h-4 text-orange-400" />
 <div>
 <p className="text-xs font-bold text-orange-400">{props.tasksDoneToday} tasks</p>
 <p className="text-[10px] text-orange-400/60">today 🔥</p>
 </div>
 </motion.div>
 )}
 </div>

 {/* Attendance Check-in Widget */}
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 }}
 className="enterprise-card p-5 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden bg-card"
 >
 <div className="absolute inset-0 bg-hero-glow pointer-events-none opacity-20" />
 
 {/* Clock & Date */}
 <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
 <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-border hover:border-primary/30 flex items-center justify-center text-primary shadow-sm shrink-0">
 <Clock className="w-6 h-6 animate-pulse" />
 </div>
 <div>
 <div className="text-2xl font-bold font-syne text-foreground tracking-tight leading-none">
 {timeString}
 </div>
 <div className="text-[11px] text-muted-foreground uppercase tracking-widest mt-1">
 {dateString}
 </div>
 </div>
 </div>
 
 {/* Status Indicator & Stopwatch */}
 <div className="flex items-center gap-3 relative z-10 bg-muted border border-border px-4 py-2.5 rounded-2xl w-full md:w-auto">
 <span className="text-xl">{statusEmoji}</span>
 <div className="flex gap-5 items-center">
 <div>
 <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Duty Status</p>
 <p className="text-xs font-bold text-foreground mt-0.5">
 {statusToUse === "checked_in" ? "Active Work Session" : statusToUse === "break" ? "On Break" : "Duty Off"}
 </p>
 </div>
 
 <div className="pl-5 border-l border-border/50">
 <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-1.5">
 <Clock className="w-3 h-3" /> Worked Today
 </p>
 <p className={`text-sm font-bold font-syne tracking-wider mt-0.5 ${statusToUse === "checked_in" ? 'text-primary' : 'text-foreground'}`}>
 {formatSeconds(liveSeconds)}
 </p>
 </div>
 </div>
 </div>
 
 {/* Check-in controls */}
 <div className="flex items-center gap-2 w-full md:w-auto relative z-10 shrink-0">
 {statusToUse === "checked_out" ? (
 <button
 onClick={() => handleAttendanceChange("checked_in")}
 disabled={updatingStatus}
 className="flex-1 md:flex-none h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider transition-all hover:opacity-90 active:scale-95 shadow-md flex items-center justify-center gap-2"
 >
 {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
 Check In
 </button>
 ) : (
 <>
 {statusToUse === "checked_in" ? (
 <button
 onClick={() => handleAttendanceChange("break")}
 disabled={updatingStatus}
 className="flex-1 md:flex-none h-11 px-5 rounded-xl bg-muted border border-border text-foreground font-bold text-xs uppercase tracking-wider transition-all hover:bg-muted active:scale-95 flex items-center justify-center gap-2"
 >
 {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coffee className="w-4 h-4" />}
 Take Break
 </button>
 ) : (
 <button
 onClick={() => handleAttendanceChange("checked_in")}
 disabled={updatingStatus}
 className="flex-1 md:flex-none h-11 px-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-wider transition-all hover:bg-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
 >
 {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
 Resume
 </button>
 )}
 
 <button
 onClick={() => handleAttendanceChange("checked_out")}
 disabled={updatingStatus}
 className="flex-1 md:flex-none h-11 px-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs uppercase tracking-wider transition-all hover:bg-red-500/20 active:scale-95 flex items-center justify-center gap-2"
 >
 {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
 Check Out
 </button>
 </>
 )}
 </div>
 </motion.div>

 {/* Task Status Grid */}
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
 {useMemo(() => [
 { label: "Overdue", value: props.overdueTasks, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
 { label: "Done Total", value: props.tasksDoneTotal, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
 { label: "Hours Worked", value: `${totalWorkedHours}h`, icon: Clock, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
 ], [props.overdueTasks, props.tasksDoneTotal, totalWorkedHours, workedHoursFilter]).map((card, i) => {
 const Icon = card.icon
 return (
 <motion.div
 key={card.label}
 initial={{ opacity: 0, y: 16 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.06 }}
 className={`p-4 rounded-xl border ${card.border} ${card.bg} flex flex-col gap-2`}
 >
 <div className="flex items-center justify-between w-full">
    <div className={`${card.color}`}>
      <Icon className="w-4 h-4" />
    </div>
    {card.label === "Hours Worked" && (
      <select
        value={workedHoursFilter}
        onChange={e => setWorkedHoursFilter(e.target.value as any)}
        className="bg-transparent border-0 text-[10px] font-semibold text-muted-foreground focus:outline-none focus:ring-0 cursor-pointer hover:text-foreground transition-colors p-0 [color-scheme:dark]"
      >
        <option value="week" className="bg-card text-foreground">Week</option>
        <option value="month" className="bg-card text-foreground">Month</option>
        <option value="30" className="bg-card text-foreground">30d</option>
        <option value="60" className="bg-card text-foreground">60d</option>
        <option value="all" className="bg-card text-foreground">All</option>
      </select>
    )}
  </div>
 <p className="text-2xl font-syne font-bold text-foreground">{card.value}</p>
 <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{card.label}</p>
 {card.label === "Hours Worked" && (
   <button onClick={() => setIsWorkReportOpen(!isWorkReportOpen)} className="text-[10px] text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1 font-semibold transition-colors">
     Show Details {isWorkReportOpen ? '▲' : '▼'}
   </button>
 )}
 </motion.div>
 )
 })}
 </div>

 {/* Expandable Work Report */}
 <AnimatePresence>
 {isWorkReportOpen && (
 <motion.div
 initial={{ opacity: 0, height: 0, marginTop: 0 }}
 animate={{ opacity: 1, height: "auto", marginTop: 16 }}
 exit={{ opacity: 0, height: 0, marginTop: 0 }}
 className="overflow-hidden bg-card/[0.02] border border-border rounded-xl w-full flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border"
 >
 {/* Left Col: Today & Yesterday */}
 <div className="flex-1 p-5 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-widest flex items-center gap-2">Today</h3>
 <div className="grid grid-cols-2 gap-4 mb-4">
 <div>
 <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Worked Time</p>
 <p className="text-lg font-bold text-foreground">{formatHM(workReportData.today.workedSecs)}</p>
 </div>
 <div>
 <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Break Time</p>
 <p className="text-lg font-bold text-foreground">{formatHM(workReportData.today.breakSecs)}</p>
 </div>
 <div>
 <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Sessions</p>
 <p className="text-lg font-bold text-foreground">{workReportData.today.sessions}</p>
 </div>
 <div>
 <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Check In / Out</p>
 <p className="text-sm font-semibold text-foreground mt-1">
 {workReportData.today.firstIn ? new Date(workReportData.today.firstIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'} 
 {' → '}
 {workReportData.today.lastOut ? new Date(workReportData.today.lastOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
 </p>
 </div>
 </div>
 
 {/* History Timeline */}
 {workReportData.today.history.length > 0 && (
 <div className="mt-4 pt-4 border-t border-border/50">
 <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">Session History</p>
 <div className="space-y-1.5">
 {workReportData.today.history.map((log: any, i: number) => {
   const inTime = new Date(log.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
   const outTime = log.check_out ? new Date(log.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Active'
   const dur = formatHM(Math.floor(((log.check_out ? new Date(log.check_out).getTime() : time.getTime()) - new Date(log.check_in).getTime())/1000))
   
   let breakText = null
   if (log.check_out) {
     if (i < workReportData.today.history.length - 1) {
       const nextIn = new Date(workReportData.today.history[i+1].check_in).getTime()
       const bDur = formatHM(Math.floor((nextIn - new Date(log.check_out).getTime())/1000))
       breakText = <div className="pl-6 py-1 text-[11px] text-muted-foreground italic flex items-center gap-1.5"><Coffee className="w-3 h-3"/> Break ({bDur})</div>
     } else if (statusToUse === "break") {
       const bDur = formatHM(Math.floor((time.getTime() - new Date(log.check_out).getTime())/1000))
       breakText = <div className="pl-6 py-1 text-[11px] text-muted-foreground italic flex items-center gap-1.5"><Coffee className="w-3 h-3"/> Break ({bDur} - Active)</div>
     }
   }
   
   return (
     <React.Fragment key={log.id || i}>
       <div className="flex items-center gap-2 text-xs">
         <div className="w-1.5 h-1.5 rounded-full bg-primary" />
         <span className="text-foreground font-medium">{inTime} → {outTime}</span>
         <span className="text-muted-foreground ml-auto">({dur})</span>
       </div>
       {breakText}
     </React.Fragment>
   )
 })}
 </div>
 </div>
 )}
 </div>
 
 <div>
 <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-widest">Yesterday</h3>
 <div className="grid grid-cols-3 gap-4">
 <div>
 <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Worked</p>
 <p className="text-base font-bold text-foreground">{formatHM(workReportData.yesterday.workedSecs)}</p>
 </div>
 <div>
 <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Break</p>
 <p className="text-base font-bold text-foreground">{formatHM(workReportData.yesterday.breakSecs)}</p>
 </div>
 <div>
 <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Sessions</p>
 <p className="text-base font-bold text-foreground">{workReportData.yesterday.sessions}</p>
 </div>
 </div>
 </div>
 </div>
 
 {/* Right Col: Weekly & 7-Day Chart */}
 <div className="flex-1 p-5 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-widest">Weekly Summary</h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Total This Week</p>
 <p className="text-lg font-bold text-foreground">{formatHM(workReportData.weekly.totalSecs)}</p>
 </div>
 <div>
 <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Daily Average</p>
 <p className="text-lg font-bold text-foreground">{formatHM(workReportData.weekly.avgSecs)}</p>
 </div>
 <div>
 <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Most Productive Day</p>
 <p className="text-sm font-semibold text-foreground mt-1">{workReportData.weekly.mostProductiveDay}</p>
 </div>
 <div>
 <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Longest Session</p>
 <p className="text-sm font-semibold text-foreground mt-1">{formatHM(workReportData.weekly.longestSessionSecs)}</p>
 </div>
 <div>
 <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Total Break Time</p>
 <p className="text-sm font-semibold text-foreground mt-1">{formatHM(workReportData.weekly.totalBreakSecs)}</p>
 </div>
 </div>
 </div>
 
 <div>
 <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-widest">Last 7 Days</h3>
 <div className="flex flex-col gap-2">
 {workReportData.last7.map((day, idx) => {
   const max = Math.max(...workReportData.last7.map(d => d.workedSecs), 1)
   const pct = Math.round((day.workedSecs / max) * 100)
   return (
     <div key={idx} className="flex items-center gap-3 text-xs">
       <span className="w-8 text-muted-foreground font-medium">{day.dayName}</span>
       <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden flex items-center">
         <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
       </div>
       <span className="w-12 text-right font-medium text-foreground">{formatHM(day.workedSecs)}</span>
     </div>
   )
 })}
 </div>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Earnings + Turnaround */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
 {/* Earnings Card */}
 <motion.div
 initial={{ opacity: 0, y: 16 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.3 }}
 className="lg:col-span-2 bg-card/[0.02] border border-border rounded-xl p-5"
 >
 <div className="flex items-center justify-between mb-4">
 <h2 className="font-semibold text-foreground flex items-center gap-2">
 <IndianRupee className="w-4 h-4 text-emerald-400" />
 Payment Overview
 </h2>
 <div className="flex gap-1 bg-muted rounded-lg p-0.5">
 {(['30', '60', '90', 'all'] as const).map(f => (
 <button
 key={f}
 onClick={() => setEarningsFilter(f)}
 className={`text-[10px] px-2 py-1 rounded-md font-medium transition-all ${
 earningsFilter === f ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-muted-foreground'
 }`}
 >
 {f === 'all' ? 'All' : `${f}d`}
 </button>
 ))}
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="text-center p-4 rounded-xl enterprise-card">
 <p className="text-2xl font-syne font-bold text-foreground">{formatINR(safeNum(props.totalEarnings))}</p>
 <p className="text-[11px] text-muted-foreground mt-1">Total Earnings</p>
 </div>
 <div className="text-center p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
 <p className="text-2xl font-syne font-bold text-emerald-400">{formatINR(safeNum(props.totalPaid))}</p>
 <p className="text-[11px] text-emerald-400/60 mt-1">Paid Out</p>
 </div>
 <div className="text-center p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
 <p className="text-2xl font-syne font-bold text-muted-foregroundmber-400">{formatINR(safeNum(props.pendingEarnings))}</p>
 <p className="text-[11px] text-muted-foregroundmber-400/60 mt-1">Pending</p>
 </div>
 </div>

 {props.pendingEarnings > 0 && (
 <div className="mt-4 text-xs text-muted-foregroundmber-400/70 flex items-center gap-1.5">
 <Clock className="w-3.5 h-3.5" />
 {formatINR(safeNum(props.pendingEarnings))} awaiting admin approval
 </div>
 )}
 </motion.div>

 {/* Productivity Card */}
 <motion.div
 initial={{ opacity: 0, y: 16 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.35 }}
 className="bg-card/[0.02] border border-border rounded-xl p-5 flex flex-col gap-4"
 >
 <h2 className="font-semibold text-foreground flex items-center gap-2">
 <TrendingUp className="w-4 h-4 text-violet-400" />
 Productivity
 </h2>

 <div className="flex flex-col gap-3">
 <div className="flex items-center justify-between">
 <p className="text-xs text-muted-foreground">Completed this week</p>
 <p className="text-sm font-bold text-foreground">{props.tasksDoneThisWeek}</p>
 </div>
 <div className="flex items-center justify-between">
 <p className="text-xs text-muted-foreground">All time done</p>
 <p className="text-sm font-bold text-foreground">{props.tasksDoneTotal}</p>
 </div>
 <div className="flex items-center justify-between">
 <p className="text-xs text-muted-foreground">Avg. turnaround</p>
 <p className="text-sm font-bold text-foreground">
 {props.avgTurnaroundHours != null
 ? props.avgTurnaroundHours < 24
 ? `${Math.round(props.avgTurnaroundHours)}h`
 : `${Math.round(props.avgTurnaroundHours / 24)}d`
 : '—'}
 </p>
 </div>
 {props.tasksDoneThisWeek >= 5 && (
 <div className="mt-1 flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg p-2.5">
 <Flame className="w-3.5 h-3.5 text-orange-400" />
 <span className="text-xs text-orange-300 font-medium">On fire this week!</span>
 </div>
 )}
 </div>
 </motion.div>
 </div>

 {/* Active Tasks — Quick Complete */}
 <motion.div
 initial={{ opacity: 0, y: 16 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.4 }}
 className="bg-card/[0.02] border border-border rounded-xl overflow-hidden w-full"
 >
 <div className="flex items-center justify-between px-5 py-4 border-b border-border">
 <h2 className="font-semibold text-foreground">My Active Tasks</h2>
 <a href="/dashboard/tasks" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">View all →</a>
 </div>

 <div className="divide-y divide-white/5">
 {props.activeTasks.length === 0 && (
 <div className="py-12 text-center text-muted-foreground text-sm">
 <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-green-400/40" />
 All caught up! No active tasks.
 </div>
 )}

 {props.activeTasks.slice(0, 6).map((task: any) => {
 const statusConf = TASK_STATUSES.find(s => s.id === task.status)
 const priConf = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]
 const isOverdue = task.deadline && new Date(task.deadline) < new Date()

 return (
 <div key={task.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-card/[0.02] transition-colors group">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-0.5">
 {isOverdue && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
 <p className="text-sm font-medium text-muted-foreground truncate group-hover:text-foreground transition-colors">{task.title}</p>
 </div>
 <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
 <span>{task.client?.name || 'No client'}</span>
 {task.deadline && (
 <><span>·</span>
 <span className={isOverdue ? 'text-red-400' : ''}>
 Due {new Date(task.deadline).toLocaleDateString()}
 </span></>
 )}
 {task.payment_amount > 0 && (
 <><span>·</span><span className="text-emerald-400 font-bold ">{formatINR(safeNum(task.payment_amount))}</span></>
 )}
 </div>
 </div>

 <div className="flex items-center gap-2 shrink-0">
 {priConf && (
 <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase hidden sm:inline ${priConf.bg} ${priConf.color}`}>
 {priConf.label}
 </span>
 )}
 {statusConf && (
 <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusConf.bg} ${statusConf.color}`}>
 {statusConf.label}
 </span>
 )}
 </div>
 </div>
 )
 })}
 </div>
 </motion.div>

 {/* Quick Complete Modal */}
 {completeTask && (
 <QuickCompleteModal
 task={completeTask}
 onClose={() => setCompleteTask(null)}
 />
 )}
 </div>
 )
})
