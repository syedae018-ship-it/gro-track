import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { DashboardLayoutClient } from './DashboardLayoutClient'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
