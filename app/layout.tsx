import type { Metadata } from "next"
import { Syne, DM_Sans } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"

const syne = Syne({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-syne",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-dm-sans",
})

export const metadata: Metadata = {
  title: "AgencyOS | Creative Agency Platform",
  description: "Workflow and payment management system for creative agencies.",
}

import { Toaster } from "sonner"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={cn(
        syne.variable,
        dmSans.variable,
        "font-sans antialiased bg-background text-foreground"
      )}>
        {children}
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  )
}
