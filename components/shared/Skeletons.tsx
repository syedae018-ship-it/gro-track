"use client"

import { cn } from "@/lib/utils"

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl bg-white/[0.04] animate-pulse",
        className
      )}
    />
  )
}

/* ──────────────── Stat Cards Skeleton ──────────────── */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${Math.min(count, 4)} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col gap-3">
          <Shimmer className="w-8 h-8 rounded-lg" />
          <div>
            <Shimmer className="w-16 h-3 mb-2" />
            <Shimmer className="w-24 h-7" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ──────────────── Dashboard Skeleton ──────────────── */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div>
        <Shimmer className="w-60 h-7 mb-2" />
        <Shimmer className="w-80 h-4" />
      </div>

      {/* Stat Cards */}
      <StatCardsSkeleton count={5} />

      {/* Two-column content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 flex flex-col gap-4">
          <Shimmer className="w-32 h-5" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <Shimmer className="w-full h-1.5 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <Shimmer className="w-32 h-5" />
          </div>
          <div className="divide-y divide-white/5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1">
                  <Shimmer className="w-48 h-4 mb-1.5" />
                  <Shimmer className="w-32 h-3" />
                </div>
                <Shimmer className="w-16 h-5 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ──────────────── Task Board Skeleton ──────────────── */
export function TaskBoardSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div>
        <Shimmer className="w-44 h-7 mb-2" />
        <Shimmer className="w-64 h-4" />
      </div>

      {/* Tabs + Filters */}
      <div className="flex items-center gap-4">
        <Shimmer className="w-48 h-10 rounded-xl" />
        <Shimmer className="w-32 h-10 rounded-lg" />
      </div>
      <Shimmer className="w-full h-12 rounded-xl" />

      {/* Board columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {[0, 1].map(col => (
          <div key={col} className="bg-[#0a0a0d] border border-white/5 rounded-2xl overflow-hidden min-h-[400px]">
            <div className="px-5 py-4 border-b border-white/5 flex justify-between">
              <Shimmer className="w-20 h-5" />
              <Shimmer className="w-8 h-5 rounded-md" />
            </div>
            <div className="p-4 flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-[#16161c] rounded-xl p-4 border border-white/5">
                  <div className="flex gap-2 mb-3">
                    <Shimmer className="w-12 h-4 rounded" />
                    <Shimmer className="w-24 h-4 rounded" />
                  </div>
                  <Shimmer className="w-full h-5 mb-4" />
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <Shimmer className="w-5 h-5 rounded-md" />
                      <Shimmer className="w-20 h-3" />
                    </div>
                    <Shimmer className="w-16 h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────── Analytics Skeleton ──────────────── */
export function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <Shimmer className="w-36 h-8 mb-2" />
        <Shimmer className="w-80 h-4" />
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex flex-col gap-1.5">
            <Shimmer className="w-4 h-4" />
            <Shimmer className="w-20 h-6" />
            <Shimmer className="w-16 h-3" />
          </div>
        ))}
      </div>

      {/* Employee cards */}
      <Shimmer className="w-64 h-4 mb-1" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[#111115] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <Shimmer className="w-10 h-10 rounded-xl" />
              <div className="flex-1">
                <Shimmer className="w-28 h-4 mb-1" />
                <Shimmer className="w-16 h-3" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[0, 1, 2].map(j => (
                <div key={j} className="text-center">
                  <Shimmer className="w-8 h-5 mx-auto mb-1" />
                  <Shimmer className="w-12 h-3 mx-auto" />
                </div>
              ))}
            </div>
            <Shimmer className="w-full h-1.5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────── Employee Grid Skeleton ──────────────── */
export function EmployeeGridSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <Shimmer className="w-48 h-8 mb-2" />
        <Shimmer className="w-80 h-4" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[#111115] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <Shimmer className="w-12 h-12 rounded-xl" />
              <div className="flex-1">
                <Shimmer className="w-32 h-5 mb-1.5" />
                <Shimmer className="w-20 h-3" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Shimmer className="w-full h-4" />
              <Shimmer className="w-3/4 h-4" />
              <Shimmer className="w-1/2 h-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────── Payments Skeleton ──────────────── */
export function PaymentsSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <Shimmer className="w-36 h-8 mb-2" />
        <Shimmer className="w-72 h-4" />
      </div>
      <StatCardsSkeleton count={4} />
      <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <Shimmer className="w-40 h-5" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-5 py-3 flex items-center gap-4 border-b border-white/5">
            <Shimmer className="w-8 h-8 rounded-xl" />
            <div className="flex-1">
              <Shimmer className="w-32 h-4 mb-1" />
              <Shimmer className="w-20 h-3" />
            </div>
            <Shimmer className="w-20 h-5" />
            <Shimmer className="w-16 h-5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────── Earnings Skeleton ──────────────── */
export function EarningsSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <Shimmer className="w-40 h-8 mb-2" />
        <Shimmer className="w-64 h-4" />
      </div>
      <StatCardsSkeleton count={4} />
      <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex justify-between">
          <Shimmer className="w-32 h-5" />
          <Shimmer className="w-48 h-8 rounded-lg" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-5 py-3 flex items-center gap-4 border-b border-white/5">
            <div className="flex-1">
              <Shimmer className="w-48 h-4 mb-1" />
              <Shimmer className="w-24 h-3" />
            </div>
            <Shimmer className="w-16 h-5" />
            <Shimmer className="w-16 h-5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────── Settings Skeleton ──────────────── */
export function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <div>
        <Shimmer className="w-48 h-8 mb-2" />
        <Shimmer className="w-72 h-4" />
      </div>
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 flex flex-col gap-5">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <Shimmer className="w-20 h-20 rounded-2xl" />
          <div>
            <Shimmer className="w-32 h-5 mb-2" />
            <Shimmer className="w-24 h-8 rounded-lg" />
          </div>
        </div>
        {/* Fields */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <Shimmer className="w-24 h-3 mb-2" />
            <Shimmer className="w-full h-10 rounded-lg" />
          </div>
        ))}
        <Shimmer className="w-32 h-10 rounded-lg mt-2" />
      </div>
    </div>
  )
}

/* ──────────────── Employee Task Feed Skeleton ──────────────── */
export function TaskFeedSkeleton() {
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center justify-between">
        <div>
          <Shimmer className="w-44 h-6 mb-1" />
          <Shimmer className="w-32 h-3" />
        </div>
        <Shimmer className="w-24 h-8 rounded-xl" />
      </div>
      <StatCardsSkeleton count={4} />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-[#111115] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Shimmer className="w-48 h-5" />
              <div className="flex gap-2">
                <Shimmer className="w-14 h-5 rounded" />
                <Shimmer className="w-16 h-5 rounded-full" />
              </div>
            </div>
            <Shimmer className="w-32 h-3" />
          </div>
        ))}
      </div>
    </div>
  )
}
