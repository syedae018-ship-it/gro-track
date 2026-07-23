import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { PWAProvider } from "@/components/providers/PWAProvider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import { NextAuthProvider } from "@/components/providers/NextAuthProvider"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "GroTrack | Premium Agency Platform",
  description: "Workflow, attendance, and payment tracking for creative agencies.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GroTrack",
  },
}

export const viewport: Viewport = {
  themeColor: "#F8F9FB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* iOS Web App Meta Tags & Links */}
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
        
        {/* iOS Startup Splash Images */}
        {/* iPhone 14/15/16 Pro Max */}
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1290-2796.png" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPhone 14/15/16 Pro */}
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1179-2556.png" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPhone SE (3rd Gen) */}
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-750-1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
        {/* iPad Pro 12.9" */}
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-2048-2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" />
        {/* iPad Air 10.9" */}
        <link rel="apple-touch-startup-image" href="/splash/apple-splash-1640-2360.png" media="(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)" />
      </head>
      <body className={cn(
        inter.variable,
        "font-sans antialiased bg-background text-foreground"
      )}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <NextAuthProvider session={session}>
            <PWAProvider>
              {children}
            </PWAProvider>
          </NextAuthProvider>
          <Toaster theme="system" position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
