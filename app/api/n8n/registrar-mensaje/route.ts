import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * Endpoint para n8n - Registrar mensaje de WhatsApp
 * 
 * Input esperado:
 * {
 *   telefono_whatsapp: "+54 9 11 1234 5678",
 *   direccion: "entrante" | "saliente",
 *   contenido: "Mensaje del cliente o agente",
 *   enviado_por: "cliente" | "agente_llm" | "usuario_crm",
 *   mensaje_id_whatsapp: "wamid.xxx" (opcional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validar API Key
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== process.env.N8N_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      telefono_whatsapp, 
      direccion, 
      contenido, 
      enviado_por = 'cliente',
      mensaje_id_whatsapp 
    } = body

    console.log('[n8n-mensaje] 💬 Registrando mensaje:', { 
      telefono_whatsapp, 
      direccion,
      enviado_por 
    })

    // Validaciones
    if (!telefono_whatsapp || !direccion || !contenido) {
      return NextResponse.json({ 
        error: 'telefono_whatsapp, direccion y contenido son requeridos' 
      }, { status: 400 })
    }

    if (!['entrante', 'saliente'].includes(direccion)) {
      return NextResponse.json({ 
        error: 'direccion debe ser "entrante" o "saliente"' 
      }, { status: 400 })
    }

    // Obtener o crear lead
    const leadResult = await sql`
      SELECT get_or_create_lead(${telefono_whatsapp}) as lead_id
    `
    const lead_id = leadResult[0].lead_id

    // Registrar mensaje
    await sql`
      INSERT INTO lead_mensajes (
        lead_id,
        direccion,
        contenido,
        enviado_por,
        mensaje_id_whatsapp
      )
      VALUES (
        ${lead_id},
        ${direccion},
        ${contenido},
        ${enviado_por},
        ${mensaje_id_whatsapp || null}
      )
    `

    // Actualizar última interacción del lead
    await sql`
      UPDATE leads
      SET ultima_interaccion = NOW()
      WHERE id = ${lead_id}
    `

    console.log('[n8n-mensaje] ✅ Mensaje registrado')

    return NextResponse.json({
      success: true,
      lead_id,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[n8n-mensaje] ❌ Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Error interno del servidor' 
    }, { status: 500 })
  }
}

/**
 * GET - Obtener historial de mensajes de un lead
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== process.env.N8N_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const telefono = searchParams.get('telefono')
    const limit = searchParams.get('limit') || '50'

    if (!telefono) {
      return NextResponse.json({ 
        error: 'telefono query param es requerido' 
      }, { status: 400 })
    }

    // Buscar lead
    const lead = await sql`
      SELECT id FROM leads WHERE telefono_whatsapp = ${telefono}
    `

    if (lead.length === 0) {
      return NextResponse.json({ 
        exists: false,
        mensajes: []
      })
    }

    // Obtener mensajes
    const mensajes = await sql`
      SELECT 
        id,
        direccion,
        contenido,
        enviado_por,
        mensaje_id_whatsapp,
        created_at
      FROM lead_mensajes
      WHERE lead_id = ${lead[0].id}
      ORDER BY created_at DESC
      LIMIT ${Number.parseInt(limit)}
    `

    return NextResponse.json({
      exists: true,
      lead_id: lead[0].id,
      total_mensajes: mensajes.length,
      mensajes
    })

  } catch (error: any) {
    console.error('[n8n-mensaje] ❌ Error GET:', error)
    return NextResponse.json({ 
      error: error.message || 'Error interno del servidor' 
    }, { status: 500 })
  }
}
