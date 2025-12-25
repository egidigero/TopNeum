import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[buscar_productos] Body recibido:", JSON.stringify(body))
    
    let { medida_neumatico, marca, region, telefono_whatsapp } = body

    // Si viene teléfono, detectar región automáticamente
    if (telefono_whatsapp && !region) {
      // Normalizar teléfono
      let telefono = String(telefono_whatsapp).replace(/[\s\-()]/g, '')
      if (!telefono.startsWith('+')) {
        if (telefono.startsWith('54')) {
          telefono = '+' + telefono
        } else {
          telefono = '+54' + telefono
        }
      }
      
      // Detectar región: 54911 o 5411 o +54911 o +5411 = CABA, resto = INTERIOR
      region = (telefono.startsWith('54911') || telefono.startsWith('5411') ||
                telefono.startsWith('+54911') || telefono.startsWith('+5411')) 
        ? 'CABA' 
        : 'INTERIOR'
      
      console.log("[buscar_productos] Región auto-detectada desde teléfono:", region)
    }

    // Normalizar medida (remover espacios antes de R)
    if (medida_neumatico) {
      medida_neumatico = String(medida_neumatico)
        .trim()
        .replace(/\s+R/gi, 'R') // "185/60 R15" -> "185/60R15"
        .replace(/\s+/g, '') // Remover otros espacios
        .toUpperCase()
    }

    // Normalizar marca
    if (marca) {
      marca = String(marca).trim()
      
      // Corregir typos comunes
      const typoMap: Record<string, string> = {
        'HANGKOOK': 'Hankook',
        'HANKOOK': 'Hankook',
        'MICHELIN': 'Michelin',
        'BRIDGESTONE': 'Bridgestone',
        'PIRELLI': 'Pirelli',
        'GOODYEAR': 'Goodyear',
        'FIRESTONE': 'Firestone',
        'FATE': 'Fate'
      }
      
      const marcaUpper = marca.toUpperCase()
      if (typoMap[marcaUpper]) {
        marca = typoMap[marcaUpper]
      }
    }

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

    console.log("[buscar_productos] Buscando:", { medida_neumatico, marca, region })

    // Buscar productos en la tabla products
    let productos: any[]

    if (marca) {
      // Con marca específica
      productos = await sql`
        SELECT 
          id,
          sku as codigo,
          marca,
          familia,
          diseno,
          medida,
          descripcion_larga,
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
          AND tiene_stock = true
        ORDER BY cuota_3 ASC
        LIMIT 20
      `
    } else {
      // Sin marca, buscar todas
      productos = await sql`
        SELECT 
          id,
          sku as codigo,
          marca,
          familia,
          diseno,
          medida,
          descripcion_larga,
          cuota_3,
          cuota_6,
          cuota_12,
          efectivo_bsas_sin_iva,
          efectivo_int_sin_iva,
          costo,
          stock
        FROM products
        WHERE medida = ${medida_neumatico}
          AND tiene_stock = true
        ORDER BY cuota_3 ASC
        LIMIT 20
      `
    }

    // Filtrar productos con stock (excluir stock 0 o vacío)
    productos = productos.filter(p => {
      const stock = String(p.stock || '').trim().toUpperCase()
      return stock !== '' && stock !== '0' && stock !== 'NULL'
    })

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

      // Convertir stock (puede ser número, "OK", o vacío)
      let stockNumerico = 0
      if (p.stock) {
        const stockStr = String(p.stock).trim().toUpperCase()
        if (stockStr === 'OK') {
          stockNumerico = 999 // Consideramos OK como disponible
        } else if (!isNaN(Number(stockStr))) {
          stockNumerico = Number(stockStr)
        }
      }

      return {
        id: String(p.id),
        marca: String(p.marca),
        familia: String(p.familia || ''),
        diseno: String(p.diseno || ''),
        medida: String(p.medida),
        descripcion: String(p.descripcion_larga || `${p.marca} ${p.familia} ${p.medida}`),
        precio_contado_caba: Math.round(Number(p.efectivo_bsas_sin_iva)),
        precio_contado_interior: Math.round(Number(p.efectivo_int_sin_iva)),
        precio_3_cuotas: Math.round(Number(p.cuota_3)),
        precio_6_cuotas: Math.round(Number(p.cuota_6)),
        precio_12_cuotas: Math.round(Number(p.cuota_12)),
        stock: stockNumerico
      }
    })

    // Generar mensaje formateado para WhatsApp
    let mensajeFormateado = `Claro! Para la medida ${medida_neumatico} te puedo ofrecer las siguientes opciones:\n\n`

    productosFormateados.slice(0, 5).forEach((p, i) => {
      const precioContado = region === "CABA" ? p.precio_contado_caba : p.precio_contado_interior
      const titulo = `${p.medida} ${p.familia}${p.diseno ? ' ' + p.diseno : ''} ${p.marca.toUpperCase()}`
      
      mensajeFormateado += `**${titulo}**\n\n`
      mensajeFormateado += `- 3 CUOTAS SIN INTERÉS: $${p.precio_3_cuotas.toLocaleString('es-AR')}\n`
      mensajeFormateado += `- PROMO CONTADO: $${precioContado.toLocaleString('es-AR')}\n\n`
    })

    mensajeFormateado += `✅ Todos incluyen envío gratis a todo el país (llevando 2 o más).\n`
    mensajeFormateado += `� Consultá por 6 y 12 cuotas.\n`
    mensajeFormateado += `�️ 5 años de garantía oficial de fábrica.`
    return NextResponse.json({
      productos: productosFormateados,
      total_encontrados: productosFormateados.length,
      mensaje_formateado: mensajeFormateado,
      region
    })

  } catch (error: any) {
    console.error("[buscar_productos] Error completo:", error)
    console.error("[buscar_productos] Error stack:", error?.stack)
    return NextResponse.json(
      { 
        error: "Error al buscar productos",
        detalle: error?.message || String(error),
        tipo: error?.constructor?.name
      },
      { status: 500 }
    )
  }
}
