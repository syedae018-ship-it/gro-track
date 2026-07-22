"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Check, Trash2, Shield } from "lucide-react"

export interface PersonalTask {
  id: string
  title: string
  completed: boolean
  createdAt: number
}

interface PersonalTasksProps {
  onTaskCompleted?: () => void
}

export function PersonalTasks({ onTaskCompleted }: PersonalTasksProps) {
  const [tasks, setTasks] = useState<PersonalTask[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("grotrack_personal_tasks")
    if (saved) {
      try {
        setTasks(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to parse personal tasks", e)
      }
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("grotrack_personal_tasks", JSON.stringify(tasks))
    }
  }, [tasks, isLoaded])

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const newTask: PersonalTask = {
      id: crypto.randomUUID(),
      title: newTaskTitle.trim(),
      completed: false,
      createdAt: Date.now(),
    }

    setTasks(prev => [newTask, ...prev])
    setNewTaskTitle("")
  }

  const toggleTask = (id: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === id) {
          const newCompleted = !t.completed
          if (newCompleted && onTaskCompleted) {
            onTaskCompleted()
          }
          return { ...t, completed: newCompleted }
        }
        return t
      })
    )
  }

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  if (!isLoaded) return null

  const pending = tasks.filter(t => !t.completed)
  const completed = tasks.filter(t => t.completed)

  return (
    <div className="bg-muted/30 border border-border rounded-3xl p-5 mb-8 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 p-32 bg-violet-500/5 blur-[100px] pointer-events-none rounded-full -mr-16 -mt-16" />
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-bold text-foreground">Personal Tasks</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-semibold border border-violet-500/20">
            Private
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground hidden sm:block">
          Only visible to you
        </p>
      </div>

      <form onSubmit={handleAdd} className="relative z-10 flex gap-2 mb-4">
        <input
          type="text"
          value={newTaskTitle}
          onChange={e => setNewTaskTitle(e.target.value)}
          placeholder="What do you need to do?"
          className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-muted-foreground/50"
        />
        <button
          type="submit"
          disabled={!newTaskTitle.trim()}
          className="bg-violet-600 hover:bg-violet-700 disabled:bg-muted disabled:text-muted-foreground text-white rounded-xl px-4 py-2.5 transition-colors flex items-center justify-center font-medium shadow-sm shadow-violet-500/20"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>

      <div className="relative z-10 flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {pending.map(task => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group flex items-center justify-between bg-background border border-border/60 hover:border-violet-500/30 rounded-xl p-3 transition-all"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleTask(task.id)}
                  className="w-5 h-5 rounded-md border border-muted-foreground/30 flex items-center justify-center hover:border-violet-400 transition-colors"
                >
                  <Check className="w-3.5 h-3.5 text-transparent" />
                </button>
                <span className="text-sm font-medium text-foreground">{task.title}</span>
              </div>
              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {completed.length > 0 && (
          <div className="mt-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Completed
            </h3>
            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {completed.map(task => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group flex items-center justify-between bg-background/50 border border-border/40 rounded-xl p-3 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className="w-5 h-5 rounded-md bg-green-500 flex items-center justify-center border border-green-600 shadow-sm shadow-green-500/20"
                      >
                        <Check className="w-3.5 h-3.5 text-white" />
                      </button>
                      <span className="text-sm font-medium text-muted-foreground line-through decoration-muted-foreground/30">
                        {task.title}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {tasks.length === 0 && (
          <div className="text-center py-6">
            <p className="text-xs text-muted-foreground">
              Add personal tasks like &quot;Go to gym&quot; or &quot;Read a book&quot;
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
