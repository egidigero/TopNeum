import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const { cliente_nombre, cliente_telefono, direccion, tipo_entrega, items, items_total, notas } = body

    if (!cliente_nombre || !cliente_telefono || !items || items.length === 0) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    // Create pedido
    const pedidoResult = await sql`
      INSERT INTO pedidos (
        cliente_nombre, cliente_telefono, direccion, tipo_entrega, items_total, notas, estado
      ) VALUES (
        ${cliente_nombre}, ${cliente_telefono}, ${direccion}, ${tipo_entrega}, 
        ${items_total}, ${notas}, 'pendiente_preparacion'
      )
      RETURNING *
    `

    const pedido = pedidoResult[0]

    // Insert items
    for (const item of items) {
      await sql`
        INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
        VALUES (${pedido.id}, ${item.producto_id}, ${item.cantidad}, ${item.precio_unitario})
      `

      // Update stock
      await sql`
        UPDATE productos
        SET stock = stock - ${item.cantidad}
        WHERE id = ${item.producto_id}
      `
    }

    return NextResponse.json({ pedido })
  } catch (error: any) {
    console.error("[v0] Create pedido error:", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}
