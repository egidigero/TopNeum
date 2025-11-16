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
      nombre,              // 🆕 Nombre del cliente
      tipo_vehiculo,
      medida_neumatico,
      marca_preferida,
      notas,               // 🆕 Notas o comentarios
      // 🆕 CAMPOS NUEVOS REFACTORIZADOS
      producto_descripcion,  // Texto largo: "Pirelli P400 185/60R15 Cinturato P1"
      forma_pago_detalle,    // Texto: "3 cuotas: $33,333" o "Transferencia: $100,000"
      cantidad,
      precio_final,
      // Campos legacy (mantener por compatibilidad temporal)
      producto_marca,
      producto_modelo,
      producto_medida,
      producto_diseno,
      precio_unitario,
      forma_pago,
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
      nombre,
      tipo_vehiculo,
      medida_neumatico,
      marca_preferida,
      notas
    })

    // Validar teléfono
    if (!telefono_whatsapp) {
      return NextResponse.json({ 
        error: 'telefono_whatsapp es requerido' 
      }, { status: 400 })
    }

    // Validar estado
    const estadosValidos = [
      'nuevo',
      'en_conversacion',
      'cotizado',
      'esperando_pago',
      'pago_informado',
      'pedido_confirmado',
      'perdido'
    ]

    if (nuevo_estado && !estadosValidos.includes(nuevo_estado)) {
      return NextResponse.json({ 
        error: `Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}` 
      }, { status: 400 })
    }

    // Obtener o crear lead
    const leadResult = await sql`
      SELECT get_or_create_lead(${telefono_whatsapp}) as lead_id
    `
    const lead_id = leadResult[0].lead_id

    // 🆕 ACTUALIZAR NOMBRE DEL CLIENTE si viene
    if (nombre) {
      await sql`
        UPDATE leads
        SET nombre_cliente = ${nombre}
        WHERE id = ${lead_id}
      `
      console.log('[n8n-estado] ✅ Nombre actualizado:', nombre)
    }

    // 🆕 ACUMULAR TIPO_VEHICULO si viene (para múltiples consultas)
    if (tipo_vehiculo) {
      const vehiculoActual = await sql`
        SELECT tipo_vehiculo FROM leads WHERE id = ${lead_id}
      `
      const vehiculoExistente = vehiculoActual[0]?.tipo_vehiculo || ''
      
      // Si ya existe y no incluye el nuevo, acumular
      if (vehiculoExistente && !vehiculoExistente.includes(tipo_vehiculo)) {
        const vehiculosAcumulados = `${vehiculoExistente} + ${tipo_vehiculo}`
        await sql`
          UPDATE leads
          SET tipo_vehiculo = ${vehiculosAcumulados}
          WHERE id = ${lead_id}
        `
        console.log('[n8n-estado] ✅ Vehículo acumulado:', vehiculosAcumulados)
      } else if (!vehiculoExistente) {
        // Primera vez, simplemente guardar
        await sql`
          UPDATE leads
          SET tipo_vehiculo = ${tipo_vehiculo}
          WHERE id = ${lead_id}
        `
        console.log('[n8n-estado] ✅ Vehículo guardado:', tipo_vehiculo)
      } else {
        console.log('[n8n-estado] ℹ️ Vehículo ya existe, no actualizar')
      }
    }

    // 🆕 AGREGAR NOTAS si vienen
    if (notas) {
      const timestamp = new Date().toISOString()
      // Obtener notas actuales primero
      const notasActuales = await sql`
        SELECT notas FROM leads WHERE id = ${lead_id}
      `
      const notasExistentes = notasActuales[0]?.notas || ''
      const nuevaNota = `\n[${timestamp}] ${notas}`
      const notasActualizadas = notasExistentes + nuevaNota
      
      await sql`
        UPDATE leads
        SET notas = ${notasActualizadas}
        WHERE id = ${lead_id}
      `
      console.log('[n8n-estado] ✅ Notas agregadas:', notas)
    }

    // Obtener estado actual
    const leadActual = await sql`
      SELECT estado FROM leads WHERE id = ${lead_id}
    `
    const estadoAnterior = leadActual[0]?.estado

    // 🆕 LÓGICA AUTOMÁTICA DE ESTADOS:
    // Si llega producto_descripcion y no hay estado especificado → 'esperando_pago'
    let estadoFinal = nuevo_estado
    if (!nuevo_estado && producto_descripcion) {
      estadoFinal = 'esperando_pago'
      console.log('[n8n-estado] 🔄 Auto-estado: esperando_pago (producto confirmado)')
    } else if (!nuevo_estado) {
      estadoFinal = estadoAnterior // Mantener estado actual
    }

    // Actualizar estado
    await sql`
      UPDATE leads
      SET 
        estado = ${estadoFinal},
        updated_at = NOW(),
        ultima_interaccion = NOW()
      WHERE id = ${lead_id}
    `

    // Registrar en historial (el trigger lo hace automáticamente, pero lo hacemos explícito)
    if (estadoFinal !== estadoAnterior) {
      await sql`
        INSERT INTO lead_historial (lead_id, estado_anterior, estado_nuevo, cambiado_por)
        VALUES (${lead_id}, ${estadoAnterior}, ${estadoFinal}, ${cambiado_por})
      `
    }

    // Guardar información del cliente en lead_consultas
    if (tipo_vehiculo || medida_neumatico || marca_preferida) {
      console.log('[n8n-estado] 💾 Guardando datos del cliente:', { tipo_vehiculo, medida_neumatico, marca_preferida })
      
      // 🆕 LÓGICA MEJORADA: Si viene medida nueva, crear consulta nueva
      if (medida_neumatico) {
        // Verificar si ya existe una consulta con esta medida
        const consultaMismamedida = await sql`
          SELECT id FROM lead_consultas 
          WHERE lead_id = ${lead_id} 
          AND medida_neumatico = ${medida_neumatico}
          LIMIT 1
        `

        if (consultaMismamedida.length > 0) {
          // Ya existe consulta con esta medida → actualizar
          console.log('[n8n-estado] 🔄 Actualizando consulta existente para medida:', medida_neumatico)
          const consultaId = consultaMismamedida[0].id
          
          await sql`
            UPDATE lead_consultas 
            SET 
              tipo_vehiculo = COALESCE(${tipo_vehiculo}, tipo_vehiculo),
              marca_preferida = COALESCE(${marca_preferida}, marca_preferida),
              updated_at = NOW()
            WHERE id = ${consultaId}
          `
        } else {
          // Nueva medida → crear nueva consulta
          console.log('[n8n-estado] 🆕 Creando nueva consulta para medida:', medida_neumatico)
          
          await sql`
            INSERT INTO lead_consultas (lead_id, tipo_vehiculo, medida_neumatico, marca_preferida)
            VALUES (
              ${lead_id},
              ${tipo_vehiculo || null},
              ${medida_neumatico},
              ${marca_preferida || null}
            )
          `
        }
      } else {
        // Solo vienen tipo_vehiculo o marca_preferida (sin medida)
        // Actualizar la última consulta
        const ultimaConsulta = await sql`
          SELECT id FROM lead_consultas 
          WHERE lead_id = ${lead_id} 
          ORDER BY created_at DESC 
          LIMIT 1
        `

        if (ultimaConsulta.length > 0) {
          await sql`
            UPDATE lead_consultas 
            SET 
              tipo_vehiculo = COALESCE(${tipo_vehiculo}, tipo_vehiculo),
              marca_preferida = COALESCE(${marca_preferida}, marca_preferida),
              updated_at = NOW()
            WHERE id = ${ultimaConsulta[0].id}
          `
        } else {
          // No hay consultas todavía, crear una nueva
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
      
      console.log('[n8n-estado] ✅ Consulta guardada')
    }

    // Guardar información del pedido (producto elegido, precio, etc)
    if (producto_descripcion || precio_final) {
      console.log('[n8n-estado] 💰 Guardando datos del pedido')
      
      // Buscar pedido existente
      const pedidoExistente = await sql`
        SELECT id FROM lead_pedidos 
        WHERE lead_id = ${lead_id} 
        ORDER BY created_at DESC 
        LIMIT 1
      `

      if (pedidoExistente.length > 0) {
        console.log('[n8n-estado] 🔄 Actualizando pedido existente')
        
        // Obtener valores actuales
        const pedidoActual = await sql`
          SELECT * FROM lead_pedidos 
          WHERE id = ${pedidoExistente[0].id}
        `
        const pedido = pedidoActual[0]
        
        // 🆕 USAR CAMPOS NUEVOS (producto_descripcion, forma_pago_detalle)
        // Si vienen campos legacy, convertirlos a nuevo formato
        let descripcionFinal = producto_descripcion
        if (!descripcionFinal && producto_marca) {
          descripcionFinal = [producto_marca, producto_modelo, producto_medida, producto_diseno]
            .filter(Boolean)
            .join(' ')
        }
        
        let formaPagoFinal = forma_pago_detalle
        if (!formaPagoFinal && forma_pago) {
          formaPagoFinal = forma_pago // backward compatibility
        }
        
        // Merge: mantener valores existentes, actualizar solo los nuevos
        // ⚠️ Para cantidad: si el cliente corrige, SIEMPRE actualizar (incluso si es menor)
        const cantidadFinal = cantidad !== undefined && cantidad !== null 
          ? cantidad 
          : pedido.cantidad_total
        
        await sql`
          UPDATE lead_pedidos 
          SET 
            producto_descripcion = ${descripcionFinal || pedido.producto_descripcion},
            forma_pago_detalle = ${formaPagoFinal || pedido.forma_pago_detalle},
            precio_final = ${precio_final || pedido.precio_final},
            cantidad_total = ${cantidadFinal}
          WHERE id = ${pedidoExistente[0].id}
        `
        
        console.log('[n8n-estado] ✅ Pedido actualizado')
      } else {
        console.log('[n8n-estado] 🆕 Creando nuevo pedido')
        
        // 🆕 Convertir campos legacy si es necesario
        let descripcionFinal = producto_descripcion
        if (!descripcionFinal && producto_marca) {
          descripcionFinal = [producto_marca, producto_modelo, producto_medida, producto_diseno]
            .filter(Boolean)
            .join(' ')
        }
        
        let formaPagoFinal = forma_pago_detalle || forma_pago || null
        
        // 🔧 Mapear forma_pago_detalle a valores válidos de la BD
        // La BD solo acepta: transferencia_con_factura, transferencia_sin_factura, 
        // efectivo_con_factura, efectivo_sin_factura, 3_cuotas, 6_cuotas, 12_cuotas
        const mapearFormaPago = (texto: string | null): string => {
          if (!texto) return '3_cuotas' // default
          
          const textoLower = texto.toLowerCase()
          
          // Detectar cuotas
          if (textoLower.includes('3') && textoLower.includes('cuota')) return '3_cuotas'
          if (textoLower.includes('6') && textoLower.includes('cuota')) return '6_cuotas'
          if (textoLower.includes('12') && textoLower.includes('cuota')) return '12_cuotas'
          
          // Detectar transferencia
          if (textoLower.includes('transferencia')) {
            if (textoLower.includes('con factura') || textoLower.includes('con_factura')) {
              return 'transferencia_con_factura'
            }
            return 'transferencia_sin_factura' // default sin factura
          }
          
          // Detectar efectivo
          if (textoLower.includes('efectivo') || textoLower.includes('contado')) {
            if (textoLower.includes('con factura') || textoLower.includes('con_factura')) {
              return 'efectivo_con_factura'
            }
            return 'efectivo_sin_factura' // default sin factura
          }
          
          // Default: 3 cuotas
          return '3_cuotas'
        }
        
        const formaPagoBD = mapearFormaPago(formaPagoFinal)
        
        // Crear nuevo pedido
        // 🔧 NOTA: Todos los campos NOT NULL de lead_pedidos deben tener valores
        const cantidadFinal = cantidad || 4
        const precioFinalCalc = precio_final || 0
        
        await sql`
          INSERT INTO lead_pedidos (
            lead_id, 
            productos,
            cantidad_total,
            forma_pago,
            subtotal,
            total,
            estado_pago,
            producto_descripcion,
            forma_pago_detalle,
            precio_final
          )
          VALUES (
            ${lead_id},
            ${JSON.stringify([])},
            ${cantidadFinal},
            ${formaPagoBD},
            ${precioFinalCalc},
            ${precioFinalCalc},
            'pendiente',
            ${descripcionFinal || null},
            ${formaPagoFinal},
            ${precioFinalCalc}
          )
        `
        
        console.log('[n8n-estado] ✅ Pedido creado')
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
        codigo_confirmacion,
        nombre_cliente,
        region
      FROM leads 
      WHERE id = ${lead_id}
    `

    // 🔍 Construir datos_recolectados desde los valores que acabamos de procesar
    // Esto asegura que devolvemos lo que el usuario envió, no lo que está en BD
    // (que puede tener delay o no estar disponible inmediatamente)
    const datosRecolectados: Record<string, any> = {}
    
    if (nombre) datosRecolectados.nombre = nombre
    if (tipo_vehiculo) datosRecolectados.tipo_vehiculo = tipo_vehiculo
    if (medida_neumatico) datosRecolectados.medida_neumatico = medida_neumatico
    if (marca_preferida) datosRecolectados.marca_preferida = marca_preferida
    if (notas) datosRecolectados.notas = notas
    
    // Si no hay datos directos, intentar obtener desde BD como fallback
    if (Object.keys(datosRecolectados).length === 0) {
      const consultaActual = await sql`
        SELECT 
          tipo_vehiculo,
          medida_neumatico,
          marca_preferida
        FROM lead_consultas 
        WHERE lead_id = ${lead_id}
        ORDER BY created_at DESC
        LIMIT 1
      `
      
      if (consultaActual.length > 0) {
        if (consultaActual[0].tipo_vehiculo) datosRecolectados.tipo_vehiculo = consultaActual[0].tipo_vehiculo
        if (consultaActual[0].medida_neumatico) datosRecolectados.medida_neumatico = consultaActual[0].medida_neumatico
        if (consultaActual[0].marca_preferida) datosRecolectados.marca_preferida = consultaActual[0].marca_preferida
      }
    }

    console.log('[n8n-estado] ✅ Estado actualizado:', leadActualizado[0])
    console.log('[n8n-estado] 📊 Datos recolectados:', datosRecolectados)

    return NextResponse.json({
      success: true,
      lead_id,
      estado_anterior: estadoAnterior,
      estado_nuevo: estadoFinal,
      codigo_confirmacion: leadActualizado[0].codigo_confirmacion, // 🆕 CÓDIGO para agendar turno
      nombre_cliente: leadActualizado[0].nombre_cliente,
      region: leadActualizado[0].region,
      datos_recolectados: datosRecolectados, // 🆕 Datos del cliente
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
