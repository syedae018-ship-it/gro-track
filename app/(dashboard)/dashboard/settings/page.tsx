"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useProfile } from "@/hooks/use-dashboard-data"
import { SettingsSkeleton } from "@/components/shared/Skeletons"
import { LazyProfileSettingsForm } from "@/components/lazy"
import { useRouter } from "next/navigation"

import { useSession } from "next-auth/react"

export default function ProfileSettingsPage() {
  const { data: session } = useSession()
  // @ts-ignore
  const userId = session?.user?.id as string | undefined
  const userEmail = session?.user?.email || ""

  const { data: profile } = useProfile(userId)

  if (!userId || !profile) return <SettingsSkeleton />

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-syne font-bold text-foreground">Profile Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account identity, contact info, and payment details.</p>
      </div>
      <LazyProfileSettingsForm profile={profile} userId={userId} userEmail={userEmail} />
    </div>
  )
}
