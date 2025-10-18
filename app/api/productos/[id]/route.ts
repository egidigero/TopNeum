import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["admin"])

    const body = await request.json()
    const { marca, diseno, modelo, medida, codigo, costo, stock, precio_lista_base, activo } = body

    // Update producto
    const result = await sql`
      UPDATE productos
      SET 
        marca = ${marca},
        diseno = ${diseno},
        modelo = ${modelo},
        medida = ${medida},
        codigo = ${codigo},
        costo = ${costo},
        stock = ${stock},
        precio_lista_base = ${precio_lista_base},
        activo = ${activo},
        updated_at = NOW()
      WHERE id = ${params.id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ producto: result[0] })
  } catch (error: any) {
    console.error("[v0] Update producto error:", error)

    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
