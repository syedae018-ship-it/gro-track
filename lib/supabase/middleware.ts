import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not add any logic between createServerClient and auth.getUser().
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const method = request.method

  // ── Only apply redirects on GET requests ───────────────────────────────────
  // POST requests are Server Actions — never redirect them, let them complete.
  if (method !== 'GET') {
    return supabaseResponse
  }

  // ── Dashboard route protection ──────────────────────────────────────────────
  if (path.startsWith('/dashboard')) {
    const isGuest = request.cookies.get('guest_mode')?.value === 'true'

    if (!isGuest && !user) {
      // Not authenticated → send to login (302 to change POST→GET if ever needed)
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl, { status: 302 })
    }

    if (isGuest && path !== '/dashboard/demo') {
      const demoUrl = request.nextUrl.clone()
      demoUrl.pathname = '/dashboard/demo'
      return NextResponse.redirect(demoUrl, { status: 302 })
    }

    // Role-based protection for authenticated users
    if (user && !isGuest) {
      const role = user.user_metadata?.role || 'employee'
      const adminOnlyPaths = [
        '/dashboard/clients',
        '/dashboard/employees',
        '/dashboard/payments',
        '/dashboard/invoices',
        '/dashboard/analytics',
      ]
      const isAdminRole = ['admin_ops', 'admin_finance', 'managing_director'].includes(role)

      if (!isAdminRole && adminOnlyPaths.some(p => path.startsWith(p))) {
        const overviewUrl = request.nextUrl.clone()
        overviewUrl.pathname = '/dashboard/overview'
        return NextResponse.redirect(overviewUrl, { status: 302 })
      }
    }
  }

  // ── Redirect authenticated users away from auth pages ──────────────────────
  if (path === '/login' || path === '/signup') {
    const isGuest = request.cookies.get('guest_mode')?.value === 'true'
    if (user) {
      const dashUrl = request.nextUrl.clone()
      dashUrl.pathname = '/dashboard/overview'
      const redirectRes = NextResponse.redirect(dashUrl, { status: 302 })
      // Forward any updated auth cookies
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectRes.cookies.set(cookie.name, cookie.value)
      })
      return redirectRes
    }
    if (isGuest) {
      const demoUrl = request.nextUrl.clone()
      demoUrl.pathname = '/dashboard/demo'
      return NextResponse.redirect(demoUrl, { status: 302 })
    }
  }

  // IMPORTANT: Always return supabaseResponse to forward refreshed auth cookies.
  return supabaseResponse
}
