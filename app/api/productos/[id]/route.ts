import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireRole } from "@/lib/auth"

/**
 * GET /api/productos/[id]
 * Obtiene un producto por ID para editar
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    // Detectar tabla disponible
    const exists = await sql`SELECT to_regclass('public.productos') AS tbl`
    const table = exists[0]?.tbl ? 'productos' : 'products'

    let producto

    if (table === 'productos') {
      const result = await sql`SELECT * FROM productos WHERE id = ${id}`
      producto = result[0]
    } else {
      const result = await sql`SELECT * FROM products WHERE id = ${id}`
      producto = result[0]
    }

    if (!producto) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ producto })
  } catch (error: any) {
    console.error('[ERROR] Get producto:', error)
    return NextResponse.json(
      { error: 'Error al obtener producto', details: error?.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/productos/[id]
 * Actualiza un producto por ID
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["admin"])

    const body = await request.json()
    const {
      sku,
      marca,
      familia,
      diseno,
      medida,
      costo,
      cuota_3,
      cuota_6,
      cuota_12,
      efectivo_bsas_sin_iva,
      efectivo_int_sin_iva,
      mayorista_fact,
      mayorista_sin_fact,
      stock,
      descripcion_larga
    } = body

    // Detectar tabla disponible
    const exists = await sql`SELECT to_regclass('public.productos') AS tbl`
    const table = exists[0]?.tbl ? 'productos' : 'products'

    let result

    if (table === 'productos') {
      // Actualizar tabla productos (legacy)
      result = await sql`
        UPDATE productos
        SET
          codigo = ${sku},
          marca = ${marca},
          familia = ${familia},
          diseno = ${diseno},
          medida = ${medida},
          costo = ${costo},
          stock = ${stock},
          descripcion_larga = ${descripcion_larga},
          updated_at = now()
        WHERE id = ${params.id}
        RETURNING *
      `
    } else {
      // Actualizar tabla products (nueva estructura)
      result = await sql`
        UPDATE products
        SET
          sku = ${sku},
          marca = ${marca},
          familia = ${familia},
          diseno = ${diseno},
          medida = ${medida},
          costo = ${costo},
          cuota_3 = ${cuota_3},
          cuota_6 = ${cuota_6},
          cuota_12 = ${cuota_12},
          efectivo_bsas_sin_iva = ${efectivo_bsas_sin_iva},
          efectivo_int_sin_iva = ${efectivo_int_sin_iva},
          mayorista_fact = ${mayorista_fact},
          mayorista_sin_fact = ${mayorista_sin_fact},
          stock = ${stock},
          descripcion_larga = ${descripcion_larga},
          updated_at = now()
        WHERE id = ${params.id}
        RETURNING *
      `
    }

    if (result.length === 0) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ producto: result[0] })
  } catch (error: any) {
    console.error("[ERROR] Update producto:", error)

    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

/**
 * DELETE /api/productos/[id]
 * Elimina un producto por ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Solo admins pueden eliminar
    const user = await requireRole(["admin"])
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    // Detectar tabla disponible
    const exists = await sql`SELECT to_regclass('public.productos') AS tbl`
    const table = exists[0]?.tbl ? 'productos' : 'products'

    let result

    if (table === 'productos') {
      // Eliminar de tabla productos (legacy)
      result = await sql`
        DELETE FROM productos
        WHERE id = ${id}
        RETURNING codigo, marca, medida
      `
    } else {
      // Eliminar de tabla products
      result = await sql`
        DELETE FROM products
        WHERE id = ${id}
        RETURNING sku, marca, medida
      `
    }

    if (result.length === 0) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      producto: result[0],
      mensaje: `Producto eliminado`
    })
  } catch (error: any) {
    console.error('[ERROR] Delete producto:', error)
    return NextResponse.json(
      { error: 'Error al eliminar producto', details: error?.message },
      { status: 500 }
    )
  }
}

