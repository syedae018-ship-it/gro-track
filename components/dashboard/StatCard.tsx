"use client"

import { ReactNode } from "react"
import { motion } from "framer-motion"

interface StatCardProps {
 title: string
 value: string | number
 icon: ReactNode
 trend?: {
 value: number
 isPositive: boolean
 }
 delay?: number
}

export function StatCard({ title, value, icon, trend, delay = 0 }: StatCardProps) {
 return (
 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.4, delay }}
 className="p-6 enterprise-card flex flex-col gap-4 relative overflow-hidden group"
 >
 <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 blur-[50px] rounded-full pointer-events-none group-hover:bg-primary/30 transition-all" />
 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 group-hover:text-primary transition-all">
 {icon}
 </div>
 
 <div className="flex items-center gap-2 relative z-10">
 <div className="w-9 h-9 rounded-full bg-input border border-border shadow-sm flex items-center justify-center text-primary">
 {icon}
 </div>
 <span className="text-sm text-muted-foreground font-medium tracking-wide">{title}</span>
 </div>
 
 <div className="flex items-end gap-3 relative z-10">
 <span className="text-4xl font-syne font-bold text-foreground tracking-tight drop-shadow-md">{value}</span>
 {trend && (
 <span className={`text-sm font-medium mb-1 ${trend.isPositive ? 'text-emerald-400 ' : 'text-rose-400 '}`}>
 {trend.isPositive ? '+' : '-'}{trend.value}%
 </span>
 )}
 </div>
 </motion.div>
 )
}
