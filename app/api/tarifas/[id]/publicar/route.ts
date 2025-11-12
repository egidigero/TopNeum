import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["admin"])
    const { id } = await params

    // First, mark all other tarifas as not vigente
    await sql`
      UPDATE tarifas
      SET vigente = false, vigente_hasta = CURRENT_DATE
      WHERE vigente = true
    `

    // Then mark this one as vigente
    const result = await sql`
      UPDATE tarifas
      SET vigente = true, vigente_desde = CURRENT_DATE, vigente_hasta = NULL
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json({ tarifa: result[0] })
  } catch (error: any) {
    console.error("[v0] Publicar tarifa error:", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}
