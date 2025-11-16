import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * POST /api/tools/buscar_productos
 * 
 * Busca productos en el catálogo según medida, marca (opcional) y región.
 * Esta API es usada por n8n para que el agente de IA busque productos.
 * 
 * Body:
 * {
 *   "medida_neumatico": "205/55R16",     // Requerido
 *   "marca": "Pirelli",                  // Opcional
 *   "region": "CABA" | "INTERIOR"        // Requerido
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "productos": [...],
 *   "cantidad_total": 5,
 *   "mensaje_formateado": "..." // Mensaje listo para enviar al cliente
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { medida_neumatico, marca, region } = body

    // Validaciones
    if (!medida_neumatico) {
      return NextResponse.json(
        { success: false, error: "medida_neumatico es requerido" },
        { status: 400 }
      )
    }

    if (!region || !["CABA", "INTERIOR"].includes(region)) {
      return NextResponse.json(
        { success: false, error: "region debe ser CABA o INTERIOR" },
        { status: 400 }
      )
    }

    // Construir query con filtro opcional de marca
    let query
    if (marca) {
      query = sql`
        SELECT 
          id,
          marca,
          modelo,
          medida,
          precio_3_cuotas,
          precio_6_cuotas,
          precio_12_cuotas,
          precio_contado_caba,
          precio_contado_caba_con_factura,
          precio_contado_interior,
          stock_disponible,
          indice_carga,
          indice_velocidad
        FROM products
        WHERE medida = ${medida_neumatico}
          AND LOWER(marca) = LOWER(${marca})
          AND stock_disponible > 0
        ORDER BY 
          CASE 
            WHEN LOWER(marca) = LOWER(${marca}) THEN 0
            ELSE 1
          END,
          precio_contado_caba ASC
        LIMIT 10
      `
    } else {
      query = sql`
        SELECT 
          id,
          marca,
          modelo,
          medida,
          precio_3_cuotas,
          precio_6_cuotas,
          precio_12_cuotas,
          precio_contado_caba,
          precio_contado_caba_con_factura,
          precio_contado_interior,
          stock_disponible,
          indice_carga,
          indice_velocidad
        FROM products
        WHERE medida = ${medida_neumatico}
          AND stock_disponible > 0
        ORDER BY precio_contado_caba ASC
        LIMIT 10
      `
    }

    const productos = await query

    // Si no hay productos, devolver mensaje apropiado
    if (productos.length === 0) {
      return NextResponse.json({
        success: true,
        productos: [],
        cantidad_total: 0,
        mensaje_formateado: `No encontramos productos con medida ${medida_neumatico} ${marca ? `de marca ${marca}` : ""} en stock.\n¿Me confirmás la medida? A veces hay pequeñas variaciones.`
      })
    }

    // Formatear productos para respuesta
    const productosFormateados = productos.map((p: any) => ({
      id: p.id,
      marca: p.marca,
      modelo: p.modelo,
      medida: p.medida,
      precio_unitario: region === "CABA" ? Number(p.precio_contado_caba) : Number(p.precio_contado_interior),
      precio_3_cuotas: Number(p.precio_3_cuotas),
      precio_6_cuotas: Number(p.precio_6_cuotas),
      precio_12_cuotas: Number(p.precio_12_cuotas),
      precio_contado_caba: Number(p.precio_contado_caba),
      precio_contado_caba_con_factura: Number(p.precio_contado_caba_con_factura),
      precio_contado_interior: Number(p.precio_contado_interior),
      stock: Number(p.stock_disponible),
      indice_carga: p.indice_carga,
      indice_velocidad: p.indice_velocidad
    }))

    // Generar mensaje formateado para WhatsApp
    const mensajeFormateado = generarMensajeWhatsApp(productosFormateados, medida_neumatico, region)

    return NextResponse.json({
      success: true,
      productos: productosFormateados,
      cantidad_total: productosFormateados.length,
      mensaje_formateado: mensajeFormateado
    })

  } catch (error) {
    console.error("Error en buscar_productos:", error)
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

/**
 * Genera mensaje formateado para WhatsApp con los productos encontrados
 */
function generarMensajeWhatsApp(productos: any[], medida: string, region: string): string {
  const cantidad = productos.length
  const limite = Math.min(cantidad, 5) // Mostrar máximo 5 productos

  let mensaje = `Claro! Para la medida ${medida} te puedo ofrecer las siguientes opciones:\n`

  for (let i = 0; i < limite; i++) {
    const p = productos[i]
    
    mensaje += `*${medida} ${p.modelo} ${p.marca}*\n`
    
    // Precios
    const precio3Cuotas = p.precio_3_cuotas * 4
    const precioContado = region === "CABA" ? p.precio_contado_caba : p.precio_contado_interior
    const totalContado = precioContado * 4
    
    mensaje += `- 3 CUOTAS SIN INTERÉS: $${precio3Cuotas.toLocaleString('es-AR')}\n`
    mensaje += `- PROMO CONTADO: $${totalContado.toLocaleString('es-AR')}\n`
  }

  mensaje += `✅ Todos incluyen envío gratis a todo el país (llevando 2 o más).\n`
  mensaje += `💳 Consultá por 6 y 12 cuotas.\n`
  mensaje += `🛞 5 años de garantía oficial de fábrica.`

  return mensaje
}
