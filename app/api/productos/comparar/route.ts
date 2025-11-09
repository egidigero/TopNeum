import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * GET /api/productos/comparar?skus=SKU1,SKU2,SKU3
 * Compara múltiples productos lado a lado
 * Útil cuando el agente necesita explicar diferencias entre opciones
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const skusParam = searchParams.get('skus')

    if (!skusParam) {
      return NextResponse.json(
        { error: 'Parámetro skus requerido (ej: ?skus=SKU1,SKU2)' },
        { status: 400 }
      )
    }

    const skus = skusParam.split(',').map(s => s.trim()).filter(Boolean)

    if (skus.length < 2 || skus.length > 5) {
      return NextResponse.json(
        { error: 'Proporciona entre 2 y 5 SKUs para comparar' },
        { status: 400 }
      )
    }

    // Detectar tabla disponible
    const exists = await sql`SELECT to_regclass('public.productos') AS tbl`
    const table = exists[0]?.tbl ? 'productos' : 'products'

    let productos

    if (table === 'productos') {
      productos = await sql`
        SELECT 
          codigo AS sku,
          marca,
          familia,
          medida,
          descripcion_larga,
          costo,
          precio_lista_base AS precio_lista_fact,
          stock,
          activo
        FROM productos
        WHERE codigo = ANY(${skus})
      `
    } else {
      productos = await sql`
        SELECT 
          sku,
          marca,
          familia,
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
          moneda
        FROM products
        WHERE sku = ANY(${skus})
      `
    }

    if (productos.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron productos con los SKUs proporcionados' },
        { status: 404 }
      )
    }

    // Calcular diferencias de precio
    const precios = productos.map(p => p.precio_lista_fact || 0)
    const precioMin = Math.min(...precios)
    const precioMax = Math.max(...precios)
    const diferenciaMaxima = precioMax - precioMin

    // Generar resumen de comparación
    const resumen = {
      cantidad_productos: productos.length,
      rango_precios: {
        minimo: precioMin,
        maximo: precioMax,
        diferencia: diferenciaMaxima
      },
      recomendacion: diferenciaMaxima === 0 
        ? "Todos los productos tienen el mismo precio."
        : `La diferencia de precio es de $${diferenciaMaxima.toFixed(2)}. El ${productos.find(p => p.precio_lista_fact === precioMin)?.marca} ${productos.find(p => p.precio_lista_fact === precioMin)?.medida} es la opción más económica.`
    }

    return NextResponse.json({
      productos,
      resumen,
      comparacion: productos.map(p => ({
        sku: p.sku,
        descripcion: `${p.marca} ${p.medida}`,
        precio_lista: p.precio_lista_fact,
        precio_efectivo: p.efectivo_bsas_sin_iva || p.precio_lista_fact,
        ahorro_vs_maximo: precioMax - (p.precio_lista_fact || 0)
      }))
    })

  } catch (error: any) {
    console.error('[ERROR] Comparar productos:', error)
    return NextResponse.json(
      { error: 'Error al comparar productos', details: error?.message },
      { status: 500 }
    )
  }
}
