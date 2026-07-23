"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { isAdmin } from "@/lib/utils/roles"
import { useProfile, useTasksPage } from "@/hooks/use-dashboard-data"
import { TaskBoardSkeleton, TaskFeedSkeleton } from "@/components/shared/Skeletons"
import { LazyAdminTaskBoard, LazyEmployeeTaskFeed } from "@/components/lazy"
import { TaskNotificationSettings } from "@/components/tasks/TaskNotificationSettings"
import { motion, AnimatePresence } from "framer-motion"

import { useAuth } from "@/hooks/use-auth"
export default function TasksPage() {
  const { data: session } = useAuth()
  // @ts-ignore
  const userId = session?.user?.id as string | undefined
  const [showSettings, setShowSettings] = useState(false)

  const { data: profile } = useProfile(userId)
  const role = profile?.role || "employee"
  const admin = isAdmin(role)
  const userName = profile?.full_name || "Creator"

  const { data: tasksData } = useTasksPage(userId, role)

  if (!userId || !profile || !tasksData) {
    return admin ? <TaskBoardSkeleton /> : <TaskFeedSkeleton />
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-syne font-bold text-foreground">Agency Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage team workflow and personal tasks.
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${
            showSettings
              ? "bg-violet-500/10 border-violet-500/30 text-violet-400"
              : "bg-muted border-border hover:bg-muted/80 text-muted-foreground"
          }`}
        >
          ⚙️ Notification Defaults
        </button>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <TaskNotificationSettings userId={userId} onClose={() => setShowSettings(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {!admin ? (
        <LazyEmployeeTaskFeed
          tasks={tasksData.tasks}
          currentUserId={userId}
          userName={userName}
        />
      ) : (
        <LazyAdminTaskBoard
          initialTasks={tasksData.tasks}
          clients={tasksData.clients}
          employees={tasksData.employees}
          currentUserId={userId}
        />
      )}
    </div>
  )
}
