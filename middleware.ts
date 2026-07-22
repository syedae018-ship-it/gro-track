import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Basic API Protection
    if (req.nextUrl.pathname.startsWith("/api/")) {
      if (!req.nextauth.token) {
        return new NextResponse(
          JSON.stringify({ error: "Unauthorized", message: "Missing or invalid token" }),
          { status: 401, headers: { 'content-type': 'application/json' } }
        );
      }
    }
    
    // Additional RBAC (Role Based Access Control) could go here if we attach 'role' to token
    // Example:
    // if (req.nextUrl.pathname.startsWith("/dashboard/settings") && req.nextauth.token?.role === "employee") {
    //   return new NextResponse("Forbidden", { status: 403 });
    // }

    return NextResponse.next();
  },
  {
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
      authorized: ({ req, token }) => {
        // Only require authentication for protected routes
        const isProtected = req.nextUrl.pathname.startsWith('/dashboard') || 
                            req.nextUrl.pathname.startsWith('/api/') && !req.nextUrl.pathname.startsWith('/api/auth');
        
        if (isProtected) {
          return !!token;
        }
        return true;
      }
    },
    pages: {
      signIn: '/login',
    }
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
