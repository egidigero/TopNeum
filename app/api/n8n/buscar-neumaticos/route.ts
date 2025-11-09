import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * Endpoint para n8n - Búsqueda de neumáticos
 * Recibe JSON normalizado del Agente LLM de n8n
 * 
 * Input esperado:
 * {
 *   telefono_whatsapp: "+54 9 11 1234 5678",
 *   medida_neumatico: "205/55R16",
 *   marca: "MICHELIN",
 *   region: "CABA" | "INTERIOR",
 *   tipo_consulta: "cotizacion" | "consulta_precio" | "consulta_stock"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validar API Key
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== process.env.N8N_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse del JSON del agente
    const body = await request.json()
    const { telefono_whatsapp, medida_neumatico, marca, region, tipo_consulta } = body

    console.log('[n8n] 📥 Recibido del agente:', { 
      telefono_whatsapp, 
      medida_neumatico, 
      marca, 
      region,
      tipo_consulta 
    })

    // Validar región
    const regionValida = region === 'CABA' || region === 'INTERIOR'
    if (!regionValida && medida_neumatico) {
      return NextResponse.json({ 
        error: 'Región inválida. Debe ser "CABA" o "INTERIOR"' 
      }, { status: 400 })
    }

    // 3. Si es consulta general (sin medida), devolver mensaje genérico
    if (!medida_neumatico || tipo_consulta === 'consulta_general') {
      return NextResponse.json({
        productos: [],
        mensaje: generarRespuestaGeneral(tipo_consulta || 'default'),
        cantidad: 0,
        tipo: 'info_general'
      })
    }

    // 4. Preparar medida para búsqueda (normalizar quitando separadores)
    const medidaSinSeparadores = medida_neumatico
      .replace(/\//g, '')
      .replace(/\-/g, '')
      .replace(/\s/g, '')
      .toUpperCase()

    console.log('[n8n] 🔍 Buscando:', medidaSinSeparadores, marca ? `marca: ${marca}` : '')

    // 5. Buscar en la base de datos
    const productos = await sql`
      SELECT 
        marca,
        familia,
        diseno,
        medida,
        indice,
        cuota_3,
        cuota_6,
        cuota_12,
        efectivo_bsas_sin_iva,
        efectivo_int_sin_iva,
        stock,
        sku
      FROM products
      WHERE 
        -- Comparar medidas sin separadores (normalización en SQL)
        REPLACE(REPLACE(REPLACE(UPPER(medida), '/', ''), '-', ''), ' ', '') = ${medidaSinSeparadores}
        -- Filtro por marca si viene del agente
        AND (${marca}::text IS NULL OR UPPER(marca) = UPPER(${marca}))
        -- Solo con stock
        AND stock IS NOT NULL
        AND stock != ''
      ORDER BY 
        -- Prioridad si marca especificada
        CASE 
          WHEN ${marca}::text IS NOT NULL AND UPPER(marca) = UPPER(${marca}) THEN 1
          ELSE 2
        END,
        -- Marcas premium primero
        CASE UPPER(marca)
          WHEN 'MICHELIN' THEN 1
          WHEN 'BRIDGESTONE' THEN 2
          WHEN 'PIRELLI' THEN 3
          WHEN 'GOODYEAR' THEN 4
          WHEN 'YOKOHAMA' THEN 5
          WHEN 'HANKOOK' THEN 6
          WHEN 'CONTINENTAL' THEN 7
          ELSE 8
        END,
        -- Por precio (variedad)
        cuota_3 ASC NULLS LAST
      LIMIT 20
    `

    console.log(`[n8n] 📊 Encontrados: ${productos.length} productos`)

    // 6. Si no hay resultados
    if (productos.length === 0) {
      return NextResponse.json({
        productos: [],
        mensaje: `❌ No encontramos neumáticos *${medida_neumatico}*${marca ? ` de marca *${marca}*` : ''}.\n\n` +
                 `¿Querés que te ayudemos a buscar otra medida? 🔍`,
        cantidad: 0,
        medida_buscada: medida_neumatico,
        marca_buscada: marca
      })
    }

    // 7. Formatear respuesta según tipo de consulta
    const mensaje = formatearRespuesta(
      productos, 
      medida_neumatico, 
      tipo_consulta || 'busqueda_general',
      region || 'CABA' // Default CABA si no viene especificada
    )

    return NextResponse.json({
      productos,
      mensaje,
      cantidad: productos.length,
      medida_buscada: medida_neumatico,
      marca_buscada: marca,
      region: region,
      tipo: tipo_consulta
    })

  } catch (error: any) {
    console.error('[n8n] ❌ Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Error interno del servidor' 
    }, { status: 500 })
  }
}

// GET endpoint para documentación
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/n8n/buscar-neumaticos',
    method: 'POST',
    descripcion: 'Busca neumáticos y devuelve mensaje formateado para WhatsApp',
    auth: {
      header: 'x-api-key',
      value: 'Ver N8N_API_KEY en .env.local'
    },
    body_esperado: {
      medida_neumatico: 'REQUIRED - "205/55R16" (ya normalizado por el agente)',
      marca: 'OPTIONAL - "MICHELIN" (si el agente lo identificó)',
      tipo_consulta: 'OPTIONAL - "consulta_precio" | "consulta_stock" | "busqueda_general"'
    },
    ejemplo_request: {
      medida_neumatico: '205/55R16',
      marca: 'MICHELIN',
      tipo_consulta: 'busqueda_general'
    },
    ejemplo_response: {
      productos: [],
      mensaje: '(Mensaje formateado para WhatsApp con Markdown)',
      cantidad: 5,
      medida_buscada: '205/55R16',
      marca_buscada: 'MICHELIN',
      tipo: 'busqueda_general'
    }
  })
}

// ============================================
// HELPERS
// ============================================

/**
 * Generar respuesta para consultas generales (sin medida específica)
 */
function generarRespuestaGeneral(tipo: string): string {
  const respuestas = {
    consulta_general: 
      `¡Hola! 👋 Soy el asistente de *TopNeum*.\n\n` +
      `Para ayudarte mejor, necesito que me digas qué medida de neumático necesitás.\n\n` +
      `*Ejemplos:*\n` +
      `• "205/55R16"\n` +
      `• "185 70 14"\n` +
      `• "31X10.50R15"\n\n` +
      `También podés preguntarme por marca específica, por ejemplo:\n` +
      `"205/55R16 Michelin" 🔍`,
    
    default:
      `¡Hola! 😊 Bienvenido a *TopNeum*\n\n` +
      `✅ *Envío gratis* a todo el país (llevando 2 o más)\n` +
      `💳 Aceptamos todas las tarjetas - hasta *12 cuotas*\n` +
      `🛡️ *5 años* de garantía oficial\n` +
      `📦 Entrega rápida\n` +
      `🔧 Colocación BONIFICADA (llevando 4)\n\n` +
      `¿Qué medida de neumático necesitás?`
  }
  
  return respuestas[tipo as keyof typeof respuestas] || respuestas.default
}

/**
 * Formatear respuesta con productos según tipo de consulta y región
 * 
 * NOTA: Por defecto solo muestra CONTADO y 3 CUOTAS
 * Los precios de 6 y 12 cuotas están disponibles en el objeto productos (p.cuota_6, p.cuota_12)
 * pero el agente solo debe mencionarlos si el cliente pregunta explícitamente
 */
function formatearRespuesta(productos: any[], medidaBuscada: string, tipoConsulta: string, region: string): string {
  // Intro según tipo de consulta
  const intro = tipoConsulta === 'consulta_precio' 
    ? `💰 *Precios para ${medidaBuscada}*:\n\n`
    : tipoConsulta === 'consulta_stock'
    ? `📦 *Stock disponible de ${medidaBuscada}*:\n\n`
    : `🔍 *Encontramos ${productos.length} ${productos.length === 1 ? 'opción' : 'opciones'} para ${medidaBuscada}*:\n\n`
  
  let mensaje = intro
  mensaje += '━━━━━━━━━━━━━━━━━\n\n'

  // Listar productos
  productos.forEach((p, index) => {
    // Título del producto
    const titulo = `${p.medida}${p.indice ? ' ' + p.indice : ''} ${p.marca} ${p.diseno || ''}`.trim()
    mensaje += `*${index + 1}. ${titulo}*\n`
    
    // Precio contado según región (SIEMPRE PRIMERO - Es el mejor precio)
    const precioContado = region === 'CABA' 
      ? p.efectivo_bsas_sin_iva 
      : p.efectivo_int_sin_iva
    
    if (precioContado) {
      const labelRegion = region === 'CABA' ? 'CABA' : 'Interior'
      mensaje += `💵 CONTADO ${labelRegion}: *$${formatearPrecio(precioContado)}* ⭐\n`
    }
    
    // Precios - 3 cuotas (mismo para todo el país)
    if (p.cuota_3) {
      mensaje += `💳 3 CUOTAS: *$${formatearPrecio(p.cuota_3)}*\n`
    }
    
    // Stock
    if (p.stock) {
      const stockStr = String(p.stock).toUpperCase().trim()
      if (stockStr === 'OK' || !isNaN(Number(stockStr))) {
        mensaje += `📦 ${stockStr === 'OK' ? '✅ Disponible' : `Stock: ${p.stock}`}\n`
      }
    }
    
    mensaje += '\n'
  })

  // Footer
  mensaje += '━━━━━━━━━━━━━━━━━\n\n'
  mensaje += '💰 *Formas de pago:*\n'
  mensaje += '• EFECTIVO/TRANSFERENCIA → Mejor precio ⭐\n'
  mensaje += '• 3 CUOTAS sin interés (10% desc s/fact - 5% c/fact)\n\n'
  mensaje += '✅ *Envío gratis* a todo el país (llevando 2 o más)\n'
  mensaje += '🔧 *Colocación BONIFICADA* (llevando 4)\n'
  mensaje += '🛡️ *5 años* de garantía oficial de fábrica\n\n'
  mensaje += '¿Te interesa alguna opción? 😊'

  return mensaje
}

/**
 * Formatear precio argentino
 */
function formatearPrecio(precio: number | string): string {
  const precioNum = typeof precio === 'string' ? parseFloat(precio) : precio
  if (isNaN(precioNum)) return 'Consultar'
  return Math.round(precioNum).toLocaleString('es-AR')
}
