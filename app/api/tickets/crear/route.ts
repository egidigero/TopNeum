import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * POST /api/tickets/crear
 * 
 * Tool para el agente n8n: Crea tickets para casos especiales
 * (Michelin/BF Goodrich, medidas no disponibles, consultas técnicas)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[crear_ticket] Body recibido:", JSON.stringify(body))
    
    const {
      telefono_whatsapp,
      tipo,
      descripcion,
      prioridad = 'media'
    } = body

    // Validar campos requeridos
    if (!telefono_whatsapp || !tipo || !descripcion) {
      return NextResponse.json(
        { error: "telefono_whatsapp, tipo y descripcion son requeridos" },
        { status: 400 }
      )
    }

    // Validar tipo
    const tiposValidos = [
      'marca_especial',
      'medida_no_disponible',
      'consulta_tecnica',
      'problema_pago',
      'reclamo',
      'otro'
    ]

    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json(
        { error: `Tipo inválido. Usar: ${tiposValidos.join(', ')}` },
        { status: 400 }
      )
    }

    // Normalizar teléfono
    const telefono = String(telefono_whatsapp).trim()

    console.log("[crear_ticket] Buscando lead:", telefono)

    // Buscar o crear lead
    let lead = await sql`
      SELECT id, nombre_cliente, region FROM leads 
      WHERE telefono_whatsapp = ${telefono}
      LIMIT 1
    `

    let leadId: string

    if (lead.length === 0) {
      // Crear lead si no existe
      console.log("[crear_ticket] Creando nuevo lead")
      const nuevoLead = await sql`
        INSERT INTO leads (
          telefono_whatsapp,
          estado,
          region,
          origen,
          created_at,
          updated_at
        )
        VALUES (
          ${telefono},
          'nuevo',
          ${telefono.startsWith('+54911') ? 'CABA' : 'INTERIOR'},
          'n8n_agent',
          NOW(),
          NOW()
        )
        RETURNING id, nombre_cliente, region
      `
      lead = nuevoLead
    }

    leadId = lead[0].id

    console.log("[crear_ticket] Lead ID:", leadId)

    // Crear ticket
    const ticket = await sql`
      INSERT INTO lead_tickets (
        lead_id,
        tipo,
        descripcion,
        prioridad,
        estado,
        created_at,
        updated_at
      )
      VALUES (
        ${leadId},
        ${tipo},
        ${descripcion},
        ${prioridad},
        'abierto',
        NOW(),
        NOW()
      )
      RETURNING 
        id,
        lead_id,
        tipo,
        descripcion,
        prioridad,
        estado,
        created_at
    `

    const ticketId = ticket[0].id
    const ticketIdFormatted = `TKT-${String(ticketId).padStart(6, '0')}`

    console.log("[crear_ticket] Ticket creado:", ticketIdFormatted)

    // Determinar tiempo de respuesta según tipo y prioridad
    let tiempoRespuesta = '24-48 horas'
    
    if (prioridad === 'alta' || tipo === 'marca_especial') {
      tiempoRespuesta = '2-4 horas'
    } else if (prioridad === 'urgente') {
      tiempoRespuesta = '< 1 hora'
    }

    // Mensaje personalizado según tipo
    let mensajeCliente = ''

    switch(tipo) {
      case 'marca_especial':
        mensajeCliente = 'Tu consulta sobre marca premium fue registrada. El equipo te contactará en las próximas 2-4 horas con precio y disponibilidad.'
        break
      case 'medida_no_disponible':
        mensajeCliente = 'Consulté con el equipo de compras. Te contactan en 24-48hs para confirmarte disponibilidad.'
        break
      case 'consulta_tecnica':
        mensajeCliente = 'Tu consulta técnica fue registrada. Un especialista te responderá en breve.'
        break
      default:
        mensajeCliente = 'Tu solicitud fue registrada. El equipo te contactará pronto.'
    }

    // Actualizar notas del lead con el ticket creado
    const now = new Date()
    const dia = String(now.getDate()).padStart(2, '0')
    const mes = String(now.getMonth() + 1).padStart(2, '0')
    const hora = String(now.getHours()).padStart(2, '0')
    const min = String(now.getMinutes()).padStart(2, '0')
    const timestamp = `${dia}/${mes} ${hora}:${min}`

    await sql`
      UPDATE leads
      SET 
        notas = COALESCE(notas, '') || E'\\n' || 
          '⚠️ ' || ${timestamp} || ' - Ticket creado: ' || ${ticketIdFormatted} || ' (' || ${tipo} || ')',
        updated_at = NOW()
      WHERE id = ${leadId}
    `

    console.log("[crear_ticket] Notas actualizadas en lead")

    // Devolver respuesta
    return NextResponse.json({
      success: true,
      ticket_id: ticketIdFormatted,
      tipo,
      prioridad,
      tiempo_estimado_respuesta: tiempoRespuesta,
      mensaje_para_cliente: mensajeCliente
    })

  } catch (error: any) {
    console.error("[crear_ticket] Error:", error)
    return NextResponse.json(
      { error: error.message || "Error interno" },
      { status: 500 }
    )
  }
}
