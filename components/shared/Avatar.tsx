"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import Image from "next/image"

export type AvatarSize = "inline" | "list" | "sidebar" | "sm" | "md" | "lg" | "xl"
export type AvatarGradient = "blue-purple" | "green-cyan" | "amber-red" | "purple-pink" | "none" | "violet-blue" | "pink-rose" | "amber-orange" | "emerald-teal"

const sizeClasses: Record<AvatarSize, { container: string; text: string }> = {
  inline:  { container: "w-5 h-5 rounded-md",     text: "text-[9px]" },
  list:    { container: "w-8 h-8 rounded-xl",     text: "text-sm" },
  sidebar: { container: "w-[30px] h-[30px] rounded-[8px]", text: "text-xs" },
  sm:      { container: "w-7 h-7 rounded-lg",     text: "text-[10px]" },
  md:      { container: "w-10 h-10 rounded-xl",   text: "text-sm" },
  lg:      { container: "w-14 h-14 rounded-2xl",  text: "text-lg" },
  xl:      { container: "w-20 h-20 rounded-2xl",  text: "text-2xl" },
}

const gradientClasses: Record<AvatarGradient, string> = {
  "blue-purple":   "bg-gradient-to-br from-blue-600 to-violet-600",
  "green-cyan":    "bg-gradient-to-br from-emerald-500 to-cyan-500",
  "amber-red":     "bg-gradient-to-br from-amber-500 to-red-500",
  "purple-pink":   "bg-gradient-to-br from-purple-600 to-pink-500",
  "violet-blue":   "bg-gradient-to-br from-violet-600 to-blue-600",
  "pink-rose":     "bg-gradient-to-br from-pink-600 to-rose-500",
  "amber-orange":  "bg-gradient-to-br from-amber-500 to-orange-500",
  "emerald-teal":  "bg-gradient-to-br from-emerald-500 to-teal-500",
  "none":          "bg-white/10",
}

interface AvatarProps {
  initials: string
  size?: AvatarSize
  gradient?: AvatarGradient
  className?: string
  /** If provided, shows the profile photo instead of initials */
  src?: string | null
}

export const Avatar = React.memo(function Avatar({ initials, size = "list", gradient = "blue-purple", className, src }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const { container, text } = sizeClasses[size]

  if (src && !imgError) {
    return (
      <div className={cn("relative overflow-hidden shrink-0", container, className)}>
        <Image
          src={src}
          alt={initials}
          fill
          className="object-cover"
          onError={() => setImgError(true)}
          sizes="80px"
          loading="lazy"
          placeholder="empty"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center font-syne font-bold text-white shrink-0",
        container,
        gradientClasses[gradient],
        className
      )}
    >
      <span className={text}>{initials.substring(0, 2).toUpperCase()}</span>
    </div>
  )
})
