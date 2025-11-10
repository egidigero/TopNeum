import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let { medida_neumatico, marca, region } = body

    // Validar parámetros requeridos
    if (!medida_neumatico || !region) {
      return NextResponse.json(
        { error: "medida_neumatico y region son requeridos" },
        { status: 400 }
      )
    }

    // Normalizar región (trim + uppercase)
    region = String(region).trim().toUpperCase()
    
    // Validar región
    if (region !== "CABA" && region !== "INTERIOR") {
      return NextResponse.json(
        { error: `region debe ser CABA o INTERIOR (recibido: "${region}")` },
        { status: 400 }
      )
    }

    // Buscar productos en la tabla products
    let productos: any[]

    if (marca) {
      // Con marca específica
      productos = await sql`
        SELECT 
          id,
          sku as codigo,
          marca,
          linea as modelo,
          diseno_linea as diseno,
          medida,
          descripcion_larga,
          precio_lista_fact,
          cuota_3,
          cuota_6,
          cuota_12,
          efectivo_bsas_sin_iva,
          efectivo_int_sin_iva,
          costo,
          stock
        FROM products
        WHERE medida = ${medida_neumatico}
          AND UPPER(marca) = UPPER(${marca})
        ORDER BY precio_lista_fact ASC
        LIMIT 20
      `
    } else {
      // Sin marca, buscar todas
      productos = await sql`
        SELECT 
          id,
          sku as codigo,
          marca,
          linea as modelo,
          diseno_linea as diseno,
          medida,
          descripcion_larga,
          precio_lista_fact,
          cuota_3,
          cuota_6,
          cuota_12,
          efectivo_bsas_sin_iva,
          efectivo_int_sin_iva,
          costo,
          stock
        FROM products
        WHERE medida = ${medida_neumatico}
        ORDER BY precio_lista_fact ASC
        LIMIT 20
      `
    }

    // Si no hay productos, devolver mensaje
    if (productos.length === 0) {
      return NextResponse.json({
        productos: [],
        total_encontrados: 0,
        mensaje_formateado: `❌ No encontramos productos para la medida ${medida_neumatico}${marca ? ` marca ${marca}` : ""}`
      })
    }

    // Formatear productos según región
    const productosFormateados = productos.map((p) => {
      const precioContado = region === "CABA" 
        ? Number(p.efectivo_bsas_sin_iva) 
        : Number(p.efectivo_int_sin_iva)

      return {
        id: String(p.id),
        marca: String(p.marca),
        modelo: String(p.modelo || p.diseno || ''),
        medida: String(p.medida),
        descripcion: String(p.descripcion_larga || `${p.marca} ${p.modelo || p.diseno} ${p.medida}`),
        precio_contado_caba: Math.round(Number(p.efectivo_bsas_sin_iva)),
        precio_contado_interior: Math.round(Number(p.efectivo_int_sin_iva)),
        precio_3_cuotas: Math.round(Number(p.cuota_3)),
        precio_6_cuotas: Math.round(Number(p.cuota_6)),
        precio_12_cuotas: Math.round(Number(p.cuota_12)),
        stock: Number(p.stock) || 0
      }
    })

    // Generar mensaje formateado para WhatsApp
    let mensajeFormateado = `🔍 Encontramos ${productosFormateados.length} opciones para ${medida_neumatico}\n\n`

    productosFormateados.slice(0, 5).forEach((p, i) => {
      const precioContado = region === "CABA" ? p.precio_contado_caba : p.precio_contado_interior
      const totalContado = precioContado * 4
      const total3 = p.precio_3_cuotas * 4
      const total6 = p.precio_6_cuotas * 4
      const total12 = p.precio_12_cuotas * 4

      mensajeFormateado += `━━━━━━━━━━━━━━━━━━━━━━\n`
      mensajeFormateado += `🏆 OPCIÓN ${i + 1} - ${p.marca} ${p.modelo}\n`
      mensajeFormateado += `━━━━━━━━━━━━━━━━━━━━━━\n`
      mensajeFormateado += `📦 Stock: ${p.stock > 0 ? 'Disponible' : 'Consultar'}\n`
      mensajeFormateado += `💳 3 cuotas: $${p.precio_3_cuotas.toLocaleString('es-AR')} (Total: $${total3.toLocaleString('es-AR')})\n`
      mensajeFormateado += `💳 6 cuotas: $${p.precio_6_cuotas.toLocaleString('es-AR')} (Total: $${total6.toLocaleString('es-AR')})\n`
      mensajeFormateado += `💳 12 cuotas: $${p.precio_12_cuotas.toLocaleString('es-AR')} (Total: $${total12.toLocaleString('es-AR')})\n`
      mensajeFormateado += `💵 PROMO CONTADO ${region}: $${precioContado.toLocaleString('es-AR')}\n`
      mensajeFormateado += `   (Total 4 cubiertas: $${totalContado.toLocaleString('es-AR')}) ⭐\n\n`
    })

    mensajeFormateado += `💡 ¿Cuál te interesa? También te puedo dar más info sobre cada marca.`

    return NextResponse.json({
      productos: productosFormateados,
      total_encontrados: productosFormateados.length,
      mensaje_formateado: mensajeFormateado,
      region
    })

  } catch (error: any) {
    console.error("[buscar_productos] Error:", error)
    return NextResponse.json(
      { 
        error: "Error al buscar productos",
        detalle: error?.message || String(error)
      },
      { status: 500 }
    )
  }
}
