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
        productos,
        producto_descripcion,
        cantidad_total,
        forma_pago,
        forma_pago_detalle,
        subtotal,
        descuento_porcentaje,
        total,
        precio_final,
        estado_pago,
        comprobante_url,
        fecha_pago,
        created_at
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
