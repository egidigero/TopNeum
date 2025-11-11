import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * Endpoint para n8n - Actualizar estado del lead
 * 
 * Input esperado:
 * {
 *   telefono_whatsapp: "+54 9 11 1234 5678",
 *   nuevo_estado: "cotizacion_enviada",
 *   cambiado_por: "agente_llm",
 *   datos_adicionales: { ... }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validar API Key (opcional - comentado para desarrollo)
    // const apiKey = request.headers.get('x-api-key')
    // if (apiKey !== process.env.N8N_API_KEY) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    let { 
      telefono_whatsapp, 
      nuevo_estado, 
      cambiado_por = 'agente_llm',
      // Campos específicos del cliente
      tipo_vehiculo,
      medida_neumatico,
      marca_preferida,
      // Campos de pedido (legacy - mantener por compatibilidad)
      datos_adicionales 
    } = body

    // Normalizar teléfono (eliminar espacios y guiones)
    if (telefono_whatsapp) {
      telefono_whatsapp = String(telefono_whatsapp).replace(/[\s\-()]/g, '')
      // Asegurar formato con +
      if (!telefono_whatsapp.startsWith('+')) {
        if (telefono_whatsapp.startsWith('54')) {
          telefono_whatsapp = '+' + telefono_whatsapp
        } else {
          telefono_whatsapp = '+54' + telefono_whatsapp
        }
      }
    }

    console.log('[n8n-estado] 📝 Actualizando estado:', { 
      telefono_whatsapp, 
      nuevo_estado,
      cambiado_por,
      tipo_vehiculo,
      medida_neumatico,
      marca_preferida
    })

    // Validar teléfono
    if (!telefono_whatsapp) {
      return NextResponse.json({ 
        error: 'telefono_whatsapp es requerido' 
      }, { status: 400 })
    }

    // Validar estado
    const estadosValidos = [
      'conversacion_iniciada',
      'consulta_producto',
      'cotizacion_enviada',
      'en_proceso_de_pago',
      'pagado',
      'turno_pendiente',
      'turno_agendado',
      'pedido_enviado',
      'pedido_finalizado',
      'abandonado'
    ]

    if (!estadosValidos.includes(nuevo_estado)) {
      return NextResponse.json({ 
        error: `Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}` 
      }, { status: 400 })
    }

    // Obtener o crear lead
    const leadResult = await sql`
      SELECT get_or_create_lead(${telefono_whatsapp}) as lead_id
    `
    const lead_id = leadResult[0].lead_id

    // Obtener estado actual
    const leadActual = await sql`
      SELECT estado FROM leads WHERE id = ${lead_id}
    `
    const estadoAnterior = leadActual[0]?.estado

    // Actualizar estado
    await sql`
      UPDATE leads
      SET 
        estado = ${nuevo_estado},
        updated_at = NOW(),
        ultima_interaccion = NOW()
      WHERE id = ${lead_id}
    `

    // Registrar en historial (el trigger lo hace automáticamente, pero lo hacemos explícito)
    await sql`
      INSERT INTO lead_historial (lead_id, estado_anterior, estado_nuevo, cambiado_por)
      VALUES (${lead_id}, ${estadoAnterior}, ${nuevo_estado}, ${cambiado_por})
    `

    // Guardar información del cliente en lead_consultas
    if (tipo_vehiculo || medida_neumatico || marca_preferida) {
      // Obtener consulta existente o crear nueva
      const consultaExistente = await sql`
        SELECT id FROM lead_consultas 
        WHERE lead_id = ${lead_id} 
        ORDER BY created_at DESC 
        LIMIT 1
      `

      if (consultaExistente.length > 0) {
        // Actualizar consulta existente
        const updates: string[] = []
        if (tipo_vehiculo) updates.push(`tipo_vehiculo = '${tipo_vehiculo}'`)
        if (medida_neumatico) updates.push(`medida_neumatico = '${medida_neumatico}'`)
        if (marca_preferida) updates.push(`marca_preferida = '${marca_preferida}'`)

        if (updates.length > 0) {
          await sql.unsafe(`
            UPDATE lead_consultas 
            SET ${updates.join(', ')}
            WHERE id = '${consultaExistente[0].id}'
          `)
        }
      } else {
        // Crear nueva consulta
        await sql`
          INSERT INTO lead_consultas (lead_id, tipo_vehiculo, medida_neumatico, marca_preferida)
          VALUES (
            ${lead_id},
            ${tipo_vehiculo || null},
            ${medida_neumatico || null},
            ${marca_preferida || null}
          )
        `
      }
    }

    // Procesar datos adicionales según el estado (legacy - mantener por compatibilidad)
    if (datos_adicionales) {
      await procesarDatosAdicionales(lead_id, nuevo_estado, datos_adicionales)
    }

    // Obtener label de WhatsApp actualizado Y código de confirmación
    const leadActualizado = await sql`
      SELECT 
        estado, 
        whatsapp_label,
        codigo_confirmacion,
        nombre_cliente,
        region
      FROM leads 
      WHERE id = ${lead_id}
    `

    console.log('[n8n-estado] ✅ Estado actualizado:', leadActualizado[0])

    return NextResponse.json({
      success: true,
      lead_id,
      estado_anterior: estadoAnterior,
      estado_nuevo: nuevo_estado,
      whatsapp_label: leadActualizado[0].whatsapp_label,
      codigo_confirmacion: leadActualizado[0].codigo_confirmacion, // 🆕 CÓDIGO para agendar turno
      nombre_cliente: leadActualizado[0].nombre_cliente,
      region: leadActualizado[0].region,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[n8n-estado] ❌ Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Error interno del servidor' 
    }, { status: 500 })
  }
}

/**
 * Procesar datos adicionales según el estado
 */
async function procesarDatosAdicionales(
  lead_id: string, 
  estado: string, 
  datos: any
) {
  console.log('[procesarDatosAdicionales] Lead:', lead_id, 'Estado:', estado, 'Datos:', datos)

  // SIEMPRE actualizar campos básicos del lead si vienen en datos
  try {
    if (datos.nombre_cliente) {
      await sql`
        UPDATE leads
        SET nombre_cliente = ${datos.nombre_cliente}
        WHERE id = ${lead_id}
      `
      console.log('[procesarDatosAdicionales] ✅ Actualizado nombre_cliente')
    }
    
    if (datos.region) {
      await sql`
        UPDATE leads
        SET region = ${datos.region}
        WHERE id = ${lead_id}
      `
      console.log('[procesarDatosAdicionales] ✅ Actualizado region')
    }
  } catch (err) {
    console.error('[procesarDatosAdicionales] Error actualizando lead básico:', err)
  }

  // Guardar en lead_consultas si hay info de producto
  if (datos.tipo_vehiculo || datos.medida_neumatico || datos.marca_preferida) {
    try {
      await sql`
        INSERT INTO lead_consultas (
          lead_id,
          medida_neumatico,
          marca_preferida,
          tipo_vehiculo,
          tipo_uso
        )
        VALUES (
          ${lead_id},
          ${datos.medida_neumatico || null},
          ${datos.marca_preferida || null},
          ${datos.tipo_vehiculo || null},
          ${datos.tipo_uso || null}
        )
      `
      console.log('[procesarDatosAdicionales] ✅ Guardado en lead_consultas')
    } catch (err) {
      console.error('[procesarDatosAdicionales] Error guardando consulta:', err)
    }
  }

  // Procesar según el estado específico
  switch (estado) {
    case 'consulta_producto':
      // Ya se guardó en lead_consultas arriba
      break

    case 'cotizacion_enviada':
      // Registrar cotización
      if (datos.productos_mostrados) {
        await sql`
          INSERT INTO lead_cotizaciones (
            lead_id,
            productos_mostrados,
            region,
            precio_total_3cuotas,
            precio_total_contado
          )
          VALUES (
            ${lead_id},
            ${JSON.stringify(datos.productos_mostrados)},
            ${datos.region || 'CABA'},
            ${datos.precio_total_3cuotas || null},
            ${datos.precio_total_contado || null}
          )
        `
      }
      break

    case 'en_proceso_de_pago':
      // Crear pedido pendiente
      if (datos.productos && datos.forma_pago) {
        await sql`
          INSERT INTO lead_pedidos (
            lead_id,
            productos,
            cantidad_total,
            forma_pago,
            subtotal,
            descuento_porcentaje,
            descuento_monto,
            total,
            requiere_sena,
            monto_sena
          )
          VALUES (
            ${lead_id},
            ${JSON.stringify(datos.productos)},
            ${datos.cantidad_total || 4},
            ${datos.forma_pago},
            ${datos.subtotal},
            ${datos.descuento_porcentaje || 0},
            ${datos.descuento_monto || 0},
            ${datos.total},
            ${datos.requiere_sena || false},
            ${datos.monto_sena || null}
          )
        `
      }
      break

    case 'turno_agendado':
      // Actualizar información de entrega/colocación
      if (datos.tipo_entrega) {
        // Buscar pedido del lead
        const pedido = await sql`
          SELECT id FROM lead_pedidos 
          WHERE lead_id = ${lead_id} 
          ORDER BY created_at DESC 
          LIMIT 1
        `

        if (pedido.length > 0) {
          await sql`
            INSERT INTO lead_entregas (
              pedido_id,
              lead_id,
              tipo_entrega,
              fecha_turno,
              hora_turno,
              direccion_envio
            )
            VALUES (
              ${pedido[0].id},
              ${lead_id},
              ${datos.tipo_entrega},
              ${datos.fecha_turno || null},
              ${datos.hora_turno || null},
              ${datos.direccion_envio ? JSON.stringify(datos.direccion_envio) : null}
            )
          `
        }
      }
      break
  }
}

// GET endpoint para consultar estado actual
export async function GET(request: NextRequest) {
  try {
    // Validar API Key (opcional - comentado para desarrollo)
    // const apiKey = request.headers.get('x-api-key')
    // if (apiKey !== process.env.N8N_API_KEY) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { searchParams } = new URL(request.url)
    const telefono = searchParams.get('telefono')

    if (!telefono) {
      return NextResponse.json({ 
        error: 'telefono query param es requerido' 
      }, { status: 400 })
    }

    // Buscar lead
    const lead = await sql`
      SELECT 
        id,
        telefono_whatsapp,
        nombre_cliente,
        region,
        estado,
        whatsapp_label,
        codigo_confirmacion,
        created_at,
        updated_at,
        ultima_interaccion
      FROM leads
      WHERE telefono_whatsapp = ${telefono}
    `

    if (lead.length === 0) {
      return NextResponse.json({ 
        exists: false,
        message: 'Lead no encontrado'
      })
    }

    // Obtener información adicional
    const consultas = await sql`
      SELECT * FROM lead_consultas WHERE lead_id = ${lead[0].id} ORDER BY created_at DESC
    `

    const cotizaciones = await sql`
      SELECT * FROM lead_cotizaciones WHERE lead_id = ${lead[0].id} ORDER BY created_at DESC
    `

    const pedidos = await sql`
      SELECT * FROM lead_pedidos WHERE lead_id = ${lead[0].id} ORDER BY created_at DESC
    `

    return NextResponse.json({
      exists: true,
      lead: lead[0],
      consultas,
      cotizaciones,
      pedidos
    })

  } catch (error: any) {
    console.error('[n8n-estado] ❌ Error GET:', error)
    return NextResponse.json({ 
      error: error.message || 'Error interno del servidor' 
    }, { status: 500 })
  }
}
