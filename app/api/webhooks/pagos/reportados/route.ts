import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { sendWebhook } from "@/lib/webhooks"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lead_id, pedido_id, metodo, monto_reportado, comprobante_url, notas } = body

    if (!monto_reportado || (!lead_id && !pedido_id)) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO pagos (
        lead_id, pedido_id, metodo, monto_reportado, comprobante_url, notas, estado
      ) VALUES (
        ${lead_id}, ${pedido_id}, ${metodo || "transferencia"}, 
        ${monto_reportado}, ${comprobante_url}, ${notas}, 'reportado'
      )
      RETURNING *
    `

    const pago = result[0]

    // Update lead estado if applicable
    if (lead_id) {
      await sql`
        UPDATE leads_whatsapp
        SET estado = 'pagado_pendiente_verificacion', updated_at = NOW()
        WHERE id = ${lead_id} AND estado = 'esperando_pago'
      `
    }

    // Send webhook notification
    await sendWebhook("PAGO_REPORTADO", pago)

    return NextResponse.json({ pago })
  } catch (error) {
    console.error("[v0] Webhook pago error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
