import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * POST /api/leads/buscar
 * 
 * Busca un lead por teléfono y devuelve toda su información (para memoria del agente)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telefono_whatsapp } = body

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

    console.log("[buscar_lead] Buscando:", telefono)

    // Buscar lead
    const leads = await sql`
      SELECT 
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
        origen,
        created_at,
        updated_at
      FROM leads
      WHERE telefono_whatsapp = ${telefono}
      LIMIT 1
    `

    // Si no existe, devolver estructura vacía
    if (leads.length === 0) {
      return NextResponse.json({
        existe: false,
        lead: {
          telefono_whatsapp: telefono,
          estado: 'nuevo',
          nombre_cliente: null,
          tipo_vehiculo: null,
          medida_neumatico: null,
          marca_preferida: null,
          cantidad: null,
          producto_descripcion: null,
          forma_pago_detalle: null,
          precio_final: null,
          notas: null,
          region: (telefono.startsWith('+54911') || telefono.startsWith('+5411')) ? 'CABA' : 'INTERIOR'
        }
      })
    }

    const lead = leads[0]

    console.log("[buscar_lead] Lead encontrado:", lead.id)

    return NextResponse.json({
      existe: true,
      lead: {
        id: lead.id,
        telefono_whatsapp: lead.telefono_whatsapp,
        estado: lead.estado,
        nombre_cliente: lead.nombre_cliente,
        tipo_vehiculo: lead.tipo_vehiculo,
        medida_neumatico: lead.medida_neumatico,
        marca_preferida: lead.marca_preferida,
        cantidad: lead.cantidad,
        producto_descripcion: lead.producto_descripcion,
        forma_pago_detalle: lead.forma_pago_detalle,
        precio_final: lead.precio_final,
        notas: lead.notas,
        region: lead.region,
        created_at: lead.created_at,
        updated_at: lead.updated_at
      }
    })

  } catch (error: any) {
    console.error("[buscar_lead] Error:", error)
    return NextResponse.json(
      { error: error.message || "Error interno" },
      { status: 500 }
    )
  }
}
