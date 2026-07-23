"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { isAdmin } from "@/lib/utils/roles"
import { useProfile, usePaymentsPage } from "@/hooks/use-dashboard-data"
import { PaymentsSkeleton } from "@/components/shared/Skeletons"
import { LazyPaymentsDashboard } from "@/components/lazy"
import { useRouter } from "next/navigation"

import { useAuth } from "@/hooks/use-auth"
export default function PaymentsPage() {
  const { data: session } = useAuth()
  // @ts-ignore
  const userId = session?.user?.id as string | undefined
  const router = useRouter()

  const { data: profile } = useProfile(userId)
  const admin = isAdmin(profile?.role || "")

  useEffect(() => {
    if (profile && !admin) router.replace("/dashboard/overview")
  }, [profile, admin, router])

  const { data: payouts } = usePaymentsPage(!!userId && admin)

  if (!userId || !profile || !payouts) return <PaymentsSkeleton />

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-3xl font-syne font-bold text-foreground">Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Employee payout tracker — all compensation transactions in one place.
        </p>
      </div>
      <LazyPaymentsDashboard payouts={payouts} />
    </div>
  )
}
