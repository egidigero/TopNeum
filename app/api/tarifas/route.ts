import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    await requireRole(["admin"])

    const body = await request.json()

    const result = await sql`
      INSERT INTO tarifas (
        nombre, vigente, jitter_min, jitter_max, redondeo_lista_a,
        iva, redondeo_venta_a, margen_online, recargo_3, recargo_6, recargo_12,
        desc_cash_caba, desc_cash_interior, margen_mayorista_cf, margen_mayorista_sf,
        vigente_desde
      ) VALUES (
        ${body.nombre}, ${body.vigente || false}, ${body.jitter_min}, ${body.jitter_max},
        ${body.redondeo_lista_a}, ${body.iva}, ${body.redondeo_venta_a}, ${body.margen_online},
        ${body.recargo_3}, ${body.recargo_6}, ${body.recargo_12}, ${body.desc_cash_caba},
        ${body.desc_cash_interior}, ${body.margen_mayorista_cf}, ${body.margen_mayorista_sf},
        ${body.vigente_desde}
      )
      RETURNING *
    `

    return NextResponse.json({ tarifa: result[0] })
  } catch (error: any) {
    console.error("[v0] Create tarifa error:", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}
