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
    console.error("Failed to write productos log:", e)
  }
}

// Minimal CSV parser
function parseCSV(text: string) {
  const rows: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === '\n' && !inQuotes) {
      rows.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur !== '') rows.push(cur)

  const parsed: string[][] = rows.map(r => {
    const cols: string[] = []
    let c = ''
    let q = false
    for (let i = 0; i < r.length; i++) {
      const ch = r[i]
      if (ch === '"') {
        if (q && r[i + 1] === '"') { c += '"'; i++ } else { q = !q }
      } else if (ch === ',' && !q) {
        cols.push(c)
        c = ''
      } else {
        c += ch
      }
    }
    cols.push(c)
    return cols.map(col => col.trim())
  })

  if (parsed.length === 0) return []
  const headers = parsed[0].map(h => h.toLowerCase())
  const out = [] as Record<string, string>[]
  for (let i = 1; i < parsed.length; i++) {
    const row = parsed[i]
    if (row.length === 1 && row[0] === '') continue
    const obj: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] ?? ''
    }
    out.push(obj)
  }
  return out
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(["admin"])

    const contentType = request.headers.get('content-type') || ''
    let text = ''
    if (contentType.includes('text/csv') || contentType.includes('application/csv')) {
      text = await request.text()
    } else if (contentType.includes('application/json')) {
      const body = await request.json()
      text = body.csv || ''
    } else {
      text = await request.text()
    }

    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'Empty CSV body' }, { status: 400 })
    }

    const rows = parseCSV(text)
    appendLog(`[INFO] Ajustes CSV rows parsed: ${rows.length}`)

    // Expected columns: Material (sku/codigo) and "AJUSTE %" or "ajuste" (porcentaje)
    const results: { applied: number; skipped: number; errors: Array<{ row: number; error: string }> } = {
      applied: 0,
      skipped: 0,
      errors: [],
    }

    // Detect target table
    const exists = await sql`SELECT to_regclass('public.productos') AS tbl`
    const target = exists[0]?.tbl ? 'productos' : 'products'
    appendLog(`[INFO] Ajustes target table: ${target}`)

    let rowIndex = 0
    for (const r of rows) {
      rowIndex++
      let material = ''
      try {
        // Try to find sku/codigo from "Material" or "material" or "codigo" column
        material = (r['material'] || r['sku'] || r['codigo'] || '').trim()
        // Try to find adjustment percentage from "AJUSTE %" or "ajuste %" or "ajuste" column
        const ajusteStr = (r['ajuste %'] || r['ajuste'] || r['ajuste%'] || '').trim()

        if (!material) {
          results.errors.push({ row: rowIndex, error: 'SKU: (sin material) - Falta columna Material/sku' })
          continue
        }
        if (!ajusteStr) {
          results.errors.push({ row: rowIndex, error: `SKU: ${material} - Falta columna AJUSTE %` })
          continue
        }

        const ajuste = parseFloat(ajusteStr)
        if (isNaN(ajuste)) {
          results.errors.push({ row: rowIndex, error: `SKU: ${material} - AJUSTE % inválido: ${ajusteStr}` })
          continue
        }

        // Compute multiplicative factor: if ajuste is 10, factor is 1.10 (increase 10%)
        const factor = 1 + ajuste / 100

        if (target === 'productos') {
          // Update precio_lista_base and costo
          const updated = await sql`
            UPDATE productos
            SET 
              costo = ROUND(COALESCE(costo, 0) * ${factor}::numeric, 2),
              precio_lista_base = ROUND(COALESCE(precio_lista_base, 0) * ${factor}::numeric, 2),
              updated_at = now()
            WHERE codigo = ${material}
            RETURNING id
          `
          if (updated.length === 0) {
            results.skipped++
            results.errors.push({ row: rowIndex, error: `SKU: ${material} - Producto no encontrado` })
            appendLog(`[WARN] Ajuste skipped (not found): ${material}`)
          } else {
            results.applied++
          }
        } else {
          // Update all price columns in products AND costo
          const updated = await sql`
            UPDATE products
            SET
              costo = ROUND(COALESCE(costo, 0) * ${factor}::numeric, 2),
              precio_lista_fact = ROUND(COALESCE(precio_lista_fact, 0) * ${factor}::numeric, 2),
              cuota_3 = ROUND(COALESCE(cuota_3, 0) * ${factor}::numeric, 2),
              cuota_6 = ROUND(COALESCE(cuota_6, 0) * ${factor}::numeric, 2),
              cuota_12 = ROUND(COALESCE(cuota_12, 0) * ${factor}::numeric, 2),
              efectivo_bsas_sin_iva = ROUND(COALESCE(efectivo_bsas_sin_iva, 0) * ${factor}::numeric, 2),
              efectivo_int_sin_iva = ROUND(COALESCE(efectivo_int_sin_iva, 0) * ${factor}::numeric, 2),
              mayorista_fact = ROUND(COALESCE(mayorista_fact, 0) * ${factor}::numeric, 2),
              mayorista_sin_fact = ROUND(COALESCE(mayorista_sin_fact, 0) * ${factor}::numeric, 2),
              updated_at = now()
            WHERE sku = ${material}
            RETURNING id
          `
          if (updated.length === 0) {
            results.skipped++
            results.errors.push({ row: rowIndex, error: `SKU: ${material} - Producto no encontrado` })
            appendLog(`[WARN] Ajuste skipped (not found): ${material}`)
          } else {
            results.applied++
          }
        }
      } catch (e: any) {
        const errorMsg = String(e?.message || e)
        appendLog(`[ERROR] Ajuste row ${rowIndex} (SKU: ${material}) failed: ${errorMsg}`)
        results.errors.push({ row: rowIndex, error: `SKU: ${material} - ${errorMsg}` })
      }
    }

    const summary = {
      total: rows.length,
      aplicados: results.applied,
      omitidos: results.skipped,
      errores: results.errors.length,
      detalleErrores: results.errors
    }

    appendLog(`[INFO] Ajustes summary: ${JSON.stringify(summary)}`)
    return NextResponse.json({ summary })
  } catch (error: any) {
    appendLog(`[ERROR] Ajustes fatal: ${error?.message || error}`)
    const isDev = process.env.NODE_ENV !== 'production'
    const msg = isDev && error?.message ? String(error.message) : 'Error interno del servidor'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
