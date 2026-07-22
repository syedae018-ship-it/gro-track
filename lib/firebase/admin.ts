import * as admin from "firebase-admin"

let messaging: admin.messaging.Messaging | null = null

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON

if (serviceAccountJson) {
  try {
    const serviceAccount = JSON.parse(serviceAccountJson)
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
    }
    messaging = admin.messaging()
    console.log("[FCM Admin] Firebase Admin Messaging successfully initialized.")
  } catch (error) {
    console.warn("[FCM Admin] Failed to initialize Firebase Admin SDK:", error)
  }
} else {
  console.warn(
    "[FCM Admin] FIREBASE_SERVICE_ACCOUNT_JSON is missing. FCM background push notifications will run in mock/bypass mode."
  )
}

interface PushPayload {
  id?: string
  title: string
  body: string
  link?: string
  category?: string
}

export async function sendPushNotification(
  tokens: string[],
  payload: PushPayload
) {
  if (tokens.length === 0) {
    return {
      success: false,
      mode: messaging ? "admin" : "mock",
      payload: null,
      response: { error: "No target tokens provided" }
    }
  }

  // Format data payload for deep-linking and background processing
  const dataPayload: Record<string, string> = {
    id: payload.id || "",
    title: payload.title,
    body: payload.body,
    link: payload.link || "/dashboard/notifications",
    category: payload.category || "system",
  }

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: dataPayload,
    tokens: tokens,
  }

  if (!messaging) {
    console.log(
      `[FCM Mock Push] Target: ${tokens.length} devices | Title: "${payload.title}" | Body: "${payload.body}" | Link: "${dataPayload.link}"`
    )
    console.log("[FCM Mock Push] Firebase send success (Mock/Bypass mode active)")
    return {
      success: true,
      mode: "mock" as const,
      payload: message,
      response: {
        info: "FCM mock/bypass mode active (FIREBASE_SERVICE_ACCOUNT_JSON is missing).",
        timestamp: new Date().toISOString(),
        delivered_mock: true,
        tokens_targeted: tokens.length
      }
    }
  }

  try {
    const response = await messaging.sendEachForMulticast(message)
    console.log(
      `[FCM Admin] Firebase send success/status. Success count: ${response.successCount} | Failure count: ${response.failureCount}`
    )


    // Identify failed/invalid tokens to clean up
    if (response.failureCount > 0) {
      const tokensToRemove: string[] = []
      
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const errorCode = resp.error.code
          console.warn(`[FCM Admin] Token delivery failed (index ${idx}): ${errorCode}`)
          
          if (
            errorCode === "messaging/registration-token-not-registered" ||
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/invalid-argument"
          ) {
            tokensToRemove.push(tokens[idx])
          }
        }
      })

      if (tokensToRemove.length > 0) {
        console.log(`[FCM Admin] Pruning ${tokensToRemove.length} invalid device tokens from DB`)
        const { createClient } = await import("@/lib/supabase/server")
        const supabase = await createClient()
        
        const { error } = await supabase
          .from("fcm_tokens")
          .delete()
          .in("token", tokensToRemove)
          
        if (error) {
          console.error("[FCM Admin] Failed to delete invalid tokens:", error.message)
        }
      }
    }

    return {
      success: response.successCount > 0,
      mode: "admin" as const,
      payload: message,
      response: {
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses.map(r => ({
          success: r.success,
          messageId: r.messageId || null,
          error: r.error ? { code: r.error.code, message: r.error.message } : null
        }))
      }
    }
  } catch (error: any) {
    console.error("[FCM Admin] Firebase send failure. Error during multicast push delivery:", error.message || error)
    return {
      success: false,
      mode: "admin" as const,
      payload: message,
      response: {
        error: error.message || String(error),
        timestamp: new Date().toISOString()
      }
    }
  }
}

