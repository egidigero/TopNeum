import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    await requireRole(["admin", "finanzas"])

    const body = await request.json()
    const { fecha, categoria, descripcion, monto, medio_pago, comprobante_url, creado_por } = body

    if (!fecha || !categoria || !descripcion || monto === undefined) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO gastos (
        fecha, categoria, descripcion, monto, medio_pago, comprobante_url, creado_por
      ) VALUES (
        ${fecha}, ${categoria}, ${descripcion}, ${monto}, ${medio_pago}, ${comprobante_url}, ${creado_por}
      )
      RETURNING *
    `

    return NextResponse.json({ gasto: result[0] })
  } catch (error: any) {
    console.error("[v0] Create gasto error:", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}
