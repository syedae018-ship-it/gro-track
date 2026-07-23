import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/signup');

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL('/dashboard/overview', req.url));
      }
      return null;
    }

    if (!isAuth) {
      let from = req.nextUrl.pathname;
      if (req.nextUrl.search) {
        from += req.nextUrl.search;
      }
      return NextResponse.redirect(
        new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
      );
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      // Always return true so the middleware function itself handles routing
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
