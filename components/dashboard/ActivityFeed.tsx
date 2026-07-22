"use client"

import { motion } from "framer-motion"
import { CheckCircle2, UserPlus, FolderPlus, Bell } from "lucide-react"

export function ActivityFeed({ logs }: { logs: any[] }) {
 const getIcon = (action: string) => {
 if (action.includes('Task')) return <CheckCircle2 className="w-4 h-4 text-green-400" />
 if (action.includes('Client')) return <UserPlus className="w-4 h-4 text-muted-foregroundlue-400" />
 if (action.includes('Project')) return <FolderPlus className="w-4 h-4 text-purple-400" />
 return <Bell className="w-4 h-4 text-secondary" />
 }

 return (
 <div className="flex flex-col gap-4">
 {logs.map((log, i) => (
 <motion.div 
 key={log.id}
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ duration: 0.3, delay: i * 0.1 }}
 className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border"
 >
 <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 mt-1">
 {getIcon(log.action)}
 </div>
 <div className="flex flex-col">
 <span className="text-sm font-medium text-foreground">{log.action}</span>
 {log.details?.client_name && (
 <span className="text-xs text-muted mt-0.5">{log.details.client_name}</span>
 )}
 {log.details?.message && (
 <span className="text-xs text-muted mt-0.5">{log.details.message}</span>
 )}
 <span className="text-[10px] text-secondary mt-1 uppercase tracking-wider">
 {new Date(log.created_at).toLocaleDateString()}
 </span>
 </div>
 </motion.div>
 ))}
 {logs.length === 0 && (
 <div className="text-sm text-muted text-center py-8">No recent activity</div>
 )}
 </div>
 )
}
