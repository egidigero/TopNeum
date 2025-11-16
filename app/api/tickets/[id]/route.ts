import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getSession()

    const ticket = await sql`
      SELECT 
        t.*,
        l.nombre_cliente,
        l.telefono_whatsapp,
        l.region
      FROM lead_tickets t
      JOIN leads l ON l.id = t.lead_id
      WHERE t.id = ${params.id}
    `

    if (ticket.length === 0) {
      return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ ticket: ticket[0] })
  } catch (error: any) {
    console.error("Error fetching ticket:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getSession()

    const body = await request.json()
    const { estado } = body

    if (!estado) {
      return NextResponse.json(
        { error: "Estado requerido" },
        { status: 400 }
      )
    }

    // Si se marca como resuelto o cerrado, actualizar fecha_resolucion
    const updates: any = { estado }
    if (estado === "resuelto" || estado === "cerrado") {
      updates.fecha_resolucion = new Date().toISOString()
    }

    await sql`
      UPDATE lead_tickets
      SET 
        estado = ${estado},
        fecha_resolucion = ${updates.fecha_resolucion || null},
        updated_at = NOW()
      WHERE id = ${params.id}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error al actualizar ticket:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getSession()

    await sql`
      DELETE FROM lead_tickets
      WHERE id = ${params.id}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error al eliminar ticket:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
