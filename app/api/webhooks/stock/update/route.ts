import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { producto_id, codigo, stock } = body

    if (stock === undefined || (!producto_id && !codigo)) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    let result

    if (producto_id) {
      result = await sql`
        UPDATE productos
        SET stock = ${stock}, updated_at = NOW()
        WHERE id = ${producto_id}
        RETURNING *
      `
    } else {
      result = await sql`
        UPDATE productos
        SET stock = ${stock}, updated_at = NOW()
        WHERE codigo = ${codigo}
        RETURNING *
      `
    }

    if (result.length === 0) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ producto: result[0] })
  } catch (error) {
    console.error("[v0] Webhook stock error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
