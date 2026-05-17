import { cn } from "@/lib/utils"

export type TaskPriority = "high" | "medium" | "low"

interface PriorityPillProps {
  priority: TaskPriority
  className?: string
}

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  high: {
    label: "High",
    className: "bg-[rgba(239,68,68,0.15)] text-[#f87171]",
  },
  medium: {
    label: "Medium",
    className: "bg-[rgba(245,158,11,0.15)] text-[#fbbf24]",
  },
  low: {
    label: "Low",
    className: "bg-[rgba(16,185,129,0.15)] text-[#34d399]",
  },
}

export function PriorityPill({ priority, className }: PriorityPillProps) {
  const config = priorityConfig[priority]

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
