"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useProfile } from "@/hooks/use-dashboard-data"
import { SettingsSkeleton } from "@/components/shared/Skeletons"
import { LazyProfileSettingsForm } from "@/components/lazy"
import { useRouter } from "next/navigation"

export default function ProfileSettingsPage() {
  const [userId, setUserId] = useState<string | undefined>()
  const [userEmail, setUserEmail] = useState("")
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace("/login"); return }
      setUserId(data.user.id)
      setUserEmail(data.user.email || "")
    })
  }, [router])

  const { data: profile } = useProfile(userId)

  if (!userId || !profile) return <SettingsSkeleton />

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-syne font-bold text-white">Profile Settings</h1>
        <p className="text-sm text-white/40 mt-1">Manage your account identity, contact info, and payment details.</p>
      </div>
      <LazyProfileSettingsForm profile={profile} userId={userId} userEmail={userEmail} />
    </div>
  )
}
