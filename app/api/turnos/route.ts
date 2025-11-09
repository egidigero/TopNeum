import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

// GET - Obtener turnos con filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get("fecha")
    const tipo = searchParams.get("tipo")
    const estado = searchParams.get("estado")

    let query = sql`
      SELECT 
        id,
        nombre_cliente,
        telefono,
        email,
        pedido_id,
        tipo,
        TO_CHAR(fecha, 'YYYY-MM-DD') as fecha,
        TO_CHAR(hora_inicio, 'HH24:MI:SS') as hora_inicio,
        TO_CHAR(hora_fin, 'HH24:MI:SS') as hora_fin,
        marca_vehiculo,
        modelo_vehiculo,
        patente,
        cantidad_neumaticos,
        observaciones,
        estado,
        origen,
        created_at,
        updated_at
      FROM turnos
      WHERE 1=1
    `

    if (fecha) {
      query = sql`${query} AND fecha = ${fecha}`
    }
    if (tipo) {
      query = sql`${query} AND tipo = ${tipo}`
    }
    if (estado) {
      query = sql`${query} AND estado = ${estado}`
    }

    query = sql`${query} ORDER BY fecha DESC, hora_inicio ASC`

    const turnosRaw = await query

    // Convertir tipos explícitamente
    const turnos = turnosRaw.map((t: any) => ({
      id: String(t.id),
      nombre_cliente: String(t.nombre_cliente || ''),
      telefono: String(t.telefono || ''),
      email: t.email || null,
      pedido_id: t.pedido_id || null,
      tipo: String(t.tipo),
      fecha: String(t.fecha),
      hora_inicio: String(t.hora_inicio),
      hora_fin: String(t.hora_fin),
      marca_vehiculo: t.marca_vehiculo || null,
      modelo_vehiculo: t.modelo_vehiculo || null,
      patente: t.patente || null,
      cantidad_neumaticos: Number(t.cantidad_neumaticos || 4),
      observaciones: t.observaciones || null,
      estado: String(t.estado || 'pendiente'),
      origen: String(t.origen || 'manual'),
      created_at: t.created_at,
      updated_at: t.updated_at,
    }))

    console.log('🔍 API Turnos GET - Total turnos:', turnos.length)
    if (turnos.length > 0) {
      console.log('🔍 Ejemplo de turno:', {
        fecha: turnos[0].fecha,
        tipo_fecha: typeof turnos[0].fecha,
        nombre: turnos[0].nombre_cliente,
      })
    }

    return NextResponse.json(turnos)
  } catch (error: any) {
    console.error("Error fetching turnos:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Crear nuevo turno
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      nombre_cliente,
      telefono,
      email,
      tipo,
      fecha,
      hora_inicio,
      hora_fin,
      marca_vehiculo,
      modelo_vehiculo,
      patente,
      cantidad_neumaticos,
      observaciones,
      origen = "manual",
      pedido_id,
    } = body

    // Validar campos requeridos
    if (!nombre_cliente || !telefono || !tipo || !fecha || !hora_inicio || !hora_fin) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: nombre_cliente, telefono, tipo, fecha, hora_inicio, hora_fin" },
        { status: 400 }
      )
    }

    // Verificar disponibilidad del slot
    const existente = await sql`
      SELECT id FROM turnos
      WHERE fecha = ${fecha}
        AND tipo = ${tipo}
        AND hora_inicio = ${hora_inicio}
        AND estado != 'cancelado'
    `

    if (existente.length > 0) {
      return NextResponse.json(
        { error: "Este horario ya está ocupado" },
        { status: 409 }
      )
    }

    // Insertar turno
    const turno = await sql`
      INSERT INTO turnos (
        nombre_cliente,
        telefono,
        email,
        tipo,
        fecha,
        hora_inicio,
        hora_fin,
        marca_vehiculo,
        modelo_vehiculo,
        patente,
        cantidad_neumaticos,
        observaciones,
        origen,
        pedido_id,
        estado
      ) VALUES (
        ${nombre_cliente},
        ${telefono},
        ${email || null},
        ${tipo},
        ${fecha},
        ${hora_inicio},
        ${hora_fin},
        ${marca_vehiculo || null},
        ${modelo_vehiculo || null},
        ${patente || null},
        ${cantidad_neumaticos || 4},
        ${observaciones || null},
        ${origen},
        ${pedido_id || null},
        'pendiente'
      )
      RETURNING *
    `

    return NextResponse.json(turno[0], { status: 201 })
  } catch (error: any) {
    console.error("Error creating turno:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
