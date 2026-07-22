"use client"

import { useCallback, useEffect } from "react"
import { syncStreak } from "@/app/(dashboard)/dashboard/tasks/streak-actions"
import { mutate } from "swr"

export function useStreakSync(userId: string | undefined) {
  // We check local storage for pending dates when we come online
  useEffect(() => {
    if (!userId) return

    const handleOnline = async () => {
      const pending = localStorage.getItem(`grotrack_pending_streaks_${userId}`)
      if (pending) {
        try {
          const dates = JSON.parse(pending) as string[]
          if (dates.length > 0) {
            const res = await syncStreak(dates)
            if (res.success) {
              localStorage.removeItem(`grotrack_pending_streaks_${userId}`)
              mutate(`streak-${userId}`) // Refresh UI
            }
          }
        } catch (e) {
          console.error("Failed to sync pending streaks", e)
        }
      }
    }

    // Try to sync on mount if online
    if (navigator.onLine) {
      handleOnline()
    }

    window.addEventListener("online", handleOnline)
    return () => window.removeEventListener("online", handleOnline)
  }, [userId])

  const recordTaskCompletion = useCallback(async () => {
    if (!userId) return

    // Get current local date string (YYYY-MM-DD)
    const d = new Date()
    const localDateStr = d.toLocaleDateString("en-CA") // format: YYYY-MM-DD in local timezone

    if (navigator.onLine) {
      const res = await syncStreak([localDateStr])
      if (res.success) {
        // Also clear any pending queue just in case
        localStorage.removeItem(`grotrack_pending_streaks_${userId}`)
        mutate(`streak-${userId}`) // Refresh UI
      } else {
        queueOffline(userId, localDateStr)
      }
    } else {
      queueOffline(userId, localDateStr)
      // Optimistically update the UI if offline, but it's okay to just wait for online
      mutate(`streak-${userId}`) 
    }
  }, [userId])

  return { recordTaskCompletion }
}

function queueOffline(userId: string, dateStr: string) {
  try {
    const existing = localStorage.getItem(`grotrack_pending_streaks_${userId}`)
    const dates = existing ? JSON.parse(existing) : []
    if (!dates.includes(dateStr)) {
      dates.push(dateStr)
      localStorage.setItem(`grotrack_pending_streaks_${userId}`, JSON.stringify(dates))
    }
  } catch(e) {
    console.error("Failed to queue streak", e)
  }
}
