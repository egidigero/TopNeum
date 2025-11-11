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
        l.email,
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

    // Obtener información del pedido (producto elegido, precio, etc)
    const pedidoResult = await sql`
      SELECT 
        producto_elegido_marca,
        producto_elegido_modelo,
        producto_elegido_medida,
        producto_elegido_diseno,
        precio_unitario,
        precio_final,
        cantidad_total,
        forma_pago
      FROM lead_pedidos
      WHERE lead_id = ${lead.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    const pedido = pedidoResult.length > 0 ? pedidoResult[0] : null

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
        nombre: lead.nombre_cliente,
        telefono: lead.telefono_whatsapp,
        email: lead.email,
        region: lead.region,
        codigo: lead.codigo_confirmacion,
        estado: lead.estado
      },
      vehiculo: consulta ? {
        tipo: consulta.tipo_vehiculo,
        medida: consulta.medida_neumatico,
        marca_preferida: consulta.marca_preferida
      } : null,
      pedido: pedido ? {
        producto: {
          marca: pedido.producto_elegido_marca,
          modelo: pedido.producto_elegido_modelo,
          medida: pedido.producto_elegido_medida,
          diseno: pedido.producto_elegido_diseno
        },
        precio_unitario: pedido.precio_unitario,
        precio_final: pedido.precio_final,
        cantidad: pedido.cantidad_total,
        forma_pago: pedido.forma_pago
      } : null,
      turno_existente: turnoExistente
    })

  } catch (error: any) {
    console.error('[por-codigo] Error:', error)
    return NextResponse.json({ 
      error: 'Error al buscar el código' 
    }, { status: 500 })
  }
}
