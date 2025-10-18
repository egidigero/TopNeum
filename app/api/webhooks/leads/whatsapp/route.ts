import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, telefono, mensaje_inicial, origen, canal } = body

    if (!nombre || !telefono) {
      return NextResponse.json({ error: "Nombre y teléfono requeridos" }, { status: 400 })
    }

    // Check if lead already exists by phone
    const existing = await sql`
      SELECT id FROM leads_whatsapp WHERE telefono = ${telefono} LIMIT 1
    `

    if (existing.length > 0) {
      // Update existing lead
      const result = await sql`
        UPDATE leads_whatsapp
        SET 
          mensaje_inicial = COALESCE(mensaje_inicial, '') || E'\n\n' || ${mensaje_inicial || ""},
          ultimo_contacto_at = NOW(),
          updated_at = NOW()
        WHERE telefono = ${telefono}
        RETURNING *
      `

      return NextResponse.json({ lead: result[0], updated: true })
    }

    // Create new lead
    const result = await sql`
      INSERT INTO leads_whatsapp (
        nombre, telefono, canal, mensaje_inicial, origen, estado
      ) VALUES (
        ${nombre}, ${telefono}, ${canal || "whatsapp"}, 
        ${mensaje_inicial}, ${origen}, 'nuevo'
      )
      RETURNING *
    `

    return NextResponse.json({ lead: result[0], created: true })
  } catch (error) {
    console.error("[v0] Webhook lead error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
