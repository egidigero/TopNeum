import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * POST /api/leads/actualizar
 * 
 * Tool para el agente n8n: Actualiza o crea lead por teléfono
 * Los campos se ACUMULAN (no sobrescriben), las notas se concatenan con timestamp
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[actualizar_estado] Body recibido:", JSON.stringify(body))
    
    const {
      telefono_whatsapp,
      nuevo_estado,
      nombre,
      tipo_vehiculo,
      medida_neumatico,
      marca_preferida,
      cantidad,
      producto_descripcion,
      forma_pago_detalle,
      precio_final,
      notas
    } = body

    // Validar teléfono (obligatorio)
    if (!telefono_whatsapp) {
      return NextResponse.json(
        { error: "telefono_whatsapp es requerido" },
        { status: 400 }
      )
    }

    // Normalizar teléfono
    let telefono = String(telefono_whatsapp).trim()
    
    // Agregar + si no lo tiene
    if (!telefono.startsWith('+')) {
      telefono = '+' + telefono
    }

    // Detectar región del teléfono
    // +5411 o +54911 = CABA (11 es código de Buenos Aires)
    // Otros = INTERIOR
    const region = (telefono.startsWith('+54911') || telefono.startsWith('+5411')) ? 'CABA' : 'INTERIOR'

    // Crear timestamp para las notas
    const now = new Date()
    const dia = String(now.getDate()).padStart(2, '0')
    const mes = String(now.getMonth() + 1).padStart(2, '0')
    const hora = String(now.getHours()).padStart(2, '0')
    const min = String(now.getMinutes()).padStart(2, '0')
    const timestamp = `${dia}/${mes} ${hora}:${min}`

    // Agregar timestamp a notas si existen
    const notaConTimestamp = notas ? `${timestamp} - ${notas}` : null

    console.log("[actualizar_estado] Actualizando lead:", { telefono, region, notaConTimestamp })

    // UPSERT: Insertar o actualizar
    const result = await sql`
      INSERT INTO leads (
        telefono_whatsapp,
        estado,
        nombre_cliente,
        tipo_vehiculo,
        medida_neumatico,
        marca_preferida,
        cantidad,
        producto_descripcion,
        forma_pago_detalle,
        precio_final,
        notas,
        region,
        origen,
        created_at,
        updated_at
      )
      VALUES (
        ${telefono},
        COALESCE(${nuevo_estado}, 'nuevo'),
        ${nombre},
        ${tipo_vehiculo},
        ${medida_neumatico},
        ${marca_preferida},
        ${cantidad},
        ${producto_descripcion},
        ${forma_pago_detalle},
        ${precio_final},
        ${notaConTimestamp},
        ${region},
        'n8n_agent',
        NOW(),
        NOW()
      )
      ON CONFLICT (telefono_whatsapp) 
      DO UPDATE SET
        -- Actualizar estado solo si se provee
        estado = COALESCE(${nuevo_estado}, leads.estado),
        
        -- Actualizar campos solo si se proveen (no sobrescribir con null)
        nombre_cliente = COALESCE(${nombre}, leads.nombre_cliente),
        tipo_vehiculo = COALESCE(${tipo_vehiculo}, leads.tipo_vehiculo),
        medida_neumatico = COALESCE(${medida_neumatico}, leads.medida_neumatico),
        marca_preferida = COALESCE(${marca_preferida}, leads.marca_preferida),
        cantidad = COALESCE(${cantidad}, leads.cantidad),
        producto_descripcion = COALESCE(${producto_descripcion}, leads.producto_descripcion),
        forma_pago_detalle = COALESCE(${forma_pago_detalle}, leads.forma_pago_detalle),
        precio_final = COALESCE(${precio_final}, leads.precio_final),
        
        -- APPEND notas (concatenar, no sobrescribir)
        notas = CASE 
          WHEN ${notaConTimestamp} IS NOT NULL THEN 
            CASE 
              WHEN leads.notas IS NULL OR leads.notas = '' THEN ${notaConTimestamp}
              ELSE leads.notas || E'\\n' || ${notaConTimestamp}
            END
          ELSE leads.notas
        END,
        
        -- Actualizar timestamp
        updated_at = NOW()
      
      RETURNING 
        id,
        telefono_whatsapp,
        estado,
        nombre_cliente,
        tipo_vehiculo,
        medida_neumatico,
        marca_preferida,
        cantidad,
        producto_descripcion,
        forma_pago_detalle,
        precio_final,
        notas,
        region,
        created_at,
        updated_at
    `

    const lead = result[0]

    console.log("[actualizar_estado] Lead actualizado:", lead.id)

    // Devolver el lead actualizado
    return NextResponse.json({
      success: true,
      lead_id: lead.id,
      telefono: lead.telefono_whatsapp,
      estado: lead.estado,
      nombre: lead.nombre_cliente,
      tipo_vehiculo: lead.tipo_vehiculo,
      medida_neumatico: lead.medida_neumatico,
      marca_preferida: lead.marca_preferida,
      cantidad: lead.cantidad,
      producto_descripcion: lead.producto_descripcion,
      forma_pago_detalle: lead.forma_pago_detalle,
      precio_final: lead.precio_final,
      notas: lead.notas,
      region: lead.region
    })

  } catch (error: any) {
    console.error("[actualizar_estado] Error:", error)
    return NextResponse.json(
      { error: error.message || "Error interno" },
      { status: 500 }
    )
  }
}
