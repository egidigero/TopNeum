import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

function redondearA(valor: number, multiplo: number): number {
  return Math.round(valor / multiplo) * multiplo
}

export async function POST(request: NextRequest) {
  try {
    const tarifa = await request.json()

    // Get 3 sample products
    const productos = await sql`
      SELECT id, codigo, marca, costo
      FROM productos
      WHERE activo = true
      ORDER BY RANDOM()
      LIMIT 3
    `

    const products = productos.map((p) => {
      const jitter = tarifa.jitter_min + Math.random() * (tarifa.jitter_max - tarifa.jitter_min)
      const precio_lista = redondearA(p.costo * jitter, 1000)
      const precio_online = redondearA(precio_lista * (1 + tarifa.margen_online), 100)
      const precio_3c = redondearA(precio_online * (1 + tarifa.recargo_3), 100)
      const precio_6c = redondearA(precio_online * (1 + tarifa.recargo_6), 100)
      const precio_12c = redondearA(precio_online * (1 + tarifa.recargo_12), 100)
      const efectivo_caba = redondearA((precio_online / (1 + tarifa.iva)) * (1 - tarifa.desc_cash_caba), 100)
      const efectivo_interior = redondearA((precio_online / (1 + tarifa.iva)) * (1 - tarifa.desc_cash_interior), 100)
      const mayorista_cf = redondearA(p.costo * (1 + tarifa.margen_mayorista_cf), 100)
      const mayorista_sf = redondearA(p.costo * (1 + tarifa.margen_mayorista_sf), 100)

      return {
        codigo: p.codigo,
        marca: p.marca,
        costo: p.costo,
        precio_lista,
        precio_online,
        precio_3c,
        precio_6c,
        precio_12c,
        efectivo_caba,
        efectivo_interior,
        mayorista_cf,
        mayorista_sf,
      }
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error("[v0] Preview error:", error)
    return NextResponse.json({ error: "Error generando preview" }, { status: 500 })
  }
}
