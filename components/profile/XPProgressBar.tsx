"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { calculateLevel, xpForLevel, xpForNextLevel, getLevelTitle, getRankColor, xpProgressPercent } from "@/lib/utils/gamification"
import { Zap } from "lucide-react"

interface XPProgressBarProps {
 xp: number
 className?: string
 compact?: boolean
}

export function XPProgressBar({ xp, className, compact = false }: XPProgressBarProps) {
 const level = calculateLevel(xp)
 const percent = xpProgressPercent(xp)
 const title = getLevelTitle(level)
 const rankColor = getRankColor(level)
 const nextLevelXP = xpForNextLevel(level)
 const currentLevelXP = xpForLevel(level)
 const xpIntoLevel = xp - currentLevelXP
 const xpNeeded = nextLevelXP - currentLevelXP

 if (compact) {
 return (
 <div className={cn("flex items-center gap-2", className)}>
 <div className={`text-[10px] font-black ${rankColor} bg-clip-text text-transparent`}>
 Lv.{level}
 </div>
 <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
 <motion.div
 className={`h-full rounded-full ${rankColor}`}
 initial={{ width: 0 }}
 animate={{ width: `${percent}%` }}
 transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
 />
 </div>
 <div className="text-[10px] text-muted-foreground">{percent}%</div>
 </div>
 )
 }

 return (
 <div className={cn("space-y-2", className)}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${rankColor} bg-opacity-10`}
 style={{ background: "rgba(139,92,246,0.1)" }}>
 <Zap className="w-3 h-3 text-violet-400" />
 <span className={`text-xs font-black ${rankColor} bg-clip-text text-transparent`}>
 Level {level}
 </span>
 </div>
 <span className="text-xs text-muted-foreground font-medium">{title}</span>
 </div>
 <span className="text-[11px] text-muted-foreground">{xpIntoLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP</span>
 </div>

 <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
 <motion.div
 className={`absolute inset-y-0 left-0 rounded-full ${rankColor}`}
 initial={{ width: 0 }}
 animate={{ width: `${percent}%` }}
 transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
 />
 {/* Glow overlay */}
 <motion.div
 className={`absolute inset-y-0 left-0 rounded-full ${rankColor} blur-sm opacity-40`}
 initial={{ width: 0 }}
 animate={{ width: `${percent}%` }}
 transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
 />
 </div>

 <div className="flex justify-between text-[10px] text-muted-foreground">
 <span>{xp.toLocaleString()} total XP</span>
 {level < 50 && <span>{(nextLevelXP - xp).toLocaleString()} XP to Level {level + 1}</span>}
 {level >= 50 && <span className="text-yellow-400">Max Level!</span>}
 </div>
 </div>
 )
}
