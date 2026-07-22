"use client"

import { motion } from "framer-motion"
import { ALL_ACHIEVEMENTS, type Achievement } from "@/lib/utils/gamification"
import { Lock } from "lucide-react"

interface AchievementBadgesProps {
 achievements: Achievement[]
 compact?: boolean
}

export function AchievementBadges({ achievements, compact = false }: AchievementBadgesProps) {
 const unlockedIds = achievements.map(a => a.id)

 if (compact) {
 const unlocked = ALL_ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id))
 if (unlocked.length === 0) return null
 return (
 <div className="flex items-center gap-1.5 flex-wrap">
 {unlocked.slice(0, 5).map(a => (
 <span
 key={a.id}
 title={`${a.title}: ${a.description}`}
 className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foregroundase cursor-default hover:scale-110 transition-transform"
 >
 {a.icon}
 </span>
 ))}
 {unlocked.length > 5 && (
 <span className="text-[10px] text-muted-foreground font-medium">+{unlocked.length - 5}</span>
 )}
 </div>
 )
 }

 return (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {ALL_ACHIEVEMENTS.map((ach, i) => {
 const isUnlocked = unlockedIds.includes(ach.id)
 const unlockedData = achievements.find(a => a.id === ach.id)

 return (
 <motion.div
 key={ach.id}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: i * 0.04, duration: 0.3 }}
 className={`relative rounded-2xl p-4 flex flex-col items-center text-center gap-2 border transition-all ${
 isUnlocked
 ? "bg-violet-500/5 border-violet-500/20 hover:border-violet-500/40 hover:bg-violet-500/10 hover:shadow-sm"
 : "bg-card/[0.02] border-border opacity-40"
 }`}
 >
 <div className={`text-3xl ${!isUnlocked ? "grayscale" : ""}`}>{ach.icon}</div>
 <div>
 <p className="text-xs font-bold text-foreground leading-tight">{ach.title}</p>
 <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{ach.description}</p>
 </div>
 {isUnlocked && unlockedData?.unlockedAt && (
 <p className="text-[9px] text-violet-400/60 uppercase tracking-wider">
 {new Date(unlockedData.unlockedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
 </p>
 )}
 {!isUnlocked && (
 <Lock className="w-3 h-3 text-muted-foreground absolute top-2 right-2" />
 )}
 </motion.div>
 )
 })}
 </div>
 )
}
