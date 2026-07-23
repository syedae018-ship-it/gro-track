"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { isAdmin } from "@/lib/utils/roles"
import { useProfile, useEmployeesPage } from "@/hooks/use-dashboard-data"
import { EmployeeGridSkeleton } from "@/components/shared/Skeletons"
import { LazyTeamDirectory } from "@/components/lazy"
import { TaskNotificationSettings } from "@/components/tasks/TaskNotificationSettings"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"

import { useAuth } from "@/hooks/use-auth"
export default function EmployeesPage() {
  const { data: session, role } = useAuth()
  // @ts-ignore
  const userId = session?.user?.id as string | undefined
  const [showSettings, setShowSettings] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const router = useRouter()

  const admin = isAdmin(role as string)

  useEffect(() => {
    if (userId && !admin) router.replace("/dashboard/overview")
  }, [userId, admin, router])

  const { data: empData } = useEmployeesPage(!!userId && admin)

  if (!userId || !empData) return <EmployeeGridSkeleton />

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-syne font-bold text-foreground">Team Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Contact details, payment info, and client associations for every team member.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setSyncing(true)
              try {
                const res = await fetch('/api/workspace/sync', { method: 'POST' })
                if (res.ok) {
                  router.refresh()
                } else {
                  console.error('Failed to sync')
                }
              } finally {
                setSyncing(false)
              }
            }}
            disabled={syncing}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-semibold hover:bg-blue-500/20 transition-all disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "🔄 Workspace Sync"}
          </button>
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
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <TaskNotificationSettings userId={userId} onClose={() => setShowSettings(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <LazyTeamDirectory employees={empData.employees} tasks={empData.tasks} attendance={empData.attendance} />
    </div>
  )
}
