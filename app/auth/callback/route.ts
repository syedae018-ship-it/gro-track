import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard/overview'
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[auth/callback] Code exchange error:', error.message)
      return NextResponse.redirect(
        `${origin}/login?message=${encodeURIComponent('Email verification failed. Please try again.')}`
      )
    }

    if (data.user) {
      // Ensure profile exists (safety net in case trigger didn't fire)
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name:
          data.user.user_metadata?.full_name ||
          data.user.email?.split('@')[0] ||
          'User',
        role: data.user.user_metadata?.role || 'employee',
      }, { onConflict: 'id' })
    }

    return NextResponse.redirect(`${origin}${next}`)
  }

  // No code — redirect to login
  return NextResponse.redirect(
    `${origin}/login?message=${encodeURIComponent('Invalid or expired verification link.')}`
  )
}
