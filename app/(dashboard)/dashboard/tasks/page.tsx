"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { isAdmin } from "@/lib/utils/roles"
import { useProfile, useTasksPage } from "@/hooks/use-dashboard-data"
import { TaskBoardSkeleton, TaskFeedSkeleton } from "@/components/shared/Skeletons"
import { LazyAdminTaskBoard, LazyEmployeeTaskFeed } from "@/components/lazy"

export default function TasksPage() {
  const [userId, setUserId] = useState<string | undefined>()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id))
  }, [])

  const { data: profile } = useProfile(userId)
  const role = profile?.role || "employee"
  const admin = isAdmin(role)
  const userName = profile?.full_name || "Creator"

  const { data: tasksData } = useTasksPage(userId, role)

  if (!userId || !profile || !tasksData) {
    return admin ? <TaskBoardSkeleton /> : <TaskFeedSkeleton />
  }

  if (!admin) {
    return (
      <LazyEmployeeTaskFeed
        tasks={tasksData.tasks}
        currentUserId={userId}
        userName={userName}
      />
    )
  }

  return (
    <div className="flex flex-col w-full">
      <div>
        <h1 className="text-2xl font-syne font-bold text-white">Agency Tasks</h1>
        <p className="text-sm text-white/40 mt-0.5">
          Manage team workflow and personal tasks.
        </p>
      </div>
      <LazyAdminTaskBoard
        initialTasks={tasksData.tasks}
        clients={tasksData.clients}
        employees={tasksData.employees}
        currentUserId={userId}
      />
    </div>
  )
}
