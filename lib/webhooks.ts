// N8n Webhook utilities

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || ""

export async function sendWebhook(event: string, data: any) {
  if (!N8N_WEBHOOK_URL) {
    console.log("[v0] N8N_WEBHOOK_URL not configured, skipping webhook:", event)
    return
  }

  try {
    await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch (error) {
    console.error("[v0] Webhook error:", error)
  }
}
