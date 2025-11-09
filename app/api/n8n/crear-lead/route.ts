import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

// Endpoint para n8n - Crear lead desde WhatsApp
export async function POST(request: NextRequest) {
  try {
    // Validar API Key
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== process.env.N8N_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      nombre, 
      telefono, 
      mensaje_inicial,
      medida_solicitada,
      vehiculo,
      marca_preferida,
      canal = 'whatsapp',
      origen = 'n8n_automation'
    } = body

    // Validaciones
    if (!telefono) {
      return NextResponse.json({ 
        error: 'Teléfono es requerido' 
      }, { status: 400 })
    }

    // Verificar si ya existe un lead con este teléfono
    const leadExistente = await sql`
      SELECT id, nombre, telefono, estado, created_at
      FROM leads_whatsapp
      WHERE telefono = ${telefono}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (leadExistente.length > 0) {
      const lead = leadExistente[0]
      
      // Actualizar el lead existente con nueva info
      await sql`
        UPDATE leads_whatsapp
        SET 
          notas = COALESCE(notas, '') || ${'\n---\n' + new Date().toISOString() + ' - Nueva consulta via n8n:\n' + (mensaje_inicial || '')},
          ultima_interaccion = NOW(),
          updated_at = NOW()
        WHERE id = ${lead.id}
      `

      return NextResponse.json({
        success: true,
        lead_existente: true,
        lead: {
          id: lead.id,
          nombre: lead.nombre,
          telefono: lead.telefono,
          estado: lead.estado,
          mensaje: 'Lead actualizado con nueva consulta'
        }
      })
    }

    // Crear nuevo lead
    const nuevoLead = await sql`
      INSERT INTO leads_whatsapp (
        nombre,
        telefono,
        canal,
        estado,
        interes,
        notas,
        origen,
        ultima_interaccion,
        created_at,
        updated_at
      )
      VALUES (
        ${nombre || 'Cliente WhatsApp'},
        ${telefono},
        ${canal},
        'nuevo',
        ${construirInteres(medida_solicitada, vehiculo, marca_preferida)},
        ${construirNotas(mensaje_inicial, medida_solicitada, vehiculo, marca_preferida)},
        ${origen},
        NOW(),
        NOW(),
        NOW()
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      lead_existente: false,
      lead: {
        id: nuevoLead[0].id,
        nombre: nuevoLead[0].nombre,
        telefono: nuevoLead[0].telefono,
        estado: nuevoLead[0].estado,
        interes: nuevoLead[0].interes,
        mensaje: 'Lead creado exitosamente'
      }
    })

  } catch (error: any) {
    console.error('Error creando lead:', error)
    return NextResponse.json({ 
      error: error.message || 'Error interno del servidor' 
    }, { status: 500 })
  }
}

// Helper functions
function construirInteres(medida?: string, vehiculo?: string, marca?: string): string {
  const partes = []
  if (medida) partes.push(`Medida: ${medida}`)
  if (vehiculo) partes.push(`Vehículo: ${vehiculo}`)
  if (marca) partes.push(`Marca: ${marca}`)
  return partes.length > 0 ? partes.join(' | ') : 'Consulta general'
}

function construirNotas(mensaje?: string, medida?: string, vehiculo?: string, marca?: string): string {
  let notas = `🤖 Lead creado automáticamente via n8n\n`
  notas += `📅 ${new Date().toLocaleString('es-AR')}\n\n`
  
  if (mensaje) {
    notas += `💬 Mensaje inicial:\n${mensaje}\n\n`
  }
  
  if (medida || vehiculo || marca) {
    notas += `🔍 Búsqueda solicitada:\n`
    if (medida) notas += `  • Medida: ${medida}\n`
    if (vehiculo) notas += `  • Vehículo: ${vehiculo}\n`
    if (marca) notas += `  • Marca preferida: ${marca}\n`
  }
  
  return notas
}

// GET endpoint para documentación
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/n8n/crear-lead',
    method: 'POST',
    descripcion: 'Crea un lead desde WhatsApp (o actualiza si ya existe por teléfono)',
    headers: {
      'x-api-key': 'REQUIRED - Tu API key de n8n',
      'Content-Type': 'application/json'
    },
    body: {
      nombre: 'OPTIONAL - Nombre del cliente',
      telefono: 'REQUIRED - Teléfono del cliente',
      mensaje_inicial: 'OPTIONAL - Primer mensaje del cliente',
      medida_solicitada: 'OPTIONAL - Medida consultada',
      vehiculo: 'OPTIONAL - Tipo de vehículo',
      marca_preferida: 'OPTIONAL - Marca preferida',
      canal: 'OPTIONAL - Default: whatsapp',
      origen: 'OPTIONAL - Default: n8n_automation'
    },
    ejemplo: {
      nombre: 'Juan Pérez',
      telefono: '+5491123456789',
      mensaje_inicial: 'Hola, necesito 205/55R16',
      medida_solicitada: '205/55R16',
      vehiculo: 'auto',
      marca_preferida: 'Michelin'
    }
  })
}
