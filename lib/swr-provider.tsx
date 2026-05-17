"use client"

import { SWRConfig } from "swr"

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 30_000,       // 30s dedup — prevents refetch on tab switch
        focusThrottleInterval: 120_000, // 2min throttle on focus
        errorRetryCount: 2,
        keepPreviousData: true,         // Show stale data while revalidating
      }}
    >
      {children}
    </SWRConfig>
  )
}
