import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["admin"])
    const { id } = await params

    const body = await request.json()

    const result = await sql`
      UPDATE tarifas
      SET 
        nombre = ${body.nombre},
        jitter_min = ${body.jitter_min},
        jitter_max = ${body.jitter_max},
        redondeo_lista_a = ${body.redondeo_lista_a},
        iva = ${body.iva},
        redondeo_venta_a = ${body.redondeo_venta_a},
        margen_online = ${body.margen_online},
        recargo_3 = ${body.recargo_3},
        recargo_6 = ${body.recargo_6},
        recargo_12 = ${body.recargo_12},
        desc_cash_caba = ${body.desc_cash_caba},
        desc_cash_interior = ${body.desc_cash_interior},
        margen_mayorista_cf = ${body.margen_mayorista_cf},
        margen_mayorista_sf = ${body.margen_mayorista_sf},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json({ tarifa: result[0] })
  } catch (error: any) {
    console.error("[v0] Update tarifa error:", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}
