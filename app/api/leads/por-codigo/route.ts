import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * GET /api/leads/por-codigo?codigo=ABC123
 * Endpoint público para buscar un lead por su código de confirmación
 * Usado en la página de agendamiento de turnos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const codigo = searchParams.get('codigo')

    if (!codigo) {
      return NextResponse.json({ 
        error: 'Código de confirmación requerido' 
      }, { status: 400 })
    }

    // Normalizar código (mayúsculas, sin espacios)
    const codigoNormalizado = codigo.trim().toUpperCase()

    // Buscar lead por código
    const leadResult = await sql`
      SELECT 
        l.id,
        l.telefono_whatsapp,
        l.nombre_cliente,
        l.region,
        l.codigo_confirmacion,
        l.estado
      FROM leads l
      WHERE l.codigo_confirmacion = ${codigoNormalizado}
      LIMIT 1
    `

    if (leadResult.length === 0) {
      return NextResponse.json({ 
        error: 'Código no encontrado. Verificá que sea correcto.' 
      }, { status: 404 })
    }

    const lead = leadResult[0]

    // Obtener información del vehículo y medida
    const consultaResult = await sql`
      SELECT 
        tipo_vehiculo,
        medida_neumatico,
        marca_preferida
      FROM lead_consultas
      WHERE lead_id = ${lead.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    const consulta = consultaResult.length > 0 ? consultaResult[0] : null

    // Obtener información del pedido más reciente
    const pedidoResult = await sql`
      SELECT 
        id,
        forma_pago,
        estado,
        created_at
      FROM lead_pedidos
      WHERE lead_id = ${lead.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    let pedidoInfo = null
    
    if (pedidoResult.length > 0) {
      const pedido = pedidoResult[0]
      
      // Obtener items del pedido con información de productos
      const itemsResult = await sql`
        SELECT 
          pi.cantidad,
          pi.precio_unitario,
          pi.subtotal,
          p.marca,
          p.familia as modelo,
          p.medida,
          p.indice
        FROM pedido_items pi
        INNER JOIN products p ON pi.producto_sku = p.sku
        WHERE pi.pedido_id = ${pedido.id}
        ORDER BY pi.id
      `

      // Calcular totales
      const cantidadTotal = itemsResult.reduce((sum: number, item: any) => sum + item.cantidad, 0)
      const precioTotal = itemsResult.reduce((sum: number, item: any) => sum + parseFloat(item.subtotal), 0)

      pedidoInfo = {
        id: pedido.id,
        forma_pago: pedido.forma_pago,
        estado: pedido.estado,
        cantidad_total: cantidadTotal,
        precio_total: precioTotal,
        items: itemsResult.map((item: any) => ({
          marca: item.marca,
          modelo: item.modelo,
          medida: item.medida,
          indice: item.indice,
          cantidad: item.cantidad,
          precio_unitario: parseFloat(item.precio_unitario),
          subtotal: parseFloat(item.subtotal)
        }))
      }
    }

    // Verificar si ya tiene turno agendado
    const turnoResult = await sql`
      SELECT 
        id,
        fecha,
        hora_inicio,
        hora_fin,
        tipo,
        estado
      FROM turnos
      WHERE lead_id = ${lead.id}
      AND estado != 'cancelado'
      ORDER BY created_at DESC
      LIMIT 1
    `

    const turnoExistente = turnoResult.length > 0 ? turnoResult[0] : null

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        nombre_cliente: lead.nombre_cliente,
        telefono_whatsapp: lead.telefono_whatsapp,
        region: lead.region,
        codigo: lead.codigo_confirmacion,
        estado: lead.estado
      },
      vehiculo: consulta ? {
        tipo: consulta.tipo_vehiculo,
        medida: consulta.medida_neumatico,
        marca_preferida: consulta.marca_preferida
      } : null,
      pedido: pedidoInfo,
      turno_existente: turnoExistente
    })

  } catch (error: any) {
    console.error('[por-codigo] Error:', error)
    return NextResponse.json({ 
      error: 'Error al buscar el código' 
    }, { status: 500 })
  }
}
