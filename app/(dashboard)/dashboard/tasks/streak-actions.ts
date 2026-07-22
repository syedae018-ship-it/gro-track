"use server"

import { createClient } from "@/lib/supabase/server"

export async function syncStreak(localDates: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not logged in" }

  if (!localDates || localDates.length === 0) return { success: true }

  // Ensure dates are sorted oldest to newest
  const sortedDates = [...new Set(localDates)].sort()

  const { data: existingStreak, error: fetchError } = await supabase
    .from("user_streaks")
    .select("*")
    .eq("owner_id", user.id)
    .single()

  // Initialize if not exists
  let currentStreak = existingStreak?.current_streak || 0
  let longestStreak = existingStreak?.longest_streak || 0
  let lastCompletedDate = existingStreak?.last_completed_date || null
  let completedDates = existingStreak?.completed_dates || []

  for (const dateStr of sortedDates) {
    if (lastCompletedDate === dateStr) {
      continue // Already recorded this day
    }

    if (!lastCompletedDate) {
      // First ever task
      currentStreak = 1
    } else {
      // Calculate day difference using standard Date parsing (UTC at midnight for both)
      // Since format is YYYY-MM-DD, parsing it directly treats it as UTC midnight.
      const msPerDay = 1000 * 60 * 60 * 24
      const d1 = new Date(lastCompletedDate + "T00:00:00Z").getTime()
      const d2 = new Date(dateStr + "T00:00:00Z").getTime()
      const diffDays = Math.round((d2 - d1) / msPerDay)

      if (diffDays === 1) {
        currentStreak += 1
      } else if (diffDays > 1) {
        currentStreak = 1
      }
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak
    }
    
    lastCompletedDate = dateStr
    if (!completedDates.includes(dateStr)) {
      completedDates.push(dateStr)
    }
  }

  // Upsert the result
  const payload = {
    owner_id: user.id,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_completed_date: lastCompletedDate,
    completed_dates: completedDates
  }

  const { error: upsertError } = await supabase
    .from("user_streaks")
    .upsert(payload, { onConflict: "owner_id" })

  if (upsertError) {
    console.error("Streak sync error:", upsertError)
    return { success: false, error: upsertError.message }
  }

  return { success: true, data: payload }
}

export async function getStreakData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("user_streaks")
    .select("*")
    .eq("owner_id", user.id)
    .single()

  if (error || !data) {
    return {
      current_streak: 0,
      longest_streak: 0,
      last_completed_date: null,
      completed_dates: []
    }
  }

  return data
}
