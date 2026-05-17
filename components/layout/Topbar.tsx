"use client"

import React, { useState, useRef, useEffect } from "react"
import { Bell, Search, LogOut, Settings, User as UserIcon } from "lucide-react"
import { logout } from "@/app/(auth)/actions"

interface TopbarProps {
  user: any
  isGuest: boolean
  profile?: { full_name: string; role: string } | null
}

export const Topbar = React.memo(function Topbar({ user, isGuest, profile }: TopbarProps) {
  const displayName = isGuest ? "Guest User" : profile?.full_name || user?.user_metadata?.full_name || "User"
  const displayEmail = isGuest ? "demo@grotrack.app" : user?.email
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="p-4 sticky top-0 z-30 w-full">
      <header className="h-[60px] glass-panel rounded-full flex items-center justify-between px-6 shadow-neon-border border border-primary/20 bg-surface/70">
        {/* Search area - Global Cmd+K trigger */}
        <div className="flex-1 max-w-md">
          <button className="flex items-center text-[13px] text-muted-foreground hover:text-foreground transition-colors w-full bg-input border border-border rounded-full h-10 px-4 focus:ring-2 focus:ring-ring focus:outline-none">
            <Search className="w-4 h-4 mr-2 text-primary" />
            <span>Search tasks, clients...</span>
            <div className="ml-auto flex items-center gap-1">
              <kbd className="bg-primary/20 text-primary border border-primary/30 rounded px-2 py-0.5 text-[10px] font-sans">⌘</kbd>
              <kbd className="bg-primary/20 text-primary border border-primary/30 rounded px-2 py-0.5 text-[10px] font-sans">K</kbd>
            </div>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <button className="relative w-10 h-10 flex items-center justify-center rounded-full bg-input border border-border text-secondary-foreground hover:text-white hover:bg-primary/20 hover:border-primary/50 hover:shadow-luxury-glow transition-all">
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full shadow-[0_0_5px_#c084fc]" />
          </button>

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-10 h-10 rounded-full bg-gradient-primary border border-primary/40 shadow-luxury-glow flex items-center justify-center overflow-hidden hover:brightness-110 hover:shadow-purple-bloom transition-all"
            >
              <span className="text-sm font-bold text-white">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-48 rounded-2xl border border-primary/30 bg-surface backdrop-blur-xl shadow-purple-bloom overflow-hidden py-2 z-50">
                <div className="px-4 py-3 border-b border-border/50 mb-1">
                  <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                </div>
                
                <button className="w-full text-left px-4 py-2.5 text-sm text-secondary-foreground hover:text-primary hover:bg-primary/10 flex items-center gap-3 transition-colors">
                  <Settings className="w-4 h-4" />
                  Account Settings
                </button>
                
                <form action={logout}>
                  <button type="submit" className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-3 transition-colors">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  )
})
