"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Check, ChevronDown, PenLine } from "lucide-react"

export interface ClientSelection {
  /** Non-null means user picked an existing DB client */
  client_id: string | null
  /** Non-null means user typed a one-off name */
  custom_client_name: string | null
  /** Display label for the field */
  displayName: string
}

interface ClientComboboxProps {
  /** Pre-loaded list of clients from server (avoids redundant fetches) */
  initialClients?: { id: string; name: string }[]
  /** Called whenever the selection changes */
  onChange: (selection: ClientSelection) => void
  /** Placeholder text */
  placeholder?: string
  /** CSS class override for the trigger container */
  className?: string
  /** If true, do not show the "All Clients" section header */
  compact?: boolean
}

const EMPTY: ClientSelection = { client_id: null, custom_client_name: null, displayName: "" }

export function ClientCombobox({
  initialClients = [],
  onChange,
  placeholder = "Select or type client…",
  className = "",
  compact = false,
}: ClientComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [allClients, setAllClients] = useState<{ id: string; name: string }[]>(initialClients)
  const [selected, setSelected] = useState<ClientSelection>(EMPTY)
  const [fetchedFull, setFetchedFull] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch full client list once when dropdown opens (if not yet fetched)
  useEffect(() => {
    if (isOpen && !fetchedFull) {
      fetch("/api/clients")
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setAllClients(data)
          setFetchedFull(true)
        })
        .catch(() => {}) // Silently fail — initial list still works
    }
  }, [isOpen, fetchedFull])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [isOpen])

  const filteredClients = allClients.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  )

  const selectClient = useCallback((client: { id: string; name: string }) => {
    const sel: ClientSelection = {
      client_id: client.id,
      custom_client_name: null,
      displayName: client.name,
    }
    setSelected(sel)
    setQuery("")
    setIsOpen(false)
    onChange(sel)
  }, [onChange])

  const useCustomName = useCallback(() => {
    if (!query.trim()) return
    const sel: ClientSelection = {
      client_id: null,
      custom_client_name: query.trim(),
      displayName: query.trim(),
    }
    setSelected(sel)
    setQuery("")
    setIsOpen(false)
    onChange(sel)
  }, [query, onChange])

  const clear = useCallback(() => {
    setSelected(EMPTY)
    setQuery("")
    onChange(EMPTY)
  }, [onChange])

  const isCustom = selected.client_id === null && !!selected.custom_client_name

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger / Display */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 bg-white/4 border rounded-xl px-3.5 py-2.5 text-sm transition-all focus:outline-none ${
          isOpen
            ? "border-violet-500/50 ring-2 ring-violet-500/10"
            : "border-white/8 hover:border-white/15"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selected.displayName ? (
            <>
              {isCustom ? (
                <PenLine className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-sm bg-violet-500/30 border border-violet-500/40 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-violet-300" />
                </div>
              )}
              <span className={`truncate font-medium ${isCustom ? "text-amber-300" : "text-white"}`}>
                {selected.displayName}
              </span>
              {isCustom && (
                <span className="text-[9px] uppercase tracking-wider font-bold text-amber-500/60 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full shrink-0">
                  Custom
                </span>
              )}
            </>
          ) : (
            <span className="text-white/25 truncate">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-white/30 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Clear button */}
      {selected.displayName && (
        <button
          type="button"
          onClick={clear}
          className="absolute right-8 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 text-xs transition-colors"
        >
          ✕
        </button>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#13131a] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
          >
            {/* Search Input */}
            <div className="p-2 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") useCustomName()
                    if (e.key === "Escape") setIsOpen(false)
                  }}
                  placeholder="Search clients or type custom name…"
                  className="w-full bg-white/5 border border-white/8 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/40 transition-all"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-52">
              {/* Custom name option — shown when user has typed something not matching exactly */}
              {query.trim() && !filteredClients.some(c => c.name.toLowerCase() === query.toLowerCase()) && (
                <button
                  type="button"
                  onMouseDown={useCustomName}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors text-left group border-b border-white/5"
                >
                  <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                    <PenLine className="w-3 h-3 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-300">Use "{query.trim()}"</p>
                    <p className="text-[9px] text-white/30">One-off · won't be saved to Clients</p>
                  </div>
                </button>
              )}

              {/* Client list */}
              {!compact && !query && (
                <p className="px-3 pt-2.5 pb-1 text-[9px] uppercase tracking-wider font-bold text-white/25">Existing Clients</p>
              )}

              {filteredClients.length === 0 && !query.trim() ? (
                <div className="px-3 py-4 text-xs text-white/25 text-center">No clients found. Add some in the Clients section.</div>
              ) : filteredClients.length === 0 && query.trim() ? null : (
                filteredClients.map(client => (
                  <button
                    key={client.id}
                    type="button"
                    onMouseDown={() => selectClient(client)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-violet-500/8 transition-colors text-left ${
                      selected.client_id === client.id ? "bg-violet-500/8" : ""
                    }`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-white/80 font-medium">{client.name}</span>
                    {selected.client_id === client.id && (
                      <Check className="w-3.5 h-3.5 text-violet-400 ml-auto" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="px-3 py-2 border-t border-white/5 flex items-center gap-1.5">
              <kbd className="text-[9px] bg-white/5 border border-white/10 rounded px-1 py-0.5 text-white/25">Enter</kbd>
              <span className="text-[9px] text-white/20">to use as custom client</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
