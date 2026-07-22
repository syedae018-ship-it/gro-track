"use client"

import React, { useState, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, CheckCircle2, Search, Link2, Pencil, Trash2 } from "lucide-react"
import { updateTaskStatus, deleteTaskAction } from "@/app/(dashboard)/dashboard/tasks/actions"
import { PRIORITY_CONFIG } from "@/lib/utils/roles"
import { TaskModal } from "./TaskModal"
import { Avatar } from "@/components/shared/Avatar"
import { toast } from "sonner"

interface AdminTaskBoardProps {
  initialTasks: any[]
  clients: any[]
  employees: any[]
  currentUserId: string
}

export const AdminTaskBoard = React.memo(function AdminTaskBoard({ initialTasks, clients, employees, currentUserId }: AdminTaskBoardProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [activeTab, setActiveTab] = useState<'team' | 'personal'>('team')
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [filterEmployee, setFilterEmployee] = useState("")
  const [filterClient, setFilterClient] = useState("")
  const [filterPriority, setFilterPriority] = useState("")

  // Keep state updated if initialTasks changes
  React.useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Tab filter
      if (activeTab === 'personal') {
        if (task.assigned_to !== currentUserId || task.client_id !== null) return false
      } else {
        if (task.assigned_to === currentUserId && task.client_id === null && task.payment_amount === 0) return false
      }

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchTitle = task.title.toLowerCase().includes(q)
        const matchEmployee = task.assignee?.full_name?.toLowerCase().includes(q)
        const matchClient = task.client?.name?.toLowerCase().includes(q)
        if (!matchTitle && !matchEmployee && !matchClient) return false
      }

      // Dropdowns
      if (filterEmployee && task.assigned_to !== filterEmployee) return false
      if (filterClient && task.client_id !== filterClient) return false
      if (filterPriority && task.priority !== filterPriority) return false

      return true
    })
  }, [tasks, activeTab, searchQuery, filterEmployee, filterClient, filterPriority, currentUserId])

  const todoTasks = useMemo(() => filteredTasks.filter(t => ['todo', 'in_progress', 'review'].includes(t.status)), [filteredTasks])
  const completedTasks = useMemo(() => filteredTasks.filter(t => ['completed', 'approved'].includes(t.status)), [filteredTasks])

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, targetStatus: 'todo' | 'completed') => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData("taskId")
    
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t))
    await updateTaskStatus(taskId, targetStatus)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), [])

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this task? All scheduled reminders and related notifications will be removed.")) {
      return
    }
    const res = await deleteTaskAction(taskId)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Task deleted successfully!")
      setTasks(prev => prev.filter(t => t.id !== taskId))
    }
  }, [])

  const handleUpdateTask = useCallback((updatedTask: any) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t))
  }, [])

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-1.5 p-1 bg-muted border border-border rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'team' ? 'bg-muted text-foreground shadow-sm' : 'text-muted-foreground hover:text-muted-foreground'
            }`}
          >
            Team Tasks
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'personal' ? 'bg-muted text-foreground shadow-sm' : 'text-muted-foreground hover:text-muted-foreground'
            }`}
          >
            Personal Tasks
          </button>
        </div>

        <TaskModal 
          clients={clients} 
          employees={employees} 
          isPersonal={activeTab === 'personal'}
          currentUserId={currentUserId}
          onSuccess={() => {
            // Re-fetch or trigger route revalidation
            window.location.reload()
          }}
        />
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col xl:flex-row gap-3 bg-card/[0.02] p-3 rounded-xl border border-border">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search tasks, employees, clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border transition-colors shadow-inner"
          />
        </div>
        
        {activeTab === 'team' && (
          <div className="flex flex-wrap gap-2">
            <select 
              value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-border transition-colors shadow-inner"
            >
              <option value="">All Employees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
            <select 
              value={filterClient} onChange={e => setFilterClient(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-border transition-colors shadow-inner"
            >
              <option value="">All Clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select 
              value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-border transition-colors shadow-inner"
            >
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        )}
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* TO DO Column */}
        <div 
          className="flex flex-col bg-muted/30 border border-border rounded-2xl overflow-hidden min-h-[500px] shadow-xl"
          onDrop={(e) => handleDrop(e, 'todo')}
          onDragOver={handleDragOver}
        >
          <div className="px-5 py-4 border-b border-border bg-card/[0.02] flex justify-between items-center sticky top-0 z-10 ">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-sm" />
              <h3 className="font-syne font-bold tracking-wide text-foreground">TO DO</h3>
            </div>
            <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-md border border-border">{todoTasks.length}</span>
          </div>
          <div className="p-4 flex flex-col gap-3 flex-1 overflow-y-auto max-h-[800px]">
            {todoTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground py-16">
                <CheckCircle2 className="w-12 h-12 mb-4 opacity-10" />
                <p className="text-sm font-semibold">No pending tasks.</p>
                <p className="text-xs opacity-50 mt-1">You're all caught up!</p>
              </div>
            ) : (
              todoTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onDragStart={handleDragStart} 
                  activeTab={activeTab} 
                  clients={clients}
                  employees={employees}
                  currentUserId={currentUserId}
                  onDelete={handleDeleteTask}
                  onUpdate={handleUpdateTask}
                />
              ))
            )}
          </div>
        </div>

        {/* COMPLETED Column */}
        <div 
          className="flex flex-col bg-muted/30 border border-border rounded-2xl overflow-hidden min-h-[500px] shadow-xl"
          onDrop={(e) => handleDrop(e, 'completed')}
          onDragOver={handleDragOver}
        >
          <div className="px-5 py-4 border-b border-border bg-card/[0.02] flex justify-between items-center sticky top-0 z-10 ">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
              <h3 className="font-syne font-bold tracking-wide text-foreground">COMPLETED</h3>
            </div>
            <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-md border border-border">{completedTasks.length}</span>
          </div>
          <div className="p-4 flex flex-col gap-3 flex-1 overflow-y-auto max-h-[800px]">
            {completedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground py-16">
                <CheckCircle2 className="w-12 h-12 mb-4 opacity-10" />
                <p className="text-sm font-semibold">No completed tasks.</p>
                <p className="text-xs opacity-50 mt-1">Drag tasks here when finished.</p>
              </div>
            ) : (
              completedTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onDragStart={handleDragStart} 
                  activeTab={activeTab} 
                  clients={clients}
                  employees={employees}
                  currentUserId={currentUserId}
                  onDelete={handleDeleteTask}
                  onUpdate={handleUpdateTask}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

interface TaskCardProps {
  task: any
  onDragStart: any
  activeTab: string
  clients: any[]
  employees: any[]
  currentUserId: string
  onDelete: (id: string) => void
  onUpdate: (task: any) => void
}

const TaskCard = React.memo(function TaskCard({ 
  task, 
  onDragStart, 
  activeTab, 
  clients, 
  employees, 
  currentUserId, 
  onDelete, 
  onUpdate 
}: TaskCardProps) {
  const priConf = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !['completed','approved'].includes(task.status)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      draggable
      onDragStart={(e: any) => onDragStart(e, task.id)}
      className="bg-card hover:bg-muted/50 rounded-xl p-4 border border-border hover:border-border transition-all cursor-grab active:cursor-grabbing group shadow-md"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2 items-center">
          {priConf && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border ${priConf.bg} ${priConf.color}`}>
              {priConf.label}
            </span>
          )}
          {isOverdue && <span className="flex items-center gap-1 text-[9px] font-bold text-red-400 uppercase tracking-wider bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20"><AlertTriangle className="w-2.5 h-2.5" /> Overdue</span>}
        </div>
        
        <div className="flex items-center gap-2">
          {task.deadline && (
            <span className="text-[10px] font-medium text-muted-foreground mr-1">Due: {new Date(task.deadline).toLocaleDateString()}</span>
          )}
          
          {/* Edit / Delete Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <TaskModal
              clients={clients}
              employees={employees}
              isPersonal={activeTab === 'personal'}
              currentUserId={currentUserId}
              task={task}
              onSuccess={() => {
                // Re-fetch or trigger page reload
                window.location.reload()
              }}
              trigger={
                <button 
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit Task"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              }
            />
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(task.id)
              }}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
              title="Delete Task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <p className="text-[15px] font-semibold text-muted-foreground mb-4 leading-snug">{task.title}</p>

      {activeTab === 'team' && (
        <>
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Avatar initials={task.assignee?.full_name || 'Unassigned'} src={task.assignee?.avatar_url} size="inline" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Assignee</span>
                <span className="text-[11px] font-semibold text-violet-400">{task.assignee?.full_name || 'Unassigned'}</span>
              </div>
            </div>
            {(task.client || task.custom_client_name) && (
              <div className="flex flex-col gap-1 items-end">
                <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Client</span>
                <span className="text-[11px] font-medium text-muted-foreground">{task.client?.name || task.custom_client_name}</span>
              </div>
            )}
          </div>
          {task.payment_amount > 0 && (
            <div className="mt-3 flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2.5">
              <span className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-wider">Payout Amount</span>
              <span className="text-xs font-black text-emerald-400">₹{Number(task.payment_amount).toLocaleString('en-IN')}</span>
            </div>
          )}
        </>
      )}
      
      {task.delivery_link && (
        <a 
          href={task.delivery_link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 text-muted-foregroundlue-400 border border-blue-500/20 rounded-lg transition-colors text-xs font-bold"
          onClick={e => e.stopPropagation()}
        >
          <Link2 className="w-3.5 h-3.5" /> View Delivery
        </a>
      )}
    </motion.div>
  )
})
