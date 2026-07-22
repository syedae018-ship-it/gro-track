"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Zap, Trophy, DollarSign, Clock, TrendingUp } from "lucide-react"

interface ProductivityAnalyticsProps {
 tasks: any[]
}

function formatDuration(minutes: number | null): string {
 if (!minutes) return "—"
 if (minutes < 60) return `${minutes}m`
 const h = Math.floor(minutes / 60)
 const m = minutes % 60
 return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function ProductivityAnalytics({ tasks }: ProductivityAnalyticsProps) {
 const completedTasks = tasks.filter(t => ["completed", "approved"].includes(t.status))

 const analytics = useMemo(() => {
 const withDuration = completedTasks.filter(t => t.duration_minutes != null && t.duration_minutes > 0)

 const avgMinutes = withDuration.length > 0
 ? Math.round(withDuration.reduce((a, t) => a + t.duration_minutes, 0) / withDuration.length)
 : null

 const fastestTask = withDuration.length > 0
 ? withDuration.reduce((a, b) => a.duration_minutes < b.duration_minutes ? a : b)
 : null

 const clientEarnings: Record<string, number> = {}
 for (const t of completedTasks) {
 const name = t.client?.name || "Unknown"
 clientEarnings[name] = (clientEarnings[name] || 0) + Number(t.payment_amount || 0)
 }
 const topClient = Object.entries(clientEarnings).sort((a, b) => b[1] - a[1])[0] || null

 // Weekly bar chart data
 const weeklyData = []
 for (let i = 6; i >= 0; i--) {
 const d = new Date(); d.setDate(d.getDate() - i)
 const dayStr = d.toLocaleDateString("en-US", { weekday: "short" })
 const dateStr = d.toISOString().split("T")[0]
 const count = completedTasks.filter(t => t.completed_at?.startsWith(dateStr)).length
 weeklyData.push({ day: dayStr, count, isToday: i === 0 })
 }

 return { avgMinutes, fastestTask, topClient, weeklyData }
 }, [tasks])

 const statCards = [
 {
 label: "Avg Completion",
 value: formatDuration(analytics.avgMinutes),
 icon: Clock,
 color: "text-muted-foregroundlue-400",
 bg: "bg-blue-500/10",
 border: "border-blue-500/20",
 },
 {
 label: "Fastest Task",
 value: analytics.fastestTask ? `${formatDuration(analytics.fastestTask.duration_minutes)}` : "—",
 sub: analytics.fastestTask?.title,
 icon: Zap,
 color: "text-muted-foregroundmber-400",
 bg: "bg-amber-500/10",
 border: "border-amber-500/20",
 },
 {
 label: "Total Done",
 value: completedTasks.length,
 icon: Trophy,
 color: "text-violet-400",
 bg: "bg-violet-500/10",
 border: "border-violet-500/20",
 },
 {
 label: "Top Client",
 value: analytics.topClient ? `₹${analytics.topClient[1].toLocaleString("en-IN")}` : "—",
 sub: analytics.topClient?.[0],
 icon: DollarSign,
 color: "text-emerald-400",
 bg: "bg-emerald-500/10",
 border: "border-emerald-500/20",
 },
 ]

 return (
 <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-5">
 <div className="flex items-center gap-2">
 <TrendingUp className="w-4 h-4 text-violet-400" />
 <h2 className="text-sm font-semibold text-foreground">Productivity Analytics</h2>
 <span className="text-xs text-muted-foreground ml-auto">Last 30 days</span>
 </div>

 {/* Stat grid */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {statCards.map((card, i) => (
 <motion.div
 key={card.label}
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.06 }}
 className={`p-3.5 rounded-xl border ${card.border} ${card.bg}`}
 >
 <card.icon className={`w-3.5 h-3.5 ${card.color} mb-2`} />
 <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
 {card.sub && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{card.sub}</p>}
 <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">{card.label}</p>
 </motion.div>
 ))}
 </div>

 {/* Weekly bar chart */}
 <div>
 <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Weekly Output</p>
 <div className="h-32">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={analytics.weeklyData} barSize={20}>
 <XAxis
 dataKey="day"
 tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11 }}
 axisLine={false}
 tickLine={false}
 />
 <YAxis hide allowDecimals={false} />
 <Tooltip
 cursor={{ fill: "rgba(255,255,255,0.03)" }}
 contentStyle={{
 background: "#111117",
 border: "1px solid rgba(255,255,255,0.08)",
 borderRadius: "10px",
 fontSize: "12px",
 color: "#fff",
 }}
 formatter={(v: any) => [v, "Tasks"]}
 />
 <Bar dataKey="count" radius={[5, 5, 0, 0]}>
 {analytics.weeklyData.map((entry, i) => (
 <Cell
 key={i}
 fill={entry.isToday ? "rgb(139,92,246)" : entry.count > 0 ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.05)"}
 />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>
 )
}
