"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-input border border-border text-secondary-foreground hover:text-primary-foreground hover:bg-primary/10 hover:border-border hover:border-primary/30 transition-all active:scale-95 shrink-0"
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 sm:h-[18px] sm:w-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 sm:h-[18px] sm:w-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
