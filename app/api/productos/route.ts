import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import fs from "fs"
import path from "path"

const LOG_DIR = path.resolve(process.cwd(), "logs")
const LOG_FILE = path.join(LOG_DIR, "productos.log")

function appendLog(line: string) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
    const timestamp = new Date().toISOString()
    fs.appendFileSync(LOG_FILE, `${timestamp} ${line}\n`)
  } catch (e) {
    // best-effort logging — don't throw from logger
    console.error("Failed to write productos log:", e)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(["admin"])

    const body = await request.json()
    // Log incoming body for troubleshooting (avoid logging secrets)
    console.debug("[v0] POST /api/productos body:", JSON.stringify(body))
    appendLog(`[INFO] Incoming POST body: ${JSON.stringify(body)}`)
    const { marca, familia, diseno, modelo, medida, codigo, costo, stock, precio_lista_base, activo } = body

    // Helper: build descripcion_larga using the pattern the product owner requested:
    // Example: "175/60R15 GREENMAX HP010 LINGLONG" => medida + ' ' + modelo + ' ' + diseno + ' ' + marca
    function buildDescripcionLarga() {
      const parts = [medida, modelo, diseno, marca].filter(Boolean).map(String)
      return parts.join(' ').trim() || null
    }

    // Helper: derive price fields from costo using reasonable defaults.
    // Assumptions (can be tuned later):
    // - precio_lista_fact = costo * 1.6 (40% markup)
    // - cuota_N = precio_lista_fact / N
    // - efectivo discounts and mayorista are simple percent adjustments
    function computePricesFromCost(cost: number | null) {
      if (cost === null || cost === undefined || Number.isNaN(Number(cost))) return null
      const c = Number(cost)
      const precio_lista_fact = Number((c * 1.6).toFixed(2))
      const cuota_3 = Number((precio_lista_fact / 3).toFixed(2))
      const cuota_6 = Number((precio_lista_fact / 6).toFixed(2))
      const cuota_12 = Number((precio_lista_fact / 12).toFixed(2))
      const efectivo_bsas_sin_iva = Number((precio_lista_fact * 0.9).toFixed(2))
      const efectivo_int_sin_iva = Number((precio_lista_fact * 0.92).toFixed(2))
      const mayorista_fact = Number((precio_lista_fact * 0.85).toFixed(2))
      const mayorista_sin_fact = Number((precio_lista_fact * 0.8).toFixed(2))

      return {
        precio_lista_fact,
        cuota_3,
        cuota_6,
        cuota_12,
        efectivo_bsas_sin_iva,
        efectivo_int_sin_iva,
        mayorista_fact,
        mayorista_sin_fact,
      }
    }

    // Validate required fields
    if (!marca || !familia || !diseno || !modelo || !medida || !codigo || costo === undefined) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 })
    }

    // Decide target table: prefer 'productos' if it exists, otherwise 'products'
    const exists = await sql`
      SELECT to_regclass('public.productos') AS tbl
    `
    const target = exists[0]?.tbl ? 'productos' : 'products'
    console.debug(`[v0] Target table for insert: ${target}`)
    appendLog(`[INFO] Target table: ${target}`)

    // Check if codigo already exists in the chosen table
    // Note: `products` table stores the code in the `sku` column
    const existing = await (target === 'productos'
      ? sql`SELECT id FROM productos WHERE codigo = ${codigo} LIMIT 1`
      : sql`SELECT id FROM products WHERE sku = ${codigo} LIMIT 1`)

    if (existing.length > 0) {
      appendLog(`[WARN] Codigo exists: ${codigo}`)
      return NextResponse.json({ error: 'El código ya existe' }, { status: 400 })
    }

    // Insert producto into the chosen table
    let result: any
    if (target === 'productos') {
      // For the legacy `productos` table we can store modelo directly
      result = await sql`
        INSERT INTO productos (
          marca, familia, diseno, modelo, medida, codigo, costo, stock, precio_lista_base, descripcion_larga, activo
        ) VALUES (
          ${marca}, ${familia}, ${diseno}, ${modelo}, ${medida}, ${codigo},
          ${costo}, ${stock || 0}, ${precio_lista_base}, ${buildDescripcionLarga()}, ${activo ?? true}
        ) RETURNING *
      `
    } else {
      // Try multiple insert strategies against `products` to be tolerant with different schemas
      try {
        // Variant A: newest schema
        // Map `modelo` into `linea` (we will stop using `linea` later in db migrations if desired).
        // Also compute precio/derivatives from costo when precio_lista_base isn't provided.
        const derived = computePricesFromCost(costo)
        const precioListaToUse = precio_lista_base ?? derived?.precio_lista_fact ?? null

        result = await sql`
          INSERT INTO products (
            sku, marca, familia, linea, diseno_linea, medida, costo,
            precio_lista_fact, cuota_3, cuota_6, cuota_12,
            efectivo_bsas_sin_iva, efectivo_int_sin_iva,
            mayorista_fact, mayorista_sin_fact, moneda, created_at, updated_at, descripcion_larga
          ) VALUES (
            ${codigo}, ${marca}, ${familia}, ${modelo}, ${diseno}, ${medida}, ${costo},
            ${precioListaToUse}, ${derived?.cuota_3 ?? null}, ${derived?.cuota_6 ?? null}, ${derived?.cuota_12 ?? null},
            ${derived?.efectivo_bsas_sin_iva ?? null}, ${derived?.efectivo_int_sin_iva ?? null},
            ${derived?.mayorista_fact ?? null}, ${derived?.mayorista_sin_fact ?? null}, 'ARS', now(), now(), ${buildDescripcionLarga()}
          ) RETURNING *
        `
      } catch (errA: any) {
        appendLog(`[WARN] Variant A failed: ${errA?.message || errA}`)
        try {
          // Variant B: older schema with `diseno` column
          const derivedB = computePricesFromCost(costo)
          const precioListaToUseB = precio_lista_base ?? derivedB?.precio_lista_fact ?? null
          result = await sql`
            INSERT INTO products (
              sku, marca, familia, linea, diseno, medida, costo, precio_lista_fact, cuota_3, cuota_6, cuota_12,
              efectivo_bsas_sin_iva, efectivo_int_sin_iva, mayorista_fact, mayorista_sin_fact, moneda, created_at, updated_at, descripcion_larga
            ) VALUES (
              ${codigo}, ${marca}, ${familia}, ${modelo}, ${diseno}, ${medida}, ${costo}, ${precioListaToUseB}, ${derivedB?.cuota_3 ?? null}, ${derivedB?.cuota_6 ?? null}, ${derivedB?.cuota_12 ?? null},
              ${derivedB?.efectivo_bsas_sin_iva ?? null}, ${derivedB?.efectivo_int_sin_iva ?? null}, ${derivedB?.mayorista_fact ?? null}, ${derivedB?.mayorista_sin_fact ?? null}, 'ARS', now(), now(), ${buildDescripcionLarga()}
            ) RETURNING *
          `
        } catch (errB: any) {
          appendLog(`[WARN] Variant B failed: ${errB?.message || errB}`)
          // Variant C: minimal insert (most conservative)
          const derivedC = computePricesFromCost(costo)
          const precioListaToUseC = precio_lista_base ?? derivedC?.precio_lista_fact ?? null
          result = await sql`
            INSERT INTO products (
              sku, marca, familia, linea, medida, costo, precio_lista_fact, cuota_3, cuota_6, cuota_12, descripcion_larga
            ) VALUES (
              ${codigo}, ${marca}, ${familia}, ${modelo}, ${medida}, ${costo}, ${precioListaToUseC}, ${derivedC?.cuota_3 ?? null}, ${derivedC?.cuota_6 ?? null}, ${derivedC?.cuota_12 ?? null}, ${buildDescripcionLarga()}
            ) RETURNING *
          `
        }
      }
    }

  const productoRow = Array.isArray(result) ? result[0] : result
  appendLog(`[INFO] Producto created in ${target}: ${JSON.stringify(productoRow)}`)
  return NextResponse.json({ producto: productoRow })
  } catch (error: any) {
    // Log full error locally and to file with stack for debugging
    console.error("[v0] Create producto error:", error)
    appendLog(`[ERROR] Create producto error: ${error?.message || error} ${error?.code ? `(code=${error.code})` : ""}`)
    if (error?.stack) appendLog(`[ERROR] Stack: ${error.stack}`)

    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    // In development, include the original error message to help debugging; in production keep generic
    const isDev = process.env.NODE_ENV !== 'production'
    const msg = isDev && error?.message ? String(error.message) : "Error interno del servidor"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
