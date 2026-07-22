import { initializeApp, getApps, getApp } from "firebase/app"
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging"

const cleanEnv = (val?: string) => val ? val.replace(/^["']|["']$/g, '').trim() : ""

const firebaseConfig = {
  apiKey: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  measurementId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID),
}

// Check if variables are configured
const isFirebaseConfigured = 
  !!(firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId)

let messaging: Messaging | null = null

if (typeof window !== "undefined" && isFirebaseConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
    messaging = getMessaging(app)
  } catch (error) {
    console.warn("Failed to initialize Firebase Client SDK:", error)
  }
}

export async function requestFCMToken(): Promise<string | null> {
  if (typeof window === "undefined" || !messaging) {
    console.warn("FCM messaging is not initialized or running server-side.")
    return null
  }

  let originalFetch: typeof window.fetch | null = null;

  try {
    // 1. Request notification permission
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      console.log("Notification permission denied or dismissed:", permission)
      return null
    }

    // 2. Register Service Worker and retrieve token
    console.log("=== FIREBASE CONFIG RUNTIME TRACE ===");
    console.log("apiKey:", firebaseConfig.apiKey);
    console.log("projectId:", firebaseConfig.projectId);
    console.log("appId:", firebaseConfig.appId);
    console.log("messagingSenderId:", firebaseConfig.messagingSenderId);
    console.log("measurementId:", firebaseConfig.measurementId);
    
    // Wait for the active service worker registration (which is /sw.js registered by PWAProvider)
    const registration = await navigator.serviceWorker.ready;
    console.log("[FCM] Found active Service Worker Registration with scope:", registration.scope);

    const token = await getToken(messaging, {
      vapidKey: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY),
      serviceWorkerRegistration: registration
    })

    if (token) {
      return token
    } else {
      console.warn("No registration token available. Request permission to generate one.")
      return null
    }
  } catch (error) {
    console.error("An error occurred while retrieving FCM token:", error)
    return null
  } finally {
    // Restore original fetch
    if (originalFetch) {
      window.fetch = originalFetch;
    }
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  if (typeof window === "undefined" || !messaging) return () => {}

  // Triggered when a message is received in the foreground
  return onMessage(messaging, (payload) => {
    callback(payload)
  })
}
