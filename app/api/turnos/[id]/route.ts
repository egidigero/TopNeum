import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

// GET - Obtener un turno específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const turno = await sql`
      SELECT * FROM turnos
      WHERE id = ${id}
    `

    if (turno.length === 0) {
      return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })
    }

    return NextResponse.json(turno[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Actualizar turno
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      nombre_cliente,
      telefono,
      email,
      estado,
      marca_vehiculo,
      modelo_vehiculo,
      patente,
      cantidad_neumaticos,
      observaciones,
    } = body

    const turno = await sql`
      UPDATE turnos
      SET
        nombre_cliente = COALESCE(${nombre_cliente}, nombre_cliente),
        telefono = COALESCE(${telefono}, telefono),
        email = COALESCE(${email}, email),
        estado = COALESCE(${estado}, estado),
        marca_vehiculo = COALESCE(${marca_vehiculo}, marca_vehiculo),
        modelo_vehiculo = COALESCE(${modelo_vehiculo}, modelo_vehiculo),
        patente = COALESCE(${patente}, patente),
        cantidad_neumaticos = COALESCE(${cantidad_neumaticos}, cantidad_neumaticos),
        observaciones = COALESCE(${observaciones}, observaciones),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `

    if (turno.length === 0) {
      return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })
    }

    return NextResponse.json(turno[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Cancelar turno
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const turno = await sql`
      UPDATE turnos
      SET estado = 'cancelado', updated_at = now()
      WHERE id = ${params.id}
      RETURNING *
    `

    if (turno.length === 0) {
      return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })
    }

    return NextResponse.json(turno[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
