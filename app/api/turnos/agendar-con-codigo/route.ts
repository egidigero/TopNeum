import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * POST /api/turnos/agendar-con-codigo
 * Endpoint público para agendar un turno usando código de confirmación
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { codigo, fecha, hora_inicio, hora_fin, tipo } = body

    if (!codigo || !fecha || !hora_inicio || !hora_fin || !tipo) {
      return NextResponse.json({ 
        error: 'Faltan datos requeridos' 
      }, { status: 400 })
    }

    // Normalizar código
    const codigoNormalizado = codigo.trim().toUpperCase()

    // Buscar lead por código
    const leadResult = await sql`
      SELECT 
        id,
        telefono_whatsapp,
        nombre_cliente,
        email,
        region
      FROM leads
      WHERE codigo_confirmacion = ${codigoNormalizado}
      LIMIT 1
    `

    if (leadResult.length === 0) {
      return NextResponse.json({ 
        error: 'Código no válido' 
      }, { status: 404 })
    }

    const lead = leadResult[0]

    // Obtener datos del vehículo
    const consultaResult = await sql`
      SELECT tipo_vehiculo, medida_neumatico
      FROM lead_consultas
      WHERE lead_id = ${lead.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    const consulta = consultaResult.length > 0 ? consultaResult[0] : {}

    // Obtener datos del pedido
    const pedidoResult = await sql`
      SELECT cantidad_total
      FROM lead_pedidos
      WHERE lead_id = ${lead.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    const pedido = pedidoResult.length > 0 ? pedidoResult[0] : {}

    // 🆕 Validar que el cliente no tenga otro turno activo
    const turnoExistenteResult = await sql`
      SELECT id, fecha, hora_inicio, estado_turno 
      FROM turnos
      WHERE lead_id = ${lead.id}
      AND estado_turno IN ('pendiente', 'confirmado')
      LIMIT 1
    `

    if (turnoExistenteResult.length > 0) {
      const turnoExistente = turnoExistenteResult[0]
      return NextResponse.json({ 
        error: `Ya tenés un turno agendado para el ${new Date(turnoExistente.fecha + 'T00:00:00').toLocaleDateString('es-AR')} a las ${turnoExistente.hora_inicio.substring(0, 5)}. Completá o cancelá ese turno antes de agendar uno nuevo.`,
        turno_existente: turnoExistente
      }, { status: 409 })
    }

    // Verificar disponibilidad del slot
    const conflictosResult = await sql`
      SELECT id FROM turnos
      WHERE fecha = ${fecha}
      AND hora_inicio = ${hora_inicio}
      AND estado != 'cancelado'
      LIMIT 1
    `

    if (conflictosResult.length > 0) {
      return NextResponse.json({ 
        error: 'Este horario ya no está disponible. Por favor elegí otro.' 
      }, { status: 409 })
    }

    // Crear turno
    const turnoResult = await sql`
      INSERT INTO turnos (
        lead_id,
        nombre_cliente,
        telefono,
        email,
        tipo,
        fecha,
        hora_inicio,
        hora_fin,
        marca_vehiculo,
        modelo_vehiculo,
        cantidad_neumaticos,
        estado,
        origen
      )
      VALUES (
        ${lead.id},
        ${lead.nombre_cliente || 'Cliente'},
        ${lead.telefono_whatsapp},
        ${lead.email || null},
        ${tipo},
        ${fecha},
        ${hora_inicio},
        ${hora_fin},
        ${consulta.tipo_vehiculo || null},
        ${consulta.tipo_vehiculo || null},
        ${pedido.cantidad_total || 4},
        'confirmado',
        'web_cliente'
      )
      RETURNING *
    `

    const turno = turnoResult[0]

    // Actualizar estado del lead
    await sql`
      UPDATE leads
      SET estado = 'turno_agendado'
      WHERE id = ${lead.id}
    `

    return NextResponse.json({
      success: true,
      turno: {
        id: turno.id,
        fecha: turno.fecha,
        hora_inicio: turno.hora_inicio,
        hora_fin: turno.hora_fin,
        tipo: turno.tipo
      },
      message: '¡Turno agendado exitosamente!'
    })

  } catch (error: any) {
    console.error('[agendar-con-codigo] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al agendar turno' 
    }, { status: 500 })
  }
}
