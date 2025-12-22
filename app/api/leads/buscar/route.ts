import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { productosATexto, type Producto } from "@/lib/productos"

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
        l.id,
        l.telefono_whatsapp,
        l.estado,
        l.nombre_cliente,
        l.notas,
        l.region,
        l.origen,
        l.created_at,
        l.updated_at
      FROM leads l
      WHERE l.telefono_whatsapp = ${telefono}
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
          notas: null,
          region: (telefono.startsWith('+54911') || telefono.startsWith('+5411')) ? 'CABA' : 'INTERIOR',
          consultas: [],
          pedidos: []
        }
      })
    }

    const lead = leads[0]
    console.log("[buscar_lead] Lead encontrado:", lead.id)

    // Traer TODAS las consultas recientes (últimos 30 días)
    const consultas = await sql`
      SELECT 
        id,
        tipo_vehiculo,
        medida_neumatico,
        marca_preferida,
        cantidad,
        created_at
      FROM lead_consultas
      WHERE lead_id = ${lead.id}
        AND created_at > NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
    `

    // Traer TODOS los pedidos activos (no cancelados)
    const pedidos = await sql`
      SELECT 
        p.id,
        p.cantidad_total,
        p.forma_pago_detalle,
        p.precio_final,
        p.producto_descripcion,
        p.estado_pago,
        p.created_at
      FROM lead_pedidos p
      WHERE p.lead_id = ${lead.id}
        AND p.estado_pago != 'cancelado'
      ORDER BY p.created_at DESC
    `

    // Para cada pedido, traer sus items validados
    const pedidosConItems = await Promise.all(
      pedidos.map(async (p) => {
        const items = await sql`
          SELECT 
            pi.producto_sku as sku,
            pi.cantidad,
            pi.precio_unitario,
            pi.subtotal,
            pr.marca,
            pr.familia,
            pr.medida,
            pr.indice
          FROM pedido_items pi
          JOIN products pr ON pr.sku = pi.producto_sku
          WHERE pi.pedido_id = ${p.id}
          ORDER BY pi.created_at
        `
        
        return {
          id: p.id,
          items: items.map(i => ({
            sku: i.sku,
            descripcion: `${i.marca} ${i.familia} ${i.medida} ${i.indice || ''}`.trim(),
            cantidad: i.cantidad,
            precio_unitario: i.precio_unitario,
            subtotal: i.subtotal
          })),
          producto_texto: p.producto_descripcion,
          cantidad: p.cantidad_total,
          forma_pago: p.forma_pago_detalle,
          precio: p.precio_final,
          estado_pago: p.estado_pago,
          fecha: p.created_at
        }
      })
    )

    return NextResponse.json({
      existe: true,
      lead: {
        id: lead.id,
        telefono_whatsapp: lead.telefono_whatsapp,
        estado: lead.estado,
        nombre_cliente: lead.nombre_cliente,
        notas: lead.notas,
        region: lead.region,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        consultas: consultas.map(c => ({
          id: c.id,
          tipo_vehiculo: c.tipo_vehiculo,
          medida: c.medida_neumatico,
          marca_preferida: c.marca_preferida,
          cantidad: c.cantidad,
          fecha: c.created_at
        })),
        pedidos: pedidosConItems
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
