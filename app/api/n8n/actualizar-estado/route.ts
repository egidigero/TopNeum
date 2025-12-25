import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * Endpoint REFACTORIZADO para n8n - Actualizar estado del lead
 * 
 * ⚠️ SISTEMA DE VALIDACIÓN INTERNA
 * El agente YA NO envía precios ni descripciones de productos.
 * Solo envía SKUs y el sistema calcula TODO automáticamente desde la tabla products.
 * 
 * Esto garantiza:
 * - Precios siempre correctos (vienen de la BD)
 * - No hay errores de tipeo del agente
 * - Los cálculos son exactos
 * - Escalable a miles de pedidos sin revisar manualmente
 * 
 * Input esperado:
 * {
 *   telefono_whatsapp: "+54 9 11 1234 5678",
 *   
 *   // FASE 1: CONSULTA
 *   medida_neumatico: "185/60R15",
 *   marca_preferida: "Yokohama",
 *   tipo_vehiculo: "Volkswagen Gol",
 *   cantidad: 4,
 *   notas: "Cliente pregunta por garantía",
 *   
 *   // FASE 2: PEDIDO CONFIRMADO
 *   items_pedido: [
 *     { sku: "YOK-BLUEARTH-185-60-15", cantidad: 4 }
 *   ],
 *   forma_pago: "3_cuotas",  // 3_cuotas | 6_cuotas | 12_cuotas | transferencia_sin_factura | etc
 *   
 *   // OPCIONAL: Resumen que confirma el cliente
 *   resumen_pedido: "Cliente confirma: 4 Yokohama BLUEARTH 185/60R15 en 3 cuotas"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let { 
      telefono_whatsapp, 
      nuevo_estado, 
      // Datos del cliente
      nombre,
      tipo_vehiculo,
      notas,
      // CONSULTA
      medida_neumatico,
      marca_preferida,
      cantidad,
      // PEDIDO (SKUs validados)
      items_pedido,  // [{ sku: "ABC-123", cantidad: 4 }]
      forma_pago,    // Enum
      resumen_pedido // Texto opcional del agente
    } = body

    // Normalizar teléfono
    if (telefono_whatsapp) {
      telefono_whatsapp = String(telefono_whatsapp).replace(/[\s\-()]/g, '')
      if (!telefono_whatsapp.startsWith('+')) {
        if (telefono_whatsapp.startsWith('54')) {
          telefono_whatsapp = '+' + telefono_whatsapp
        } else {
          telefono_whatsapp = '+54' + telefono_whatsapp
        }
      }
    }

    if (!telefono_whatsapp) {
      return NextResponse.json({ 
        error: 'telefono_whatsapp es requerido' 
      }, { status: 400 })
    }

    console.log('[n8n-estado-v2] 📝 Procesando:', { 
      telefono: telefono_whatsapp, 
      estado: nuevo_estado,
      tiene_consulta: !!medida_neumatico,
      tiene_pedido: !!(items_pedido?.length)
    })

    // Detectar región automáticamente desde el teléfono
    // 54911... o 5411... o +54911... o +5411... = CABA (código de área 11)
    // Cualquier otro = INTERIOR
    const region = (telefono_whatsapp.startsWith('54911') || telefono_whatsapp.startsWith('5411') ||
                    telefono_whatsapp.startsWith('+54911') || telefono_whatsapp.startsWith('+5411')) 
      ? 'CABA' 
      : 'INTERIOR'
    
    console.log('[n8n-estado-v2] 📍 Región detectada:', region)

    // Obtener o crear lead
    const leadResult = await sql`
      SELECT get_or_create_lead(${telefono_whatsapp}) as lead_id
    `
    const lead_id = leadResult[0].lead_id

    // Actualizar región y nombre si viene
    if (nombre) {
      await sql`
        UPDATE leads
        SET 
          nombre_cliente = ${nombre}, 
          region = ${region},
          updated_at = NOW()
        WHERE id = ${lead_id}
      `
    } else {
      // Solo actualizar región
      await sql`
        UPDATE leads
        SET region = ${region}, updated_at = NOW()
        WHERE id = ${lead_id}
      `
    }

    // Actualizar notas si vienen
    if (notas) {
      await sql`
        UPDATE leads
        SET 
          notas = CASE 
            WHEN notas IS NULL THEN ${notas}
            ELSE notas || E'\n\n' || ${notas}
          END,
          updated_at = NOW()
        WHERE id = ${lead_id}
      `
    }

    // DETERMINAR ESTADO
    const estadosValidos = [
      'nuevo', 'en_conversacion', 'cotizado', 
      'esperando_pago', 'pago_informado', 'pedido_confirmado', 'perdido'
    ]

    let estadoFinal = nuevo_estado && estadosValidos.includes(nuevo_estado) 
      ? nuevo_estado 
      : 'en_conversacion'

    // Auto-determinar estado según lo que se envía
    if (items_pedido && items_pedido.length > 0) {
      estadoFinal = 'esperando_pago' // Tiene pedido confirmado
    } else if (medida_neumatico) {
      estadoFinal = 'cotizado' // Consultó productos
    }

    await sql`
      UPDATE leads
      SET estado = ${estadoFinal}, updated_at = NOW(), ultima_interaccion = NOW()
      WHERE id = ${lead_id}
    `

    // ===================
    // GUARDAR CONSULTA (EVITAR DUPLICADOS)
    // ===================
    if (medida_neumatico) {
      console.log('[n8n-estado-v2] 📋 Guardando consulta:', medida_neumatico, marca_preferida || '')
      
      // Verificar si ya existe consulta idéntica (misma medida + marca)
      const consultaExistente = await sql`
        SELECT id FROM lead_consultas
        WHERE lead_id = ${lead_id}
          AND medida_neumatico = ${medida_neumatico}
          AND COALESCE(marca_preferida, '') = COALESCE(${marca_preferida || null}, '')
        LIMIT 1
      `
      
      if (consultaExistente.length > 0) {
        console.log('[n8n-estado-v2] ⚠️ Consulta duplicada detectada, actualizando existente')
        
        // Actualizar consulta existente
        await sql`
          UPDATE lead_consultas
          SET 
            tipo_vehiculo = COALESCE(${tipo_vehiculo || null}, tipo_vehiculo),
            cantidad = ${cantidad || 4},
            updated_at = NOW()
          WHERE id = ${consultaExistente[0].id}
        `
      } else {
        // Insertar nueva consulta
        await sql`
          INSERT INTO lead_consultas (
            lead_id, 
            medida_neumatico, 
            marca_preferida, 
            tipo_vehiculo,
            cantidad
          )
          VALUES (
            ${lead_id},
            ${medida_neumatico},
            ${marca_preferida || null},
            ${tipo_vehiculo || null},
            ${cantidad || 4}
          )
        `
        console.log('[n8n-estado-v2] ✅ Consulta nueva guardada')
      }
    }

    // Actualizar tipo_vehiculo sin medida (para última consulta)
    if (tipo_vehiculo && !medida_neumatico) {
      await sql`
        UPDATE lead_consultas
        SET tipo_vehiculo = ${tipo_vehiculo}, updated_at = NOW()
        WHERE lead_id = ${lead_id}
        AND id = (
          SELECT id FROM lead_consultas 
          WHERE lead_id = ${lead_id}
          ORDER BY created_at DESC 
          LIMIT 1
        )
      `
    }

    // ===================
    // GUARDAR PEDIDO CON VALIDACIÓN DE SKUs
    // ===================
    if (items_pedido && Array.isArray(items_pedido) && items_pedido.length > 0) {
      console.log('[n8n-estado-v2] 💰 Procesando pedido con', items_pedido.length, 'items')
      
      // Validar forma de pago
      const formasPagoValidas = [
        '3_cuotas', '6_cuotas', '12_cuotas',
        'transferencia_con_factura', 'transferencia_sin_factura',
        'efectivo_con_factura', 'efectivo_sin_factura'
      ]
      
      const formaPagoFinal = forma_pago && formasPagoValidas.includes(forma_pago) 
        ? forma_pago 
        : '3_cuotas'
      
      // Determinar columna de precio según forma de pago
      const columnaPrecio = 
        formaPagoFinal === '3_cuotas' ? 'cuota_3' :
        formaPagoFinal === '6_cuotas' ? 'cuota_6' :
        formaPagoFinal === '12_cuotas' ? 'cuota_12' :
        formaPagoFinal.includes('transferencia') ? 'mayorista_sin_fact' :
        'efectivo_bsas_sin_iva'
      
      // VALIDAR CADA SKU Y OBTENER PRECIOS REALES DE LA BD
      const itemsValidados = []
      let precioTotal = 0
      let cantidadTotal = 0
      const descripcionParts = []
      
      for (const item of items_pedido) {
        const { sku, cantidad: cantItem } = item
        
        if (!sku || !cantItem || cantItem <= 0) {
          console.error('[n8n-estado-v2] ❌ Item inválido:', item)
          continue
        }
        
        // Detectar si sku es UUID o SKU string
        const isUUID = String(sku).includes('-') && String(sku).length > 30
        
        // Buscar producto en BD - AQUÍ SE VALIDA TODO
        let productoResult
        
        if (formaPagoFinal === '3_cuotas') {
          if (isUUID) {
            productoResult = await sql`
              SELECT id, sku, marca, familia, medida, indice, cuota_3 as precio_unitario
              FROM products WHERE id = ${sku} AND tiene_stock = true LIMIT 1
            `
          } else {
            productoResult = await sql`
              SELECT id, sku, marca, familia, medida, indice, cuota_3 as precio_unitario
              FROM products WHERE sku = ${sku} AND tiene_stock = true LIMIT 1
            `
          }
        } else if (formaPagoFinal === '6_cuotas') {
          if (isUUID) {
            productoResult = await sql`
              SELECT id, sku, marca, familia, medida, indice, cuota_6 as precio_unitario
              FROM products WHERE id = ${sku} AND tiene_stock = true LIMIT 1
            `
          } else {
            productoResult = await sql`
              SELECT id, sku, marca, familia, medida, indice, cuota_6 as precio_unitario
              FROM products WHERE sku = ${sku} AND tiene_stock = true LIMIT 1
            `
          }
        } else if (formaPagoFinal === '12_cuotas') {
          if (isUUID) {
            productoResult = await sql`
              SELECT id, sku, marca, familia, medida, indice, cuota_12 as precio_unitario
              FROM products WHERE id = ${sku} AND tiene_stock = true LIMIT 1
            `
          } else {
            productoResult = await sql`
              SELECT id, sku, marca, familia, medida, indice, cuota_12 as precio_unitario
              FROM products WHERE sku = ${sku} AND tiene_stock = true LIMIT 1
            `
          }
        } else if (formaPagoFinal.includes('transferencia')) {
          if (isUUID) {
            productoResult = await sql`
              SELECT id, sku, marca, familia, medida, indice, mayorista_sin_fact as precio_unitario
              FROM products WHERE id = ${sku} AND tiene_stock = true LIMIT 1
            `
          } else {
            productoResult = await sql`
              SELECT id, sku, marca, familia, medida, indice, mayorista_sin_fact as precio_unitario
              FROM products WHERE sku = ${sku} AND tiene_stock = true LIMIT 1
            `
          }
        } else {
          if (isUUID) {
            productoResult = await sql`
              SELECT id, sku, marca, familia, medida, indice, efectivo_bsas_sin_iva as precio_unitario
              FROM products WHERE id = ${sku} AND tiene_stock = true LIMIT 1
            `
          } else {
            productoResult = await sql`
              SELECT id, sku, marca, familia, medida, indice, efectivo_bsas_sin_iva as precio_unitario
              FROM products WHERE sku = ${sku} AND tiene_stock = true LIMIT 1
            `
          }
        }
        
        if (productoResult.length === 0) {
          console.error('[n8n-estado-v2] ❌ SKU no encontrado o sin stock:', sku)
          return NextResponse.json({
            error: `Producto con SKU ${sku} no encontrado o sin stock`
          }, { status: 400 })
        }
        
        const producto = productoResult[0]
        const precioUnitario = parseFloat(producto.precio_unitario) || 0
        
        if (precioUnitario === 0) {
          console.error('[n8n-estado-v2] ❌ Producto sin precio:', sku)
          return NextResponse.json({
            error: `Producto ${sku} no tiene precio configurado para ${formaPagoFinal}`
          }, { status: 400 })
        }
        
        const subtotal = precioUnitario * cantItem
        
        itemsValidados.push({
          sku: producto.sku,
          cantidad: cantItem,
          precio_unitario: precioUnitario,
          subtotal
        })
        
        precioTotal += subtotal
        cantidadTotal += cantItem
        
        // Generar descripción automática: "Yokohama BLUEARTH 185/60R15 84H x4"
        const desc = [
          producto.marca,
          producto.familia,
          producto.medida,
          producto.indice
        ].filter(Boolean).join(' ')
        
        descripcionParts.push(cantItem > 1 ? `${desc} x${cantItem}` : desc)
      }
      
      if (itemsValidados.length === 0) {
        return NextResponse.json({
          error: 'No se pudo validar ningún item del pedido'
        }, { status: 400 })
      }
      
      const productoDescripcion = descripcionParts.join(' + ')
      
      // Generar forma_pago_detalle legible
      const formaPagoDetalle = 
        formaPagoFinal === '3_cuotas' ? `3 cuotas: $${(precioTotal / 3).toLocaleString('es-AR', {maximumFractionDigits: 0})} c/u` :
        formaPagoFinal === '6_cuotas' ? `6 cuotas: $${(precioTotal / 6).toLocaleString('es-AR', {maximumFractionDigits: 0})} c/u` :
        formaPagoFinal === '12_cuotas' ? `12 cuotas: $${(precioTotal / 12).toLocaleString('es-AR', {maximumFractionDigits: 0})} c/u` :
        formaPagoFinal.includes('transferencia') ? `Transferencia: $${precioTotal.toLocaleString('es-AR', {maximumFractionDigits: 0})}` :
        `Efectivo: $${precioTotal.toLocaleString('es-AR', {maximumFractionDigits: 0})}`
      
      // Buscar si ya existe un pedido pendiente
      const pedidoExistente = await sql`
        SELECT id FROM lead_pedidos
        WHERE lead_id = ${lead_id}
        AND estado_pago IN ('pendiente')
        ORDER BY created_at DESC
        LIMIT 1
      `
      
      let pedidoId
      
      if (pedidoExistente.length > 0) {
        // Actualizar pedido existente
        pedidoId = pedidoExistente[0].id
        
        await sql`
          UPDATE lead_pedidos
          SET
            cantidad_total = ${cantidadTotal},
            forma_pago = ${formaPagoFinal},
            total = ${precioTotal},
            precio_final = ${precioTotal},
            producto_descripcion = ${productoDescripcion},
            forma_pago_detalle = ${formaPagoDetalle},
            updated_at = NOW()
          WHERE id = ${pedidoId}
        `
        
        // Eliminar items anteriores y crear nuevos
        await sql`DELETE FROM pedido_items WHERE pedido_id = ${pedidoId}`
        
        console.log('[n8n-estado-v2] 🔄 Pedido actualizado:', pedidoId)
      } else {
        // Crear nuevo pedido
        const nuevoPedido = await sql`
          INSERT INTO lead_pedidos (
            lead_id,
            cantidad_total,
            forma_pago,
            total,
            precio_final,
            producto_descripcion,
            forma_pago_detalle,
            estado_pago
          )
          VALUES (
            ${lead_id},
            ${cantidadTotal},
            ${formaPagoFinal},
            ${precioTotal},
            ${precioTotal},
            ${productoDescripcion},
            ${formaPagoDetalle},
            'pendiente'
          )
          RETURNING id
        `
        
        pedidoId = nuevoPedido[0].id
        console.log('[n8n-estado-v2] 🆕 Pedido creado:', pedidoId)
      }
      
      // Insertar items validados con SKUs (FOREIGN KEY a products.sku)
      for (const item of itemsValidados) {
        await sql`
          INSERT INTO pedido_items (pedido_id, producto_sku, cantidad, precio_unitario)
          VALUES (${pedidoId}, ${item.sku}, ${item.cantidad}, ${item.precio_unitario})
        `
      }
      
      // Guardar resumen del pedido en notas si viene
      if (resumen_pedido) {
        await sql`
          UPDATE leads
          SET 
            notas = CASE 
              WHEN notas IS NULL THEN ${resumen_pedido}
              ELSE notas || E'\n\n[PEDIDO CONFIRMADO]\n' || ${resumen_pedido}
            END
          WHERE id = ${lead_id}
        `
      }
      
      console.log('[n8n-estado-v2] ✅ Pedido guardado con', itemsValidados.length, 'items')
      console.log('[n8n-estado-v2] 💵 Total calculado: $', precioTotal.toLocaleString('es-AR'))
      
      // Generar mensaje automático para el agente
      const mensajePedido = generarMensajePedido(itemsValidados, formaPagoFinal, precioTotal, cantidadTotal)
      
      // Obtener estado actualizado
      const leadActualizado = await sql`
        SELECT 
          id,
          estado, 
          codigo_confirmacion,
          nombre_cliente,
          region
        FROM leads 
        WHERE id = ${lead_id}
      `

      return NextResponse.json({
        success: true,
        lead_id: lead_id,
        estado: leadActualizado[0].estado,
        codigo_confirmacion: leadActualizado[0].codigo_confirmacion,
        pedido: {
          id: pedidoId,
          items: itemsValidados,
          total: precioTotal,
          cantidad_total: cantidadTotal,
          forma_pago: formaPagoDetalle,
          producto_descripcion: productoDescripcion
        },
        mensaje_formateado: mensajePedido,  // ← MENSAJE AUTOMÁTICO
        mensaje: 'Pedido guardado correctamente'
      })
    }

    // Si solo actualizó consulta o datos
    const leadActualizado = await sql`
      SELECT 
        id,
        estado, 
        codigo_confirmacion,
        nombre_cliente,
        region
      FROM leads 
      WHERE id = ${lead_id}
    `

    return NextResponse.json({
      success: true,
      lead_id: lead_id,
      estado: leadActualizado[0].estado,
      codigo_confirmacion: leadActualizado[0].codigo_confirmacion,
      mensaje: 'Estado actualizado correctamente'
    })

  } catch (error: any) {
    console.error('[n8n-estado-v2] ❌ Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Error interno del servidor',
      details: error.stack
    }, { status: 500 })
  }
}

/**
 * Genera mensaje automático para confirmar pedido
 * Similar a buscar_productos, devuelve texto listo para WhatsApp
 */
function generarMensajePedido(
  items: Array<{sku: string, cantidad: number, precio_unitario: number, subtotal: number}>,
  formaPago: string,
  total: number,
  cantidadTotal: number
): string {
  const emoji = '✅'
  
  let mensaje = `${emoji} *PEDIDO CONFIRMADO*\n\n`
  mensaje += `📦 *RESUMEN:*\n`
  
  // Listar items (sin detalles técnicos, solo lo importante)
  items.forEach((item, index) => {
    mensaje += `${index + 1}. ${item.cantidad} unidades - $${item.subtotal.toLocaleString('es-AR')}\n`
  })
  
  mensaje += `\n━━━━━━━━━━━━━━━━━\n`
  mensaje += `💰 *TOTAL: $${total.toLocaleString('es-AR')}*\n`
  
  // Forma de pago
  if (formaPago === '3_cuotas') {
    mensaje += `💳 3 cuotas de $${(total / 3).toLocaleString('es-AR', {maximumFractionDigits: 0})}\n`
  } else if (formaPago === '6_cuotas') {
    mensaje += `💳 6 cuotas de $${(total / 6).toLocaleString('es-AR', {maximumFractionDigits: 0})}\n`
  } else if (formaPago === '12_cuotas') {
    mensaje += `💳 12 cuotas de $${(total / 12).toLocaleString('es-AR', {maximumFractionDigits: 0})}\n`
  } else if (formaPago.includes('transferencia')) {
    mensaje += `💵 Transferencia bancaria\n`
  } else {
    mensaje += `💵 Efectivo\n`
  }
  
  mensaje += `\n🎯 *Siguiente paso:* Te envío los datos para coordinar el pago.`
  
  return mensaje
}
