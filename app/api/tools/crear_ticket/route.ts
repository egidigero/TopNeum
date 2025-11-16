import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * API Tool para n8n: Crear Ticket
 * 
 * Crea un ticket de soporte asociado a un lead existente.
 * Si el lead no existe, lo crea automáticamente.
 * 
 * POST /api/tools/crear_ticket
 * 
 * Body:
 * {
 *   "telefono_whatsapp": "+5491123456789",
 *   "tipo": "marca_especial" | "medida_no_disponible" | "consulta_tecnica" | "problema_pago" | "reclamo" | "otro",
 *   "descripcion": "Cliente necesita Michelin 205/55R16 XL que no está en stock",
 *   "prioridad": "baja" | "media" | "alta" | "urgente" (opcional, default: "media")
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "ticket_id": "uuid",
 *   "lead_id": "uuid",
 *   "telefono_whatsapp": "+5491123456789",
 *   "tipo": "marca_especial",
 *   "prioridad": "media",
 *   "estado": "abierto"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telefono_whatsapp, tipo, descripcion, prioridad = "media" } = body

    // Validación de campos requeridos
    if (!telefono_whatsapp) {
      return NextResponse.json({
        success: false,
        error: "telefono_whatsapp es requerido"
      }, { status: 400 })
    }

    if (!tipo) {
      return NextResponse.json({
        success: false,
        error: "tipo es requerido"
      }, { status: 400 })
    }

    if (!descripcion) {
      return NextResponse.json({
        success: false,
        error: "descripcion es requerida"
      }, { status: 400 })
    }

    // Validación de tipo
    const tiposValidos = [
      "marca_especial",
      "medida_no_disponible",
      "consulta_tecnica",
      "problema_pago",
      "reclamo",
      "confirmacion_pago",  // 🆕 Cliente envió comprobante
      "pago_cuotas",        // 🆕 Cliente elige cuotas
      "otro"
    ]

    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json({
        success: false,
        error: "tipo inválido",
        tipos_validos: tiposValidos
      }, { status: 400 })
    }

    // Validación de prioridad
    const prioridadesValidas = ["baja", "media", "alta", "urgente"]
    if (!prioridadesValidas.includes(prioridad)) {
      return NextResponse.json({
        success: false,
        error: "prioridad inválida",
        prioridades_validas: prioridadesValidas
      }, { status: 400 })
    }

    // Normalizar teléfono
    let telefonoNormalizado = telefono_whatsapp.replace(/[\s()-]/g, '')
    if (!telefonoNormalizado.startsWith('+')) {
      if (telefonoNormalizado.startsWith('54')) {
        telefonoNormalizado = '+' + telefonoNormalizado
      } else {
        telefonoNormalizado = '+54' + telefonoNormalizado
      }
    }

    // Buscar o crear lead
    let lead = await sql`
      SELECT id, nombre_cliente, region, estado
      FROM leads 
      WHERE telefono_whatsapp = ${telefonoNormalizado}
      LIMIT 1
    `

    let leadId: string

    if (lead.length === 0) {
      // Crear nuevo lead automáticamente
      const regionDetectada = telefonoNormalizado.includes('5491111') || telefonoNormalizado.includes('549115') 
        ? 'CABA' 
        : 'INTERIOR'
      
      const newLead = await sql`
        INSERT INTO leads (
          telefono_whatsapp,
          region,
          estado,
          origen,
          notas
        ) VALUES (
          ${telefonoNormalizado},
          ${regionDetectada},
          'en_conversacion',
          'whatsapp',
          ${`Ticket creado: ${tipo} - ${descripcion.substring(0, 100)}`}
        )
        RETURNING id
      `
      leadId = newLead[0].id
    } else {
      leadId = lead[0].id

      // Actualizar última interacción
      await sql`
        UPDATE leads 
        SET ultima_interaccion = NOW(),
            updated_at = NOW()
        WHERE id = ${leadId}
      `
    }

    // Crear ticket
    const nuevoTicket = await sql`
      INSERT INTO lead_tickets (
        lead_id,
        tipo,
        descripcion,
        prioridad,
        estado
      ) VALUES (
        ${leadId},
        ${tipo},
        ${descripcion},
        ${prioridad},
        'abierto'
      )
      RETURNING id, lead_id, tipo, descripcion, prioridad, estado, created_at
    `

    const ticket = nuevoTicket[0]

    return NextResponse.json({
      success: true,
      ticket_id: ticket.id,
      lead_id: ticket.lead_id,
      telefono_whatsapp: telefonoNormalizado,
      tipo: ticket.tipo,
      descripcion: ticket.descripcion,
      prioridad: ticket.prioridad,
      estado: ticket.estado,
      created_at: ticket.created_at
    })

  } catch (error) {
    console.error("[API Tools - Crear Ticket] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
