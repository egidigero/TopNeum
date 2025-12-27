import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    
    // Await params (Next.js 15 requirement)
    const { id } = await params

    // Query lead_pedidos (tabla correcta, no "pagos")
    const pagos = await sql`
      SELECT 
        id,
        lead_id,
        producto_descripcion,
        cantidad_total,
        forma_pago,
        forma_pago_detalle,
        total,
        precio_final,
        estado_pago,
        comprobante_url,
        fecha_pago,
        created_at as fecha_pedido
      FROM lead_pedidos
      WHERE lead_id = ${id}
      ORDER BY created_at DESC
    `

    return NextResponse.json({ pagos })
  } catch (error: any) {
    console.error("[v0] Fetch pagos error:", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    
    const { id } = await params
    const body = await request.json()
    const { pedido_id, estado_pago, fecha_pago } = body

    console.log('[PATCH /api/leads/[id]/pagos] Lead ID:', id)
    console.log('[PATCH /api/leads/[id]/pagos] Body:', body)

    if (!pedido_id) {
      return NextResponse.json({ error: "pedido_id es requerido" }, { status: 400 })
    }

    // Actualizar estado del pedido
    const result = await sql`
      UPDATE lead_pedidos
      SET 
        estado_pago = ${estado_pago},
        fecha_pago = ${fecha_pago || new Date()}
      WHERE id = ${pedido_id}
      AND lead_id = ${id}
      RETURNING *
    `

    console.log('[PATCH /api/leads/[id]/pagos] Resultado:', result.length > 0 ? 'OK' : 'NO ENCONTRADO')

    if (result.length === 0) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
    }

    // Si se confirma el pago, actualizar estado del lead a "pedido_confirmado"
    if (estado_pago === 'pagado') {
      console.log('[PATCH /api/leads/[id]/pagos] Actualizando lead a pedido_confirmado')
      await sql`
        UPDATE leads
        SET estado = 'pedido_confirmado', updated_at = NOW()
        WHERE id = ${id}
      `
    }

    return NextResponse.json({ pedido: result[0] })
  } catch (error: any) {
    console.error("[v0] Update pago error:", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}
