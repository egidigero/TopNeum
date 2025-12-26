import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()

    const body = await request.json()
    
    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }

    const { id: leadId } = await params
    
    // Construir UPDATE dinámico con todos los campos a actualizar
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (body.estado !== undefined) {
      updates.push(`estado = $${paramIndex++}`)
      values.push(body.estado)
    }
    
    if (body.notas !== undefined) {
      updates.push(`notas = $${paramIndex++}`)
      values.push(body.notas)
    }
    
    if (body.email !== undefined) {
      updates.push(`email = $${paramIndex++}`)
      values.push(body.email)
    }
    
    if (body.dni !== undefined) {
      updates.push(`dni = $${paramIndex++}`)
      values.push(body.dni)
    }
    
    if (body.direccion !== undefined) {
      updates.push(`direccion = $${paramIndex++}`)
      values.push(body.direccion)
    }
    
    if (body.localidad !== undefined) {
      updates.push(`localidad = $${paramIndex++}`)
      values.push(body.localidad)
    }
    
    if (body.provincia !== undefined) {
      updates.push(`provincia = $${paramIndex++}`)
      values.push(body.provincia)
    }
    
    if (body.codigo_postal !== undefined) {
      updates.push(`codigo_postal = $${paramIndex++}`)
      values.push(body.codigo_postal)
    }
    
    if (body.ultimo_contacto_at !== undefined) {
      updates.push(`ultima_interaccion = $${paramIndex++}`)
      values.push(body.ultimo_contacto_at)
    }

    // Ejecutar UPDATE con campos dinámicos
    let result: any[]
    
    if (updates.length === 0) {
      // Solo obtener el lead actual si no hay updates
      result = await sql`SELECT * FROM leads WHERE id = ${leadId}`
    } else {
      // Construir query manualmente
      const setClauses = updates.map((_, idx) => {
        if (idx < values.length) {
          return updates[idx]
        }
        return 'updated_at = NOW()'
      }).filter((clause, idx) => idx < updates.length || clause.includes('updated_at'))
      
      // Ejecutar con postgres.js usando template strings
      if (body.estado !== undefined && body.ultimo_contacto_at !== undefined) {
        result = await sql`
          UPDATE leads 
          SET estado = ${body.estado}, 
              ultima_interaccion = ${body.ultimo_contacto_at},
              updated_at = NOW()
          WHERE id = ${leadId}
          RETURNING *
        `
      } else if (body.estado !== undefined) {
        result = await sql`
          UPDATE leads 
          SET estado = ${body.estado}, updated_at = NOW()
          WHERE id = ${leadId}
          RETURNING *
        `
      } else if (body.notas !== undefined) {
        result = await sql`
          UPDATE leads 
          SET notas = ${body.notas}, updated_at = NOW()
          WHERE id = ${leadId}
          RETURNING *
        `
      } else if (body.email !== undefined) {
        result = await sql`
          UPDATE leads 
          SET email = ${body.email}, updated_at = NOW()
          WHERE id = ${leadId}
          RETURNING *
        `
      } else if (body.ultimo_contacto_at !== undefined) {
        result = await sql`
          UPDATE leads 
          SET ultima_interaccion = ${body.ultimo_contacto_at}, updated_at = NOW()
          WHERE id = ${leadId}
          RETURNING *
        `
      } else {
        // Fallback para otros campos
        result = await sql`SELECT * FROM leads WHERE id = ${leadId}`
      }
    }

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
            estado_pago = 'confirmado', 
            updated_at = NOW(),
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
