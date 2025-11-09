import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * GET /api/productos/disponibilidad?sku=XXX
 * Verifica disponibilidad y precios de un producto específico
 * Para que el agente pueda responder "¿Tienen el neumático X disponible?"
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sku = searchParams.get('sku')

    if (!sku) {
      return NextResponse.json(
        { error: 'SKU requerido' },
        { status: 400 }
      )
    }

    // Detectar tabla disponible
    const exists = await sql`SELECT to_regclass('public.productos') AS tbl`
    const table = exists[0]?.tbl ? 'productos' : 'products'

    let producto

    if (table === 'productos') {
      const result = await sql`
        SELECT 
          codigo AS sku,
          marca,
          medida,
          descripcion_larga,
          costo,
          precio_lista_base AS precio_lista_fact,
          stock,
          activo AS disponible
        FROM productos
        WHERE codigo = ${sku}
      `
      producto = result[0]
    } else {
      const result = await sql`
        SELECT 
          sku,
          marca,
          medida,
          descripcion_larga,
          costo,
          precio_lista_fact,
          cuota_3,
          cuota_6,
          cuota_12,
          efectivo_bsas_sin_iva,
          efectivo_int_sin_iva,
          mayorista_fact,
          mayorista_sin_fact,
          stock,
          tiene_stock,
          moneda
        FROM products
        WHERE sku = ${sku}
      `
      producto = result[0]
    }

    if (!producto) {
      return NextResponse.json(
        { 
          disponible: false, 
          mensaje: `No encontramos el producto ${sku} en nuestro catálogo.` 
        },
        { status: 404 }
      )
    }

    // Formatear respuesta amigable para el agente
    const stockInfo = producto.tiene_stock 
      ? `En stock ${producto.stock && producto.stock !== 'OK' ? `(${producto.stock} unidades)` : ''}`
      : 'Sin stock actualmente'

    return NextResponse.json({
      disponible: true,
      tiene_stock: producto.tiene_stock,
      stock: producto.stock,
      producto: {
        ...producto,
        // Respuesta en lenguaje natural para el agente
        descripcion_para_cliente: `${producto.marca} ${producto.medida} - ${producto.descripcion_larga}`,
        stock_info: stockInfo,
        precio_contado: producto.efectivo_bsas_sin_iva || producto.precio_lista_fact,
        precio_lista: producto.precio_lista_fact,
        opciones_cuotas: producto.cuota_3 ? {
          cuota_3: producto.cuota_3,
          cuota_6: producto.cuota_6,
          cuota_12: producto.cuota_12
        } : null
      }
    })

  } catch (error: any) {
    console.error('[ERROR] Disponibilidad producto:', error)
    return NextResponse.json(
      { error: 'Error al consultar disponibilidad', details: error?.message },
      { status: 500 }
    )
  }
}
