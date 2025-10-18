import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth()

    const body = await request.json()
    const { estado } = body

    const result = await sql`
      UPDATE pedidos
      SET estado = ${estado}, updated_at = NOW()
      WHERE id = ${params.id}
      RETURNING *
    `

    return NextResponse.json({ pedido: result[0] })
  } catch (error: any) {
    console.error("[v0] Update pedido error:", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}
