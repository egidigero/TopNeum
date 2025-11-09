import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * GET /api/turnos/buscar-por-codigo?codigo=A3X7K9
 * 
 * Busca un lead por su código de confirmación para precargar datos en el formulario de agendamiento.
 * 
 * Query params:
 * - codigo: Código de confirmación de 6 caracteres (ej: A3X7K9)
 * 
 * Response:
 * - exists: boolean - Si el código existe
 * - lead: objeto con datos del lead (si existe)
 * - turno_existente: objeto con datos del turno (si ya agendó)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const codigo = searchParams.get("codigo")?.toUpperCase()

    if (!codigo) {
      return NextResponse.json(
        { error: "Código de confirmación requerido" },
        { status: 400 }
      )
    }

    // Validar formato: 6 caracteres alfanuméricos
    if (!/^[A-Z0-9]{6}$/.test(codigo)) {
      return NextResponse.json(
        { error: "Código inválido. Debe tener 6 caracteres alfanuméricos" },
        { status: 400 }
      )
    }

    // Buscar lead por código
    const leads = await sql`
      SELECT 
        id,
        codigo_confirmacion,
        nombre_cliente,
        telefono_whatsapp,
        region,
        estado
      FROM leads
      WHERE codigo_confirmacion = ${codigo}
    `

    if (leads.length === 0) {
      return NextResponse.json({
        exists: false,
        message: "Código no encontrado. Verificá que lo hayas copiado correctamente."
      })
    }

    const lead = leads[0]

    // Buscar si ya tiene turno agendado
    const turnos = await sql`
      SELECT 
        id,
        fecha,
        hora_inicio,
        tipo,
        estado,
        estado_pago,
        observaciones
      FROM turnos
      WHERE lead_id = ${lead.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    const turno_existente = turnos.length > 0 ? {
      id: String(turnos[0].id),
      fecha: String(turnos[0].fecha),
      hora_inicio: String(turnos[0].hora_inicio),
      tipo: String(turnos[0].tipo),
      estado: String(turnos[0].estado),
      estado_pago: String(turnos[0].estado_pago || 'pendiente'),
      observaciones: turnos[0].observaciones || null
    } : null

    // Determinar tipo de entrega
    // Si el estado es turno_pendiente o turno_agendado, consultar última cotización/pedido
    let tipo_entrega = null
    
    // Buscar en cotizaciones primero (más reciente)
    const cotizaciones = await sql`
      SELECT datos_adicionales
      FROM lead_cotizaciones
      WHERE lead_id = ${lead.id}
        AND datos_adicionales IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (cotizaciones.length > 0 && cotizaciones[0].datos_adicionales?.tipo_entrega) {
      tipo_entrega = cotizaciones[0].datos_adicionales.tipo_entrega
    }

    // Si no hay en cotizaciones, buscar en pedidos
    if (!tipo_entrega) {
      const pedidos = await sql`
        SELECT datos_adicionales
        FROM lead_pedidos
        WHERE lead_id = ${lead.id}
          AND datos_adicionales IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
      `

      if (pedidos.length > 0 && pedidos[0].datos_adicionales?.tipo_entrega) {
        tipo_entrega = pedidos[0].datos_adicionales.tipo_entrega
      }
    }

    // Si ya existe turno, usar el tipo del turno
    if (turno_existente) {
      tipo_entrega = turno_existente.tipo
    }

    return NextResponse.json({
      exists: true,
      lead: {
        id: String(lead.id),
        codigo_confirmacion: String(lead.codigo_confirmacion),
        nombre_cliente: String(lead.nombre_cliente || 'Sin nombre'),
        telefono_whatsapp: String(lead.telefono_whatsapp),
        region: String(lead.region),
        tipo_entrega: tipo_entrega, // 'retiro', 'colocacion', 'envio', o null
        estado: String(lead.estado)
      },
      turno_existente
    })

  } catch (error: any) {
    console.error("Error al buscar lead por código:", error)
    return NextResponse.json(
      { error: "Error al buscar código", details: error.message },
      { status: 500 }
    )
  }
}
