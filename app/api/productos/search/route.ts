import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * GET /api/productos/search
 * Búsqueda inteligente de productos para agente de n8n
 * 
 * Query params:
 * - q: búsqueda general (busca en sku, marca, medida, descripcion_larga)
 * - medida: filtro exacto por medida (ej: 175/60R15)
 * - marca: filtro por marca
 * - precioMin: precio mínimo
 * - precioMax: precio máximo
 * - limit: cantidad de resultados (default 10, max 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const medida = searchParams.get('medida')
    const marca = searchParams.get('marca')
    const precioMin = searchParams.get('precioMin')
    const precioMax = searchParams.get('precioMax')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    // Detectar tabla disponible
    const exists = await sql`SELECT to_regclass('public.productos') AS tbl`
    const table = exists[0]?.tbl ? 'productos' : 'products'

    let results

    if (table === 'productos') {
      // Query básica para productos (legacy) - simplificada
      results = await sql`
        SELECT 
          codigo AS sku,
          marca,
          familia,
          modelo AS linea,
          diseno AS diseno_linea,
          medida,
          descripcion_larga,
          costo,
          precio_lista_base AS precio_lista_fact,
          stock,
          activo
        FROM productos
        WHERE (${q} IS NULL OR codigo ILIKE ${'%'+(q||'')+'%'} OR marca ILIKE ${'%'+(q||'')+'%'} OR medida ILIKE ${'%'+(q||'')+'%'} OR descripcion_larga ILIKE ${'%'+(q||'')+'%'})
          AND (${medida} IS NULL OR medida ILIKE ${'%'+(medida||'')+'%'})
          AND (${marca} IS NULL OR marca ILIKE ${'%'+(marca||'')+'%'})
          AND (${precioMin} IS NULL OR precio_lista_base >= ${precioMin ? parseFloat(precioMin) : null})
          AND (${precioMax} IS NULL OR precio_lista_base <= ${precioMax ? parseFloat(precioMax) : null})
        ORDER BY marca, medida 
        LIMIT ${limit}
      `
    } else {
      // Query para products table
      results = await sql`
        SELECT 
          sku,
          marca,
          familia,
          linea,
          diseno_linea,
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
        WHERE (${q} IS NULL OR sku ILIKE ${'%'+(q||'')+'%'} OR marca ILIKE ${'%'+(q||'')+'%'} OR medida ILIKE ${'%'+(q||'')+'%'} OR descripcion_larga ILIKE ${'%'+(q||'')+'%'})
          AND (${medida} IS NULL OR medida ILIKE ${'%'+(medida||'')+'%'})
          AND (${marca} IS NULL OR marca ILIKE ${'%'+(marca||'')+'%'})
          AND (${precioMin} IS NULL OR precio_lista_fact >= ${precioMin ? parseFloat(precioMin) : null})
          AND (${precioMax} IS NULL OR precio_lista_fact <= ${precioMax ? parseFloat(precioMax) : null})
        ORDER BY marca, medida 
        LIMIT ${limit}
      `
    }

    return NextResponse.json({ 
      productos: results,
      total: results.length,
      query: { q, medida, marca, precioMin, precioMax, limit }
    })

  } catch (error: any) {
    console.error('[ERROR] Search productos:', error)
    return NextResponse.json(
      { error: 'Error al buscar productos', details: error?.message },
      { status: 500 }
    )
  }
}
