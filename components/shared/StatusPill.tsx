import { cn } from "@/lib/utils"

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done" | "pending" | "approved" | "paid"

interface StatusPillProps {
  status: TaskStatus
  className?: string
}

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  todo: {
    label: "To Do",
    className: "bg-white/10 text-white", // Not strictly specified in prompt, but makes sense
  },
  in_progress: {
    label: "In Progress",
    className: "bg-[rgba(79,142,247,0.12)] text-[#6ba3ff]",
  },
  in_review: {
    label: "In Review",
    className: "bg-[rgba(139,92,246,0.12)] text-[#a78bfa]",
  },
  done: {
    label: "Done",
    className: "bg-[rgba(16,185,129,0.12)] text-[#34d399]",
  },
  pending: {
    label: "Pending",
    className: "bg-[rgba(100,116,139,0.15)] text-[#64748b]",
  },
  approved: {
    label: "Approved",
    className: "bg-[rgba(16,185,129,0.12)] text-[#34d399]",
  },
  paid: {
    label: "Paid",
    className: "bg-[rgba(79,142,247,0.12)] text-[#6ba3ff]",
  }
}

export function StatusPill({ status, className }: StatusPillProps) {
  const config = statusConfig[status] || statusConfig.todo

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
