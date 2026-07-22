import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { DashboardLayoutClient } from './DashboardLayoutClient'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const session = await getServerSession(authOptions)
  const user = session?.user
  const isGuest = cookies().get('guest_mode')?.value === 'true'

  // Fetch full profile for accurate role data
  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, role, avatar_url, specialization')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <DashboardLayoutClient isGuest={isGuest} user={user} profile={profile}>
      {children}
    </DashboardLayoutClient>
  )
}
