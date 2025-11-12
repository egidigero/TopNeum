import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function PATCH(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const body = await request.json()
    const { estado } = body

    const result = await sql`
      UPDATE pedidos
      SET estado = ${estado}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json({ pedido: result[0] })
  } catch (error: any) {
    console.error("[v0] Update pedido error:", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    // Primero obtenemos el lead_id del pedido
    const pedido = await sql`
      SELECT lead_id FROM lead_pedidos WHERE id = ${id}
    `

    if (pedido.length === 0) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
    }

    const leadId = pedido[0].lead_id

    // Eliminamos el pedido
    await sql`
      DELETE FROM lead_pedidos WHERE id = ${id}
    `

    // Actualizamos el estado del lead a 'cotizado' (estado válido según constraint)
    await sql`
      UPDATE leads
      SET estado = 'cotizado', updated_at = NOW()
      WHERE id = ${leadId}
    `

    return NextResponse.json({ success: true, message: "Pedido eliminado correctamente" })
  } catch (error: any) {
    console.error("[v0] Delete pedido error:", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}