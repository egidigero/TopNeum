import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * POST /api/turnos/crear-envio
 * 
 * Crea un registro de envío a domicilio con los datos completos del destinatario.
 * 
 * Body:
 * {
 *   codigo_confirmacion: string,
 *   datos_envio: {
 *     nombre_destinatario: string,
 *     dni: string,
 *     direccion: {
 *       calle: string,
 *       altura: string,
 *       piso_depto?: string,
 *       localidad: string,
 *       provincia: string,
 *       codigo_postal: string
 *     },
 *     email: string,
 *     telefono: string,
 *     observaciones?: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { codigo_confirmacion, datos_envio } = body

    // Validar campos requeridos
    if (!codigo_confirmacion) {
      return NextResponse.json(
        { error: "Código de confirmación requerido" },
        { status: 400 }
      )
    }

    if (!datos_envio || !datos_envio.nombre_destinatario || !datos_envio.dni || !datos_envio.direccion) {
      return NextResponse.json(
        { error: "Datos de envío incompletos" },
        { status: 400 }
      )
    }

    // Validar código y obtener lead
    const leads = await sql`
      SELECT id, nombre_cliente, telefono_whatsapp
      FROM leads
      WHERE codigo_confirmacion = ${codigo_confirmacion.toUpperCase()}
    `

    if (leads.length === 0) {
      return NextResponse.json(
        { error: "Código de confirmación inválido o no encontrado" },
        { status: 404 }
      )
    }

    const lead = leads[0]

    // Verificar si ya tiene un envío registrado
    const enviosExistentes = await sql`
      SELECT id 
      FROM turnos 
      WHERE lead_id = ${lead.id} AND tipo = 'envio'
    `

    if (enviosExistentes.length > 0) {
      return NextResponse.json(
        { 
          error: "Ya existe un envío registrado para este código",
          envio_id: String(enviosExistentes[0].id)
        },
        { status: 409 }
      )
    }

    // Crear registro de envío en tabla turnos
    const result = await sql`
      INSERT INTO turnos (
        codigo_confirmacion,
        lead_id,
        tipo,
        datos_envio,
        estado,
        estado_pago
      ) VALUES (
        ${codigo_confirmacion.toUpperCase()},
        ${lead.id},
        'envio',
        ${JSON.stringify(datos_envio)},
        'pendiente',
        'confirmado'
      )
      RETURNING id
    `

    const envio_id = result[0].id

    // Actualizar estado del lead a envio_registrado
    await sql`
      UPDATE leads 
      SET estado = 'envio_registrado'
      WHERE id = ${lead.id}
    `

    return NextResponse.json({
      success: true,
      envio_id: String(envio_id),
      message: "Envío registrado exitosamente",
      lead: {
        nombre: String(lead.nombre_cliente),
        telefono: String(lead.telefono_whatsapp)
      },
      datos_envio: {
        nombre_destinatario: datos_envio.nombre_destinatario,
        direccion_completa: `${datos_envio.direccion.calle} ${datos_envio.direccion.altura}${datos_envio.direccion.piso_depto ? `, ${datos_envio.direccion.piso_depto}` : ''}, ${datos_envio.direccion.localidad}, ${datos_envio.direccion.provincia} (${datos_envio.direccion.codigo_postal})`,
        email: datos_envio.email,
        telefono: datos_envio.telefono
      }
    })

  } catch (error: any) {
    console.error("Error al crear envío:", error)
    return NextResponse.json(
      { error: "Error al procesar el envío", details: error.message },
      { status: 500 }
    )
  }
}
