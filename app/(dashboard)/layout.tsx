import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { DashboardLayoutClient } from './DashboardLayoutClient'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  // Use NextAuth session as the source of truth for display & role
  const user = session.user as any
  const profile = {
    full_name: user.name || user.email?.split('@')[0],
    role: user.role || 'employee',
    avatar_url: user.image || null,
    specialization: user.designation || null,
  }

  return (
    <DashboardLayoutClient isGuest={false} user={user} profile={profile}>
      {children}
    </DashboardLayoutClient>
  )
}
