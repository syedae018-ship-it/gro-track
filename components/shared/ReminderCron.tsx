'use client'

import { useEffect } from 'react'

export function ReminderCron() {
  useEffect(() => {
    // Only run on the client side
    if (typeof window === 'undefined') return

    // Run immediately on mount
    fetch('/api/cron/process-reminders').catch(() => {})

    // Run every 60 seconds
    const interval = setInterval(() => {
      fetch('/api/cron/process-reminders').catch(() => {})
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  return null
}
