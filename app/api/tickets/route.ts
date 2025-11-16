import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    await getSession()

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')
    const prioridad = searchParams.get('prioridad')

    let tickets
    
    if (estado && prioridad) {
      tickets = await sql`
        SELECT 
          t.id, t.lead_id, t.tipo, t.descripcion, t.prioridad, t.estado,
          t.asignado_a, t.created_at, t.updated_at, t.fecha_resolucion,
          l.nombre_cliente, l.telefono_whatsapp
        FROM lead_tickets t
        JOIN leads l ON l.id = t.lead_id
        WHERE t.estado = ${estado} AND t.prioridad = ${prioridad}
        ORDER BY t.created_at DESC
      `
    } else if (estado) {
      tickets = await sql`
        SELECT 
          t.id, t.lead_id, t.tipo, t.descripcion, t.prioridad, t.estado,
          t.asignado_a, t.created_at, t.updated_at, t.fecha_resolucion,
          l.nombre_cliente, l.telefono_whatsapp
        FROM lead_tickets t
        JOIN leads l ON l.id = t.lead_id
        WHERE t.estado = ${estado}
        ORDER BY t.created_at DESC
      `
    } else if (prioridad) {
      tickets = await sql`
        SELECT 
          t.id, t.lead_id, t.tipo, t.descripcion, t.prioridad, t.estado,
          t.asignado_a, t.created_at, t.updated_at, t.fecha_resolucion,
          l.nombre_cliente, l.telefono_whatsapp
        FROM lead_tickets t
        JOIN leads l ON l.id = t.lead_id
        WHERE t.prioridad = ${prioridad}
        ORDER BY t.created_at DESC
      `
    } else {
      tickets = await sql`
        SELECT 
          t.id, t.lead_id, t.tipo, t.descripcion, t.prioridad, t.estado,
          t.asignado_a, t.created_at, t.updated_at, t.fecha_resolucion,
          l.nombre_cliente, l.telefono_whatsapp
        FROM lead_tickets t
        JOIN leads l ON l.id = t.lead_id
        ORDER BY t.created_at DESC
      `
    }

    return NextResponse.json({ tickets })
  } catch (error: any) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await getSession()

    const body = await request.json()
    const { lead_id, tipo, descripcion, prioridad = 'media', asignado_a = null } = body

    if (!lead_id || !tipo || !descripcion) {
      return NextResponse.json({ error: 'lead_id, tipo y descripcion son requeridos' }, { status: 400 })
    }

    const insert = await sql`
      INSERT INTO lead_tickets (lead_id, tipo, descripcion, prioridad, asignado_a, estado, created_at, updated_at)
      VALUES (${lead_id}, ${tipo}, ${descripcion}, ${prioridad}, ${asignado_a}, 'abierto', NOW(), NOW())
      RETURNING id, lead_id, tipo, descripcion, prioridad, asignado_a, estado, created_at
    `

    const ticket = insert[0]

    return NextResponse.json({ success: true, ticket })
  } catch (error: any) {
    console.error('Error creating ticket:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
