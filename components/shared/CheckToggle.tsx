"use client"

import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Check } from "lucide-react"

interface CheckToggleProps {
  checked: boolean
  onToggle: (checked: boolean) => void
  className?: string
  disabled?: boolean
}

export function CheckToggle({ checked, onToggle, className, disabled }: CheckToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onToggle(!checked)
      }}
      className={cn(
        "relative flex items-center justify-center w-4 h-4 rounded-[4px] transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked
          ? "bg-[#10b981] border-[#10b981]"
          : "bg-transparent border-[1.5px] border-white/12 hover:border-white/20",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <AnimatePresence>
        {checked && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30, duration: 0.15 }}
          >
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
