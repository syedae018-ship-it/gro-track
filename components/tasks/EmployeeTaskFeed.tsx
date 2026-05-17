"use client"

import { useState, useEffect, useCallback, useMemo, memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Flame, Target, BarChart2, Plus, Trophy, ListTodo, TrendingUp } from "lucide-react"
import { TaskCard } from "./TaskCard"
import { QuickAddTaskModal } from "./QuickAddTaskModal"
import { ProductivityAnalytics } from "./ProductivityAnalytics"

type FilterRange = "30" | "60" | "90" | "all"

interface EmployeeTaskFeedProps {
  tasks: any[]
  currentUserId: string
  userName: string
}

export const EmployeeTaskFeed = memo(function EmployeeTaskFeed({ tasks: initialTasks, currentUserId, userName }: EmployeeTaskFeedProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [completedFilter, setCompletedFilter] = useState<FilterRange>("all")

  // Keep local tasks state synced with server actions background updates
  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  const pendingTasks = useMemo(
    () => tasks.filter(t => !["completed", "approved"].includes(t.status)),
    [tasks]
  )

  const allCompleted = useMemo(
    () => tasks.filter(t => ["completed", "approved"].includes(t.status)),
    [tasks]
  )

  // Filter completed tasks by date range
  const completedTasks = useMemo(() => {
    if (completedFilter === "all") return allCompleted
    const days = parseInt(completedFilter)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return allCompleted.filter(t => t.completed_at && new Date(t.completed_at) >= cutoff)
  }, [allCompleted, completedFilter])

  // Work streak — count consecutive days with ≥1 task completed
  const workStreak = useMemo(() => {
    let streak = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().split("T")[0]
      const hasTask = allCompleted.some(t => t.completed_at?.startsWith(ds))
      if (hasTask) streak++
      else break
    }
    return streak
  }, [allCompleted])

  // Productivity score (simple: completed / (completed + pending) * 100)
  const productivityScore = useMemo(() => {
    const total = tasks.length
    if (total === 0) return 0
    return Math.round((allCompleted.length / total) * 100)
  }, [tasks, allCompleted])

  const handleTaskUpdate = useCallback((updatedTask: any) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t))
  }, [])

  const handleTaskAdd = useCallback((newTask: any) => {
    setTasks(prev => [newTask, ...prev])
  }, [])

  const handleCloseModal = useCallback(() => {
    setShowAddModal(false)
  }, [])

  const firstName = userName.split(" ")[0]

  const statCards = [
    {
      id: "pending",
      label: "Pending Tasks",
      value: pendingTasks.length,
      icon: ListTodo,
      color: "text-red-400",
      bg: "bg-red-500/8",
      border: "border-red-500/15",
      glow: pendingTasks.length > 0 ? "shadow-red-500/10" : "",
    },
    {
      id: "completed",
      label: "Tasks Completed",
      value: allCompleted.length,
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-500/8",
      border: "border-green-500/15",
      glow: "shadow-green-500/10",
    },
    {
      id: "streak",
      label: "Work Streak",
      value: workStreak > 0 ? `🔥 ${workStreak}d` : "—",
      icon: Flame,
      color: "text-orange-400",
      bg: "bg-orange-500/8",
      border: "border-orange-500/15",
      glow: workStreak > 0 ? "shadow-orange-500/10" : "",
    },
    {
      id: "productivity",
      label: "Productivity",
      value: `${productivityScore}%`,
      icon: TrendingUp,
      color: "text-violet-400",
      bg: "bg-violet-500/8",
      border: "border-violet-500/15",
      glow: "shadow-violet-500/10",
    },
  ]

  return (
    <div className="flex flex-col gap-5 w-full pb-28">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {firstName}&apos;s Tasks {pendingTasks.length > 0 ? "🎯" : "✨"}
          </h1>
          <p className="text-xs text-white/35 mt-0.5">
            {pendingTasks.length} pending · {allCompleted.length} completed
          </p>
        </div>
        <button
          onClick={() => setShowAnalytics(v => !v)}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all min-h-[36px] ${
            showAnalytics
              ? "text-violet-300 bg-violet-500/15 border-violet-500/30"
              : "text-white/40 bg-white/5 border-white/10 hover:text-white/70"
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Analytics
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`p-4 rounded-2xl border ${card.border} ${card.bg} shadow-md ${card.glow} relative overflow-hidden`}
          >
            <div className={`absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 ${card.bg} blur-2xl pointer-events-none`} />
            <card.icon className={`w-3.5 h-3.5 ${card.color} mb-2.5`} />
            <p className={`text-xl font-bold ${card.color} tabular-nums`}>{card.value}</p>
            <p className="text-[10px] text-white/25 uppercase tracking-wider mt-0.5">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Analytics */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <ProductivityAnalytics tasks={tasks} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PENDING ── */}
      <section>
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)] animate-pulse" />
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Pending</h2>
          <span className="text-[10px] bg-red-500/12 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full font-semibold">
            {pendingTasks.length}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {pendingTasks.length === 0 ? (
              <motion.div
                key="empty-pending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 rounded-2xl border border-dashed border-white/5 flex flex-col items-center justify-center text-center"
              >
                <Trophy className="w-7 h-7 text-green-400/30 mb-2.5" />
                <p className="text-sm text-white/25">All clear! No pending tasks.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-3 text-xs text-violet-400/60 hover:text-violet-400 transition-colors"
                >
                  + Add a task
                </button>
              </motion.div>
            ) : (
              pendingTasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 30, scale: 0.97 }}
                  transition={{ delay: i * 0.03, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <TaskCard
                    task={task}
                    currentUserId={currentUserId}
                    onUpdate={handleTaskUpdate}
                    variant="pending"
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── COMPLETED ── */}
      <section>
        <div className="flex items-center gap-2.5 mb-3 flex-wrap">
          <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.7)]" />
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Completed</h2>
          <span className="text-[10px] bg-green-500/12 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full font-semibold">
            {completedTasks.length}
          </span>

          {/* Filter pills */}
          <div className="flex gap-1 ml-auto bg-white/4 rounded-lg p-0.5">
            {(["30", "60", "90", "all"] as FilterRange[]).map(f => (
              <button
                key={f}
                onClick={() => setCompletedFilter(f)}
                className={`text-[10px] px-2 py-1 rounded-md font-medium transition-all ${
                  completedFilter === f
                    ? "bg-white/10 text-white"
                    : "text-white/25 hover:text-white/50"
                }`}
              >
                {f === "all" ? "All" : `${f}d`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {completedTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-white/20 border border-dashed border-white/5 rounded-2xl">
              No tasks completed in this period.
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {completedTasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.025 }}
                >
                  <TaskCard
                    task={task}
                    currentUserId={currentUserId}
                    onUpdate={handleTaskUpdate}
                    variant="completed"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </section>

      {/* FAB */}
      <motion.button
        id="fab-add-task"
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setShowAddModal(true)}
        style={{ bottom: `max(2rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem))` }}
        className="fixed right-5 sm:right-8 w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-2xl shadow-violet-500/25 flex items-center justify-center z-40 hover:shadow-violet-500/40 transition-shadow active:scale-95"
      >
        <Plus className="w-5 h-5" />
      </motion.button>

      {/* Quick Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <QuickAddTaskModal
            onClose={handleCloseModal}
            onAdd={handleTaskAdd}
            currentUserId={currentUserId}
          />
        )}
      </AnimatePresence>
    </div>
  )
})
