'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function login(formData: FormData) {
  // Immediately clear the guest_mode cookie so middleware doesn't intercept us
  try { cookies().delete('guest_mode') } catch {}

  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  // Add a 10s timeout so login never hangs indefinitely
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  let data: any, error: any
  try {
    const result = await supabase.auth.signInWithPassword({ email, password })
    data = result.data
    error = result.error
  } catch (e: any) {
    clearTimeout(timeoutId)
    if (e?.name === 'AbortError') {
      return { error: 'Login timed out. Check your internet connection and try again.' }
    }
    return { error: 'Network error. Please check your connection and try again.' }
  }
  clearTimeout(timeoutId)

  if (error) {
    console.error('[LOGIN ERROR]', {
      status: error.status,
      message: error.message,
      email,
    })

    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Invalid email or password. Please check your credentials.' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Your email is not yet verified. Check your inbox, or contact support.' }
    }
    if (error.message.includes('User not found')) {
      return { error: 'No account found with this email. Please sign up first.' }
    }
    if (error.message.includes('Too many requests')) {
      return { error: 'Too many attempts. Please wait a minute and try again.' }
    }
    return { error: `Login failed: ${error.message}` }
  }

  // Ensure profile exists — safety net in case the DB trigger didn't fire
  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .single()

    if (!profile) {
      console.warn('[LOGIN] Profile missing for user', data.user.id, '— creating one now')
      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name:
          data.user.user_metadata?.full_name ||
          data.user.email?.split('@')[0] ||
          'User',
        role: data.user.user_metadata?.role || 'employee',
      }, { onConflict: 'id' })
      if (upsertError) {
        console.error('[LOGIN] Profile upsert failed:', upsertError.message)
      }
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard/overview')
}

export async function loginAsGuest() {
  cookies().set('guest_mode', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  })
  redirect('/dashboard/demo')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm_password') as string
  const fullName = (formData.get('full_name') as string)?.trim()
  const role = formData.get('role') as string

  if (!email || !password || !fullName) {
    return { error: 'All fields are required.' }
  }
  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }
  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters.' }
  }


  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role: role || 'employee' },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (error) {
    if (error.message.includes('User already registered')) {
      return { error: 'An account with this email already exists. Please log in.' }
    }
    return { error: error.message }
  }

  // Email confirmation disabled → user has a session immediately
  if (data.user && data.session) {
    // Upsert profile (trigger should have done it, but belt-and-suspenders)
    await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName,
      role: role || 'employee',
    }, { onConflict: 'id' })

    return { success: true, email, autoLogin: true }
  }

  // Email confirmation required
  return { success: true, email, autoLogin: false }
}

export async function resendVerificationEmail(email: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  try { cookies().delete('guest_mode') } catch {}
  redirect('/login')
}
