import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const { nombre, telefono, canal, mensaje_inicial, origen } = body

    if (!nombre || !telefono) {
      return NextResponse.json({ error: "Nombre y teléfono requeridos" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO leads (
        nombre_cliente, telefono_whatsapp, origen, estado, region
      ) VALUES (
        ${nombre}, ${telefono}, ${origen || 'whatsapp'}, 'nuevo', 'INTERIOR'
      )
      RETURNING *
    `

    return NextResponse.json({ lead: result[0] })
  } catch (error: any) {
    console.error("[v0] Create lead error:", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}
