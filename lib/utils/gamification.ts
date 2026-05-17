// Gamification utility functions — pure, no side effects

export const XP_PER_TASK = 50
export const XP_PER_STREAK_DAY = 10
export const XP_FOR_PROFILE_COMPLETE = 100

// XP thresholds per level (level 1 = 0 XP, level 2 = 200 XP, etc.)
export function xpForLevel(level: number): number {
  return Math.floor(200 * Math.pow(level - 1, 1.4))
}

export function calculateLevel(xp: number): number {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  return Math.min(level, 50)
}

export function xpForNextLevel(level: number): number {
  return xpForLevel(level + 1)
}

export function xpProgressPercent(xp: number): number {
  const level = calculateLevel(xp)
  if (level >= 50) return 100
  const current = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return Math.round(((xp - current) / (next - current)) * 100)
}

export function getLevelTitle(level: number): string {
  if (level >= 40) return "Legend"
  if (level >= 30) return "Master"
  if (level >= 20) return "Expert"
  if (level >= 15) return "Senior"
  if (level >= 10) return "Pro"
  if (level >= 5)  return "Skilled"
  if (level >= 3)  return "Rising"
  return "Newcomer"
}

export function getRankColor(level: number): string {
  if (level >= 40) return "from-yellow-400 to-orange-400"
  if (level >= 30) return "from-violet-400 to-purple-400"
  if (level >= 20) return "from-blue-400 to-cyan-400"
  if (level >= 10) return "from-emerald-400 to-teal-400"
  return "from-slate-400 to-slate-300"
}

// Profile completion — checks which fields are filled
export function calculateProfileCompletion(profile: Record<string, any>): number {
  const checks: [string, (v: any) => boolean][] = [
    ["full_name",       v => !!v && v.trim().length > 0],
    ["avatar_url",      v => !!v],
    ["banner_url",      v => !!v],
    ["bio",             v => !!v && v.trim().length > 10],
    ["phone",           v => !!v],
    ["specialization",  v => !!v],
    ["skills",          v => Array.isArray(v) && v.length > 0],
    ["social_links",    v => !!v && Object.values(v).some(Boolean)],
    ["payment_method",  v => !!v],
    ["upi_id",          v => !!v],
    ["current_status",  v => !!v],
  ]
  const filled = checks.filter(([key, fn]) => fn(profile[key])).length
  return Math.round((filled / checks.length) * 100)
}

// Achievements
export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt?: string
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: "first_task",      title: "First Step",       description: "Completed your first task",          icon: "🎯" },
  { id: "five_tasks",      title: "Getting Going",    description: "Completed 5 tasks",                  icon: "🚀" },
  { id: "twenty_tasks",    title: "Task Master",      description: "Completed 20 tasks",                 icon: "⚡" },
  { id: "profile_100",     title: "Identity Set",     description: "Reached 100% profile completion",    icon: "✨" },
  { id: "streak_7",        title: "Week Warrior",     description: "Maintained a 7-day streak",          icon: "🔥" },
  { id: "streak_30",       title: "Unstoppable",      description: "Maintained a 30-day streak",         icon: "💎" },
  { id: "level_5",         title: "Leveling Up",      description: "Reached Level 5",                    icon: "📈" },
  { id: "level_10",        title: "Pro Member",       description: "Reached Level 10",                   icon: "🏆" },
]

export function checkNewAchievements(
  existing: string[],
  stats: { completedTasks: number; streak: number; level: number; profileCompletion: number }
): Achievement[] {
  const newOnes: Achievement[] = []
  const unlock = (id: string, condition: boolean) => {
    if (condition && !existing.includes(id)) {
      const ach = ALL_ACHIEVEMENTS.find(a => a.id === id)
      if (ach) newOnes.push({ ...ach, unlockedAt: new Date().toISOString() })
    }
  }
  unlock("first_task",  stats.completedTasks >= 1)
  unlock("five_tasks",  stats.completedTasks >= 5)
  unlock("twenty_tasks",stats.completedTasks >= 20)
  unlock("profile_100", stats.profileCompletion >= 100)
  unlock("streak_7",    stats.streak >= 7)
  unlock("streak_30",   stats.streak >= 30)
  unlock("level_5",     stats.level >= 5)
  unlock("level_10",    stats.level >= 10)
  return newOnes
}
