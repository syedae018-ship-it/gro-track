"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useSession } from "next-auth/react"
import { registerFCMToken } from "@/app/(dashboard)/dashboard/notifications/actions"

interface PWAContextType {
  isInstallable: boolean
  isInstalled: boolean
  isIOS: boolean
  isOnline: boolean
  installApp: () => Promise<void>
  showIOSPrompt: boolean
  setShowIOSPrompt: (show: boolean) => void
  requestNotificationPermission: () => Promise<boolean>
}

const PWAContext = createContext<PWAContextType | undefined>(undefined)

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)
  const { data: session } = useSession()
  const user = session?.user as any
  const processedNotifIds = useRef<Set<string>>(new Set())

  // 1. Check network connection and setup listeners
  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      toast.success("Connection restored! Syncing latest data...", {
        duration: 4000,
        id: "network-status",
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast.error("You are currently offline. Running in cached offline mode.", {
        duration: Infinity,
        id: "network-status",
      })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // 2. Service Worker registration & PWA Installation detection
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    // Register service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        console.log("[SW] Registered successfully:", reg.scope)
        try {
          const regs = await navigator.serviceWorker.getRegistrations()
          for (const r of regs) {
            if (r.active?.scriptURL.includes("firebase-messaging-sw.js")) {
              console.log("[SW] Uninstalling stale service worker:", r.active.scriptURL)
              await r.unregister()
            }
          }
        } catch (e) {
          console.warn("Failed to check for stale service workers:", e)
        }
      })
      .catch((err) => {
        console.error("[SW] Registration failed:", err)
      })

    // Detect if already installed (standalone mode)
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
      setIsInstalled(isStandalone)
    }
    checkStandalone()

    // Detect if running on iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase()
      const isApple = /iphone|ipad|ipod/.test(userAgent)
      setIsIOS(isApple)
    }
    checkIOS()

    // Listen for install prompt trigger
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      toast.success("GroTrack successfully installed on your Home Screen! 🎉")
    }

    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  // 4. Firebase Foreground Message listener & Auto Token registration & BroadcastChannel setup
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const channel = new BroadcastChannel('grotrack_notifications');
        channel.onmessage = (event) => {
          console.log("[PWA BroadcastChannel] Message received:", event.data);
          if (event.data.type === 'BACKGROUND_RECEIVED') {
            const logs = JSON.parse(localStorage.getItem('background_notif_logs') || '[]');
            logs.unshift({
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              payload: event.data.payload
            });
            localStorage.setItem('background_notif_logs', JSON.stringify(logs.slice(0, 40)));
            window.dispatchEvent(new Event('background_logs_updated'));
          } else if (event.data.type === 'NOTIFICATION_CLICKED') {
            localStorage.setItem('last_notification_clicked', new Date().toISOString());
            window.dispatchEvent(new Event('last_clicked_updated'));
          }
        };
      } catch(e) {
        console.warn("BroadcastChannel not supported:", e);
      }
    }

    if (!user) return
    let unsubscribeForeground = () => {}
    let fallbackRealtimeChannel: any = null
    const supabase = createClient()

    // Dynamically import FCM helper to avoid loading it server-side
    import("@/lib/firebase/config").then(({ onForegroundMessage, requestFCMToken }) => {
      
      // A. Setup FCM Foreground messaging listener
      unsubscribeForeground = onForegroundMessage((payload) => {
        console.log("[PWA Foreground] Message payload received:", payload)
        
        const notifId = payload.data?.id
        if (notifId) {
          if (processedNotifIds.current.has(notifId)) {
            console.log("[PWA Foreground] Duplicate notification filtered:", notifId)
            return
          }
          processedNotifIds.current.add(notifId)
        }

        // Trigger native Chrome notification in the foreground
        if ("Notification" in window && Notification.permission === "granted") {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(
              payload.data?.title || payload.notification?.title || "GroTrack Alert",
              {
                body: payload.data?.body || payload.notification?.body || "",
                icon: "/icons/icon-192x192.png",
                badge: "/icons/icon-72x72.png",
                vibrate: [100, 50, 100],
                tag: notifId || "grotrack-alert",
                requireInteraction: true,
                data: {
                  url: payload.data?.link || "/dashboard/notifications"
                }
              } as any
            )
          }).catch(err => {
            console.warn("Failed to trigger native foreground notification:", err)
          })
        }

        toast.info(payload.data?.title || payload.notification?.title || "GroTrack Alert", {
          description: payload.data?.body || payload.notification?.body || "",
          duration: 6000,
          action: payload.data?.link ? {
            label: "View",
            onClick: () => {
              window.location.href = payload.data.link
            }
          } : undefined
        })
      })

      // B. Setup Token auto-syncing if browser permission was already allowed
      if ("Notification" in window && Notification.permission === "granted") {
        requestFCMToken().then((token) => {
          if (token) {
            let deviceType = "desktop"
            if (/Mobi|Android/i.test(navigator.userAgent)) deviceType = "mobile"
            else if (/Tablet|iPad/i.test(navigator.userAgent)) deviceType = "tablet"
            
            registerFCMToken(token, deviceType).then(res => {
              if (res.success) {
                console.log("[PWA Token Sync] Device token synced successfully.")
              } else {
                console.warn("[PWA Token Sync] Failed to register FCM token in DB:", res.error)
              }
            })
          } else {
            console.warn("[PWA Token Sync] FCM token skipped: Generation failed (check Firebase config/API Key) or environment variables are not set.")
          }
        })
      }
    }).catch(err => {
      console.warn("[PWA FCM Init] FCM scripts failed to load.", err)
    })

    // ALWAYS setup Supabase Realtime fallback channel to guarantee foreground toast notifications
    setupFallbackRealtime()

    function setupFallbackRealtime() {
      console.log("[PWA Fallback] Initializing Supabase Realtime fallback channel.")
      fallbackRealtimeChannel = supabase
        .channel(`fallback-pwa-notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("[PWA Fallback] New notification received:", payload.new)
            
            const notifId = payload.new.id
            if (notifId) {
              if (processedNotifIds.current.has(notifId)) {
                console.log("[PWA Fallback] Duplicate notification filtered:", notifId)
                return
              }
              processedNotifIds.current.add(notifId)
            }

            // Display in-app toast
            toast(payload.new.title, {
              description: payload.new.message,
              duration: 5000,
              action: payload.new.link ? {
                label: "View",
                onClick: () => {
                  window.location.href = payload.new.link
                }
              } : undefined
            })
          }
        )
        .subscribe((status) => {
          console.log(`[PWA Fallback] Supabase Realtime channel status: ${status}`)
        })
    }

    return () => {
      unsubscribeForeground()
      if (fallbackRealtimeChannel) {
        supabase.removeChannel(fallbackRealtimeChannel)
      }
    }
  }, [user])

  // 5. Expose trigger function for installation
  const installApp = async () => {
    if (isIOS && !isInstalled) {
      setShowIOSPrompt(true)
      return
    }

    if (!deferredPrompt) {
      console.warn("[PWA] Installation prompt not available yet")
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`[PWA] User response to install prompt: ${outcome}`)
    
    if (outcome === "accepted") {
      setIsInstallable(false)
      setDeferredPrompt(null)
    }
  }

  // 6. Request Notification permission
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return false
    
    const permission = await Notification.requestPermission()
    if (permission === "granted") {
      toast.success("Notification permissions enabled successfully! 🔔")
      return true
    }
    return false
  }

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isIOS,
        isOnline,
        installApp,
        showIOSPrompt,
        setShowIOSPrompt,
        requestNotificationPermission,
      }}
    >
      {children}
    </PWAContext.Provider>
  )
}

export function usePWA() {
  const context = useContext(PWAContext)
  if (!context) {
    throw new Error("usePWA must be used within a PWAProvider")
  }
  return context
}
