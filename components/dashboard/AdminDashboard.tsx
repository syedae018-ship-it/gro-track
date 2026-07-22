"use client"

import React, { useMemo } from "react"
import { motion } from "framer-motion"
import { IndianRupee, Users, AlertTriangle, Clock, Building2, CheckCircle2, TrendingUp, Loader2, MoreVertical } from "lucide-react"
import { TASK_STATUSES, PRIORITY_CONFIG } from "@/lib/utils/roles"
import { formatINR, safeNum } from "@/lib/utils/currency"

interface AdminDashboardProps {
  totalRevenue: number
  pendingPayouts: number
  activeEmployees: number
  totalClients: number
  overdueTasks: number
  tasksByStatus: Record<string, number>
  recentTasks: any[]
  userName: string
}

const statCards = (props: AdminDashboardProps) => [
  {
    label: "TOTAL REVENUE",
    value: formatINR(props.totalRevenue),
    icon: IndianRupee,
    iconColor: "text-[#4ade80]",
    iconBg: "bg-[#4ade80]/10",
    valueColor: "text-[#4ade80]",
    gradient: "from-[#4ade80]/20 to-transparent",
    svgPath: "M0,64 C40,64 60,32 100,32 C140,32 160,64 200,64 L200,100 L0,100 Z"
  },
  {
    label: "PENDING PAYOUTS",
    value: formatINR(props.pendingPayouts),
    icon: Clock,
    iconColor: "text-[#fbbf24]",
    iconBg: "bg-[#fbbf24]/10",
    valueColor: "text-foreground/80",
    gradient: "from-[#fbbf24]/20 to-transparent",
    svgPath: "M0,32 C40,32 60,64 100,64 C140,64 160,32 200,32 L200,100 L0,100 Z"
  },
  {
    label: "ACTIVE EMPLOYEES",
    value: props.activeEmployees,
    icon: Users,
    iconColor: "text-[#a855f7]",
    iconBg: "bg-[#a855f7]/10",
    valueColor: "text-[#a855f7]",
    gradient: "from-[#a855f7]/20 to-transparent",
    svgPath: "M0,64 C40,64 60,32 100,32 C140,32 160,64 200,64 L200,100 L0,100 Z"
  },
  {
    label: "ACTIVE CLIENTS",
    value: props.totalClients,
    icon: Building2,
    iconColor: "text-[#3b82f6]",
    iconBg: "bg-[#3b82f6]/10",
    valueColor: "text-[#3b82f6]",
    gradient: "from-[#3b82f6]/20 to-transparent",
    svgPath: "M0,32 C40,32 60,64 100,64 C140,64 160,32 200,32 L200,100 L0,100 Z"
  },
  {
    label: "OVERDUE TASKS",
    value: props.overdueTasks,
    icon: AlertTriangle,
    iconColor: "text-[#f87171]",
    iconBg: "bg-[#f87171]/10",
    valueColor: "text-[#f87171]",
    gradient: "from-[#f87171]/20 to-transparent",
    svgPath: "M0,64 C40,64 60,32 100,32 C140,32 160,64 200,64 L200,100 L0,100 Z"
  },
]

const StatusBar = React.memo(function StatusBar({ label, count, total, color, emptyColor }: { label: string; count: number; total: number; color: string; emptyColor: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-4">
      <div className="w-[120px] flex items-center gap-2">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${emptyColor}`}>
          <div className={`w-3 h-3 border-2 rounded-[4px] ${color} bg-transparent`} />
        </div>
        <span className="text-[13px] font-medium text-foreground">{label}</span>
      </div>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        {count > 0 && (
          <div className={`h-full rounded-full ${color.replace('border-', 'bg-')}`} style={{ width: `${pct}%`, transition: 'width 0.8s ease' }} />
        )}
      </div>
      <span className="text-[14px] font-bold text-foreground w-6 text-right">{count}</span>
    </div>
  )
})

const formatDateUTC = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = d.getUTCDate().toString().padStart(2, '0');
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

export const AdminDashboard = React.memo(function AdminDashboard(props: AdminDashboardProps) {
  const totalTasks = Object.values(props.tasksByStatus).reduce((a, b) => a + b, 0)
  
  const cards = useMemo(() => statCards(props), [props.totalRevenue, props.pendingPayouts, props.activeEmployees, props.totalClients, props.overdueTasks])

  return (
    <div className="flex flex-col gap-8 w-full relative z-10">
      
      {/* Decorative Background Waves (optional based on image, the top right has graphics) */}
      <div className="absolute top-0 right-0 -z-10 opacity-40 pointer-events-none">
        {/* Simplified bg graphic just to give a premium feel similar to the image */}
        <div className="w-[600px] h-[300px] bg-gradient-to-bl from-[#8b5cff]/20 via-[#a855f7]/10 to-transparent blur-[80px] rounded-full mix-blend-multiply" />
      </div>

      {/* Header */}
      <div className="pt-2">
        <h1 className="text-[28px] font-bold text-foreground flex items-center gap-2 tracking-tight">
          Good day, {props.userName.split(' ')[0]} 👋
        </h1>
        <p className="text-[14px] text-muted-foreground mt-1 font-medium tracking-wide">Here's your agency at a glance.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
        {cards.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="bg-card rounded-[24px] shadow-sm border border-border relative overflow-hidden group hover:-translate-y-1 transition-transform h-[160px] flex flex-col justify-between"
            >
              <div className="p-5 flex justify-between items-start z-10">
                <div className={`w-10 h-10 rounded-full ${card.iconBg} flex items-center justify-center ${card.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
              
              <div className="px-5 pb-5 z-10">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.1em] mb-1">{card.label}</p>
                <p className={`text-[28px] font-bold tracking-tight ${card.valueColor}`}>{card.value}</p>
              </div>

              {/* Bottom Wave Graphic */}
              <div className="absolute bottom-0 left-0 right-0 h-[60px] pointer-events-none opacity-60">
                <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="w-full h-full">
                  <defs>
                    <linearGradient id={`grad-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" className={card.gradient.split(' ')[0].replace('from-', 'stop-')} stopOpacity="1" />
                      <stop offset="100%" className={card.gradient.split(' ')[1].replace('to-', 'stop-')} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={card.svgPath} fill={`url(#grad-${i})`} />
                </svg>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Tasks breakdown + Recent tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-[24px] shadow-sm border border-border p-6 flex flex-col"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[18px] font-bold text-foreground tracking-tight">Task Pipeline</h2>
            <span className="text-[13px] font-medium text-muted-foreground">{totalTasks} total</span>
          </div>
          
          <div className="flex flex-col gap-6 flex-1">
            <StatusBar
              label="To Do"
              count={props.tasksByStatus['todo'] || 0}
              total={totalTasks}
              emptyColor="bg-[#6D5DFC]/10"
              color="border-[#6D5DFC]"
            />
            <StatusBar
              label="In Progress"
              count={props.tasksByStatus['in_progress'] || 0}
              total={totalTasks}
              emptyColor="bg-[#3b82f6]/10"
              color="border-[#3b82f6]"
            />
            <StatusBar
              label="Review"
              count={props.tasksByStatus['review'] || 0}
              total={totalTasks}
              emptyColor="bg-[#fbbf24]/10"
              color="border-[#fbbf24]"
            />
            <StatusBar
              label="Completed"
              count={props.tasksByStatus['completed'] || 0}
              total={totalTasks}
              emptyColor="bg-[#4ade80]/10"
              color="border-[#4ade80]"
            />
            <StatusBar
              label="Approved"
              count={props.tasksByStatus['approved'] || 0}
              total={totalTasks}
              emptyColor="bg-[#a855f7]/10"
              color="border-[#a855f7]"
            />
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex justify-center gap-12 bg-muted/50 rounded-2xl py-4">
              <div className="text-center">
                <p className="text-[24px] font-bold text-foreground tracking-tight">{props.tasksByStatus.review || 0}</p>
                <p className="text-[10px] text-[#fbbf24] font-bold uppercase tracking-[0.1em] mt-1">NEED REVIEW</p>
              </div>
              <div className="w-[1px] h-12 bg-border" />
              <div className="text-center">
                <p className="text-[24px] font-bold text-foreground tracking-tight">{props.tasksByStatus.approved || 0}</p>
                <p className="text-[10px] text-[#a855f7] font-bold uppercase tracking-[0.1em] mt-1">APPROVED</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-card rounded-[24px] shadow-sm border border-border flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
            <h2 className="text-[18px] font-bold text-foreground tracking-tight">Recent Tasks</h2>
            <a href="/dashboard/tasks" className="text-[13px] font-semibold text-[#6D5DFC] hover:text-[#5a4add] transition-colors flex items-center gap-1">
              View all <span>→</span>
            </a>
          </div>

          <div className="flex-1 divide-y divide-border overflow-y-auto">
            {props.recentTasks.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-sm font-medium">No tasks yet. Create your first task.</div>
            )}
            {props.recentTasks.map((task: any) => {
              const statusConf = TASK_STATUSES.find(s => s.id === task.status)
              const priConf = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]
              const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !['completed','approved'].includes(task.status)
              
              return (
                <div key={task.id} className="p-5 flex items-center gap-4 hover:bg-muted transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-[15px] font-bold text-foreground truncate">{task.title}</p>
                      {isOverdue && <AlertTriangle className="w-4 h-4 text-[#f87171] shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
                      <span className="truncate">{task.client?.name || 'No client'}</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="truncate hidden sm:inline">{task.assignee?.full_name || 'Unassigned'}</span>
                      {task.deadline && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span className={isOverdue ? 'text-[#f87171]' : ''}>{formatDateUTC(task.deadline)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {task.payment_amount > 0 && (
                      <span className="text-[14px] font-bold text-[#4ade80]">{formatINR(safeNum(task.payment_amount))}</span>
                    )}
                    {priConf && (
                      <span className={
                        `text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide
                        ${task.priority === 'high' ? 'bg-[#f87171]/10 text-[#f87171]' : 
                          task.priority === 'medium' ? 'bg-[#fbbf24]/10 text-[#fbbf24]' : 
                          'bg-muted text-muted-foreground'}`
                      }>
                        {priConf.label}
                      </span>
                    )}
                    {statusConf && (
                      <span className={
                        `text-[12px] font-medium 
                        ${task.status === 'completed' || task.status === 'approved' ? 'text-[#4ade80] bg-[#4ade80]/10 px-3 py-1 rounded-full font-bold' : 'text-muted-foreground'}`
                      }>
                        {statusConf.label}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
})
