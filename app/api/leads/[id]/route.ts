import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()

    const body = await request.json()
    
    console.log('[PATCH /api/leads/[id]] Body:', body)
    
    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }

    const { id: leadId } = await params
    
    console.log('[PATCH /api/leads/[id]] Lead ID:', leadId)

    // Ejecutar UPDATE según los campos recibidos
    let result: any[]
    
    // Caso más común: actualizar estado con timestamp
    if (body.estado !== undefined && body.ultimo_contacto_at !== undefined) {
      console.log('[PATCH] Actualizando estado + timestamp')
      result = await sql`
        UPDATE leads 
        SET estado = ${body.estado}, 
            ultima_interaccion = ${body.ultimo_contacto_at},
            updated_at = NOW()
        WHERE id = ${leadId}
        RETURNING *
      `
    } 
    // Solo estado
    else if (body.estado !== undefined) {
      console.log('[PATCH] Actualizando solo estado')
      result = await sql`
        UPDATE leads 
        SET estado = ${body.estado}, updated_at = NOW()
        WHERE id = ${leadId}
        RETURNING *
      `
    } 
    // Solo notas
    else if (body.notas !== undefined) {
      console.log('[PATCH] Actualizando solo notas')
      result = await sql`
        UPDATE leads 
        SET notas = ${body.notas}, updated_at = NOW()
        WHERE id = ${leadId}
        RETURNING *
      `
    } 
    // Email
    else if (body.email !== undefined) {
      result = await sql`
        UPDATE leads 
        SET email = ${body.email}, updated_at = NOW()
        WHERE id = ${leadId}
        RETURNING *
      `
    }
    // DNI
    else if (body.dni !== undefined) {
      result = await sql`
        UPDATE leads 
        SET dni = ${body.dni}, updated_at = NOW()
        WHERE id = ${leadId}
        RETURNING *
      `
    }
    // Dirección
    else if (body.direccion !== undefined) {
      result = await sql`
        UPDATE leads 
        SET direccion = ${body.direccion}, updated_at = NOW()
        WHERE id = ${leadId}
        RETURNING *
      `
    }
    // Localidad
    else if (body.localidad !== undefined) {
      result = await sql`
        UPDATE leads 
        SET localidad = ${body.localidad}, updated_at = NOW()
        WHERE id = ${leadId}
        RETURNING *
      `
    }
    // Provincia
    else if (body.provincia !== undefined) {
      result = await sql`
        UPDATE leads 
        SET provincia = ${body.provincia}, updated_at = NOW()
        WHERE id = ${leadId}
        RETURNING *
      `
    }
    // Código postal
    else if (body.codigo_postal !== undefined) {
      result = await sql`
        UPDATE leads 
        SET codigo_postal = ${body.codigo_postal}, updated_at = NOW()
        WHERE id = ${leadId}
        RETURNING *
      `
    }
    // Timestamp solo
    else if (body.ultimo_contacto_at !== undefined) {
      result = await sql`
        UPDATE leads 
        SET ultima_interaccion = ${body.ultimo_contacto_at}, updated_at = NOW()
        WHERE id = ${leadId}
        RETURNING *
      `
    }
    // Fallback
    else {
      result = await sql`SELECT * FROM leads WHERE id = ${leadId}`
    }

    console.log('[PATCH] Resultado:', result.length > 0 ? 'OK' : 'NO ENCONTRADO')
    
    if (result.length === 0) {
      return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 })
    }
    
    console.log('[PATCH] Lead actualizado:', result[0].id, 'Estado:', result[0].estado)

    // 🆕 Si cambia a 'pedido_confirmado', crear/actualizar registro en lead_pedidos
    if (body.estado === 'pedido_confirmado') {
      // Obtener datos del lead y pedido existente
      const lead = result[0]
      
      // Verificar si ya existe un pedido
      const pedidoExistente = await sql`
        SELECT * FROM lead_pedidos 
        WHERE lead_id = ${leadId}
        ORDER BY created_at DESC
        LIMIT 1
      `

      if (pedidoExistente.length === 0) {
        // Obtener datos de la última consulta para crear el pedido
        const ultimaConsulta = await sql`
          SELECT medida_neumatico, marca_preferida, tipo_vehiculo
          FROM lead_consultas
          WHERE lead_id = ${leadId}
          ORDER BY created_at DESC
          LIMIT 1
        `

        const consulta = ultimaConsulta.length > 0 ? ultimaConsulta[0] : {}

        // Crear nuevo pedido básico con los datos disponibles
        await sql`
          INSERT INTO lead_pedidos (
            lead_id,
            productos,
            cantidad_total,
            producto_descripcion,
            forma_pago,
            forma_pago_detalle,
            subtotal,
            total,
            precio_final,
            estado_pago,
            created_at
          ) VALUES (
            ${leadId},
            ${JSON.stringify([{ medida: consulta.medida_neumatico || 'Sin especificar' }])},
            4,
            ${consulta.medida_neumatico || 'Producto sin especificar'},
            'efectivo',
            'A confirmar método de pago',
            0,
            0,
            0,
            'confirmado',
            NOW()
          )
        `
      } else {
        // Actualizar estado del pedido existente
        await sql`
          UPDATE lead_pedidos
          SET 
            estado_pago = 'pagado', 
            fecha_pago = COALESCE(fecha_pago, NOW())
          WHERE lead_id = ${leadId}
        `
      }
    }

    return NextResponse.json({ lead: result[0] })
  } catch (error: any) {
    console.error("[v0] Update lead error:", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()

    const { id } = await params

    // Eliminar en orden (por las foreign keys)
    // Usar try-catch para cada tabla por si no existe
    try {
      await sql`DELETE FROM lead_entregas WHERE lead_id = ${id}`
    } catch (e) {}
    
    try {
      await sql`DELETE FROM lead_pedidos WHERE lead_id = ${id}`
    } catch (e) {}
    
    try {
      await sql`DELETE FROM lead_cotizaciones WHERE lead_id = ${id}`
    } catch (e) {}
    
    try {
      await sql`DELETE FROM lead_consultas WHERE lead_id = ${id}`
    } catch (e) {}
    
    try {
      await sql`DELETE FROM lead_historial WHERE lead_id = ${id}`
    } catch (e) {}
    
    // 6. Finalmente el lead
    await sql`DELETE FROM leads WHERE id = ${id}`

    return NextResponse.json({ success: true, message: "Lead eliminado correctamente" })
  } catch (error: any) {
    console.error("[v0] Delete lead error:", error)
    return NextResponse.json({ error: error.message || "Error al eliminar lead" }, { status: 500 })
  }
}
