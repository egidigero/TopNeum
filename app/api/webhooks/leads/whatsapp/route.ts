import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * Webhook para recibir mensajes de WhatsApp desde Evolution API o n8n
 * 
 * Soporta:
 * - Crear/actualizar leads
 * - Registrar consultas de productos (múltiples)
 * - Generar cotizaciones
 * - Crear pedidos
 * - Crear tickets
 * 
 * Body esperado:
 * {
 *   "action": "create_lead" | "add_consulta" | "create_cotizacion" | "create_pedido" | "create_ticket" | "actualizar_estado",
 *   "telefono": "+5491123456789",
 *   "nombre": "Juan Pérez" (opcional para consultas),
 *   "region": "CABA" | "INTERIOR",
 *   "mensaje": "Texto del mensaje" (para notas),
 *   
 *   // Para consultas
 *   "consulta": {
 *     "medida_neumatico": "185/60R15",
 *     "marca_preferida": "Yokohama",
 *     "tipo_vehiculo": "sedan",
 *     "tipo_uso": "ciudad",
 *     "cantidad": 4
 *   },
 *   
 *   // Para cotizaciones
 *   "cotizacion": {
 *     "consulta_id": "uuid",
 *     "productos_mostrados": [{...}],
 *     "precio_total_3cuotas": 567996.00,
 *     "precio_total_contado": 499996.00
 *   },
 *   
 *   // Para pedidos
 *   "pedido": {
 *     "cotizacion_id": "uuid",
 *     "productos": [{...}],
 *     "cantidad_total": 4,
 *     "forma_pago": "3_cuotas",
 *     "total": 567996.00
 *   },
 *   
 *   // Para tickets
 *   "ticket": {
 *     "tipo": "marca_especial" | "medida_no_disponible" | "consulta_tecnica" | "problema_pago" | "reclamo" | "otro",
 *     "descripcion": "Texto del problema",
 *     "prioridad": "baja" | "media" | "alta" | "urgente"
 *   },
 *   
 *   // Para actualizar estado
 *   "nuevo_estado": "nuevo" | "en_conversacion" | "cotizado" | "esperando_pago" | "pago_informado" | "pedido_confirmado" | "perdido" | "sin_interes"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, telefono, nombre, region, mensaje } = body

    if (!telefono) {
      return NextResponse.json({ error: "Teléfono requerido" }, { status: 400 })
    }

    // Normalizar teléfono
    let telefonoNormalizado = telefono.replace(/[\s()-]/g, '')
    if (!telefonoNormalizado.startsWith('+')) {
      if (telefonoNormalizado.startsWith('54')) {
        telefonoNormalizado = '+' + telefonoNormalizado
      } else {
        telefonoNormalizado = '+54' + telefonoNormalizado
      }
    }

    // 1️⃣ Obtener o crear lead
    let lead = await sql`
      SELECT * FROM leads 
      WHERE telefono_whatsapp = ${telefonoNormalizado}
      LIMIT 1
    `

    let leadId: string

    if (lead.length === 0) {
      // Crear nuevo lead
      const regionDetectada = region || (telefonoNormalizado.includes('5491111') || telefonoNormalizado.includes('549115') ? 'CABA' : 'INTERIOR')
      
      const newLead = await sql`
        INSERT INTO leads (
          telefono_whatsapp,
          nombre_cliente,
          region,
          estado,
          origen,
          notas
        ) VALUES (
          ${telefonoNormalizado},
          ${nombre || null},
          ${regionDetectada},
          'en_conversacion',
          'whatsapp',
          ${mensaje ? `[${new Date().toISOString()}] - ${mensaje}` : null}
        )
        RETURNING *
      `
      leadId = newLead[0].id
      lead = newLead
    } else {
      leadId = lead[0].id
      
      // Actualizar nombre si viene
      if (nombre && !lead[0].nombre_cliente) {
        await sql`
          UPDATE leads 
          SET nombre_cliente = ${nombre},
              updated_at = NOW()
          WHERE id = ${leadId}
        `
      }
      
      // Agregar mensaje a notas si viene
      if (mensaje) {
        await sql`
          UPDATE leads 
          SET notas = COALESCE(notas, '') || E'\n' || ${`[${new Date().toISOString()}] - ${mensaje}`},
              ultima_interaccion = NOW(),
              updated_at = NOW()
          WHERE id = ${leadId}
        `
      }
    }

    // 2️⃣ Procesar acción específica
    let result: any = { leadId, telefono: telefonoNormalizado }

    switch (action) {
      case 'add_consulta': {
        const { consulta } = body
        if (!consulta || !consulta.medida_neumatico) {
          return NextResponse.json({ error: "Datos de consulta incompletos" }, { status: 400 })
        }

        // Buscar producto por medida
        let productoId = null
        if (consulta.marca_preferida && consulta.medida_neumatico) {
          const producto = await sql`
            SELECT id FROM products 
            WHERE medida = ${consulta.medida_neumatico}
              AND marca = ${consulta.marca_preferida}
              AND tiene_stock = true
            LIMIT 1
          `
          if (producto.length > 0) {
            productoId = producto[0].id
          }
        }

        const nuevaConsulta = await sql`
          INSERT INTO lead_consultas (
            lead_id,
            medida_neumatico,
            marca_preferida,
            tipo_vehiculo,
            tipo_uso,
            producto_id,
            cantidad
          ) VALUES (
            ${leadId},
            ${consulta.medida_neumatico},
            ${consulta.marca_preferida || null},
            ${consulta.tipo_vehiculo || null},
            ${consulta.tipo_uso || null},
            ${productoId},
            ${consulta.cantidad || 4}
          )
          RETURNING *
        `

        // Actualizar estado del lead
        await sql`
          UPDATE leads 
          SET estado = 'en_conversacion',
              updated_at = NOW()
          WHERE id = ${leadId}
        `

        result.consulta = nuevaConsulta[0]
        break
      }

      case 'create_cotizacion': {
        const { cotizacion } = body
        if (!cotizacion || !cotizacion.productos_mostrados) {
          return NextResponse.json({ error: "Datos de cotización incompletos" }, { status: 400 })
        }

        const nuevaCotizacion = await sql`
          INSERT INTO lead_cotizaciones (
            lead_id,
            consulta_id,
            productos_mostrados,
            region,
            precio_total_3cuotas,
            precio_total_contado,
            enviado_por
          ) VALUES (
            ${leadId},
            ${cotizacion.consulta_id || null},
            ${JSON.stringify(cotizacion.productos_mostrados)},
            ${region || lead[0].region},
            ${cotizacion.precio_total_3cuotas},
            ${cotizacion.precio_total_contado},
            'agente_llm'
          )
          RETURNING *
        `

        // Actualizar estado del lead
        await sql`
          UPDATE leads 
          SET estado = 'cotizado',
              updated_at = NOW()
          WHERE id = ${leadId}
        `

        result.cotizacion = nuevaCotizacion[0]
        break
      }

      case 'create_pedido': {
        const { pedido } = body
        if (!pedido || !pedido.productos || !pedido.forma_pago || !pedido.total) {
          return NextResponse.json({ error: "Datos de pedido incompletos" }, { status: 400 })
        }

        const nuevoPedido = await sql`
          INSERT INTO lead_pedidos (
            lead_id,
            cotizacion_id,
            productos,
            cantidad_total,
            forma_pago,
            subtotal,
            total,
            estado_pago,
            producto_descripcion
          ) VALUES (
            ${leadId},
            ${pedido.cotizacion_id || null},
            ${JSON.stringify(pedido.productos)},
            ${pedido.cantidad_total},
            ${pedido.forma_pago},
            ${pedido.subtotal || pedido.total},
            ${pedido.total},
            'pendiente',
            ${pedido.producto_descripcion || null}
          )
          RETURNING *
        `

        // Actualizar estado del lead
        await sql`
          UPDATE leads 
          SET estado = 'esperando_pago',
              updated_at = NOW()
          WHERE id = ${leadId}
        `

        result.pedido = nuevoPedido[0]
        break
      }

      case 'create_ticket': {
        const { ticket } = body
        if (!ticket || !ticket.tipo || !ticket.descripcion) {
          return NextResponse.json({ error: "Datos de ticket incompletos" }, { status: 400 })
        }

        const nuevoTicket = await sql`
          INSERT INTO lead_tickets (
            lead_id,
            tipo,
            descripcion,
            prioridad,
            estado
          ) VALUES (
            ${leadId},
            ${ticket.tipo},
            ${ticket.descripcion},
            ${ticket.prioridad || 'media'},
            'abierto'
          )
          RETURNING *
        `

        result.ticket = nuevoTicket[0]
        break
      }

      case 'actualizar_estado': {
        const { nuevo_estado } = body
        if (!nuevo_estado) {
          return NextResponse.json({ error: "nuevo_estado requerido" }, { status: 400 })
        }

        const estadosValidos = [
          'nuevo', 
          'en_conversacion', 
          'cotizado', 
          'esperando_pago', 
          'pago_informado', 
          'pedido_confirmado', 
          'perdido', 
          'sin_interes'
        ]

        if (!estadosValidos.includes(nuevo_estado)) {
          return NextResponse.json({ 
            error: "Estado inválido", 
            estados_validos: estadosValidos 
          }, { status: 400 })
        }

        await sql`
          UPDATE leads 
          SET estado = ${nuevo_estado},
              updated_at = NOW()
          WHERE id = ${leadId}
        `

        result.nuevo_estado = nuevo_estado
        break
      }

      default:
        // Solo crear/actualizar lead
        result.action = 'lead_updated'
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[Webhook WhatsApp] Error:", error)
    return NextResponse.json({ 
      error: "Error interno",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
