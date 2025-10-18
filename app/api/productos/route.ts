import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    await requireRole(["admin"])

    const body = await request.json()
    const { marca, diseno, modelo, medida, codigo, costo, stock, precio_lista_base, activo } = body

    // Validate required fields
    if (!marca || !diseno || !modelo || !medida || !codigo || costo === undefined) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 })
    }

    // Check if codigo already exists
    const existing = await sql`
      SELECT id FROM productos WHERE codigo = ${codigo} LIMIT 1
    `

    if (existing.length > 0) {
      return NextResponse.json({ error: "El código ya existe" }, { status: 400 })
    }

    // Insert producto
    const result = await sql`
      INSERT INTO productos (
        marca, diseno, modelo, medida, codigo, costo, stock, precio_lista_base, activo
      ) VALUES (
        ${marca}, ${diseno}, ${modelo}, ${medida}, ${codigo}, 
        ${costo}, ${stock || 0}, ${precio_lista_base}, ${activo ?? true}
      )
      RETURNING *
    `

    return NextResponse.json({ producto: result[0] })
  } catch (error: any) {
    console.error("[v0] Create producto error:", error)

    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
