"use client"

import { cn } from "@/lib/utils"

type Role = "employee" | "admin_ops" | "admin_finance" | "managing_director" | "admin" | string

const ROLE_CONFIG: Record<string, { label: string; gradient: string; glow: string; border: string; text: string }> = {
  managing_director: {
    label: "Managing Director",
    gradient: "from-yellow-500 to-amber-400",
    glow: "shadow-[0_0_12px_rgba(234,179,8,0.25)]",
    border: "border-yellow-500/30",
    text: "text-yellow-300",
  },
  admin_ops: {
    label: "Admin — Ops",
    gradient: "from-violet-500 to-purple-400",
    glow: "shadow-[0_0_12px_rgba(139,92,246,0.25)]",
    border: "border-violet-500/30",
    text: "text-violet-300",
  },
  admin_finance: {
    label: "Admin — Finance",
    gradient: "from-fuchsia-500 to-pink-400",
    glow: "shadow-[0_0_12px_rgba(217,70,239,0.2)]",
    border: "border-fuchsia-500/30",
    text: "text-fuchsia-300",
  },
  admin: {
    label: "Admin",
    gradient: "from-violet-500 to-purple-400",
    glow: "shadow-[0_0_12px_rgba(139,92,246,0.25)]",
    border: "border-violet-500/30",
    text: "text-violet-300",
  },
  employee: {
    label: "Employee",
    gradient: "from-sky-500 to-blue-400",
    glow: "shadow-[0_0_10px_rgba(14,165,233,0.15)]",
    border: "border-sky-500/20",
    text: "text-sky-300",
  },
}

interface RoleBadgeProps {
  role: Role
  size?: "sm" | "md" | "lg"
  className?: string
}

export function RoleBadge({ role, size = "md", className }: RoleBadgeProps) {
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.employee

  const sizeClasses = {
    sm: "text-[9px] px-1.5 py-0.5 tracking-wide",
    md: "text-[10px] px-2.5 py-1 tracking-wider",
    lg: "text-xs px-3 py-1.5 tracking-widest",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-bold uppercase border",
        `bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`,
        config.border,
        config.glow,
        sizeClasses[size],
        className
      )}
      style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
               background: `linear-gradient(to right, var(--tw-gradient-stops))` }}
    >
      {/* Use plain text with color fallback */}
      <span className={cn("font-bold uppercase", config.text, sizeClasses[size])}>
        {config.label}
      </span>
    </span>
  )
}
