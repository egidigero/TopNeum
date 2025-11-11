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
        t.id,
        t.lead_id,
        t.nombre_cliente,
        t.telefono,
        t.email,
        t.pedido_id,
        t.tipo,
        TO_CHAR(t.fecha, 'YYYY-MM-DD') as fecha,
        TO_CHAR(t.hora_inicio, 'HH24:MI:SS') as hora_inicio,
        TO_CHAR(t.hora_fin, 'HH24:MI:SS') as hora_fin,
        t.marca_vehiculo,
        t.modelo_vehiculo,
        t.patente,
        t.cantidad_neumaticos,
        t.observaciones,
        t.estado,
        t.origen,
        t.created_at,
        t.updated_at,
        p.producto_elegido_marca,
        p.producto_elegido_modelo,
        p.producto_elegido_medida,
        p.producto_elegido_diseno,
        p.precio_unitario,
        p.precio_final
      FROM turnos t
      LEFT JOIN lead_pedidos p ON t.lead_id = p.lead_id
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
      lead_id: t.lead_id || null,
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
      // Datos del producto (si existen)
      producto: t.producto_elegido_marca ? {
        marca: t.producto_elegido_marca,
        modelo: t.producto_elegido_modelo,
        medida: t.producto_elegido_medida,
        diseno: t.producto_elegido_diseno,
        precio_unitario: t.precio_unitario,
        precio_final: t.precio_final
      } : null
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
