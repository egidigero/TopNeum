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

// Minimal CSV parser that handles quoted fields and commas/semicolons. Returns array of objects using header row.
function parseCSV(text: string) {
  // Detectar el delimitador (coma o punto y coma)
  const firstLine = text.split('\n')[0] || ''
  const commaCount = (firstLine.match(/,/g) || []).length
  const semicolonCount = (firstLine.match(/;/g) || []).length
  const delimiter = semicolonCount > commaCount ? ';' : ','

  const rows: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      // peek next char for escaped quote
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
      } else if (ch === delimiter && !q) {
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
  const headers = parsed[0].map(h => h.toLowerCase().replace(/\s+/g, '_'))
  const out = [] as Record<string, string>[]
  for (let i = 1; i < parsed.length; i++) {
    const row = parsed[i]
    if (row.length === 1 && row[0] === '') continue // skip empty
    const obj: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] ?? ''
    }
    out.push(obj)
  }
  return out
}

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

export async function POST(request: NextRequest) {
  try {
    await requireRole(["admin"])

    const contentType = request.headers.get('content-type') || ''
    let text = ''
    if (contentType.includes('text/csv') || contentType.includes('application/csv')) {
      text = await request.text()
    } else if (contentType.includes('application/json')) {
      // allow JSON with { csv: "..." }
      const body = await request.json()
      text = body.csv || ''
    } else {
      // Accept raw body as text
      text = await request.text()
    }

    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'Empty CSV body' }, { status: 400 })
    }

    const rows = parseCSV(text)
    appendLog(`[INFO] Import CSV rows parsed: ${rows.length}`)
    if (rows.length > 0) {
      const headers = Object.keys(rows[0])
      appendLog(`[INFO] CSV headers detected (${headers.length}): ${headers.join(', ')}`)
    }

    // expected headers (lowercased): sku,codigo,marca,familia,modelo,diseno,medida,costo,stock,precio_lista_base,activo
    // We'll accept either 'sku' or 'codigo' for the product code.
    const results: { ok: number; updated: number; errors: Array<{ row: number; error: string }> } = { ok: 0, updated: 0, errors: [] }

    // Detect target table (prefer products)
    const exists = await sql`SELECT to_regclass('public.productos') AS tbl`
    const target = exists[0]?.tbl ? 'productos' : 'products'
    appendLog(`[INFO] CSV import target table: ${target}`)

    let rowIndex = 0
    for (const r of rows) {
      rowIndex++
      let codigo = ''
      try {
        codigo = (r['sku'] || r['SKU'] || r['codigo'] || '').trim()
        const marca = (r['marca'] || r['MARCA'] || '').trim()
        const familia = (r['familia'] || r['FAMILIA'] || '').trim()
        // diseño puede venir con encoding corrupto de múltiples formas
        const diseno = (
          r['diseño'] || r['diseno'] || r['diseï¿½o'] || 
          r['dise�o'] || r['diseio'] || r['DISEÑO'] || 
          r['DISENO'] || r['diseno_linea'] ||
          // Buscar cualquier key que contenga "dise" (case insensitive)
          Object.keys(r).find(k => k.toLowerCase().includes('dise'))
            ? r[Object.keys(r).find(k => k.toLowerCase().includes('dise'))!]
            : ''
        ).trim()
        const medida = (r['medida'] || r['MEDIDA'] || '').trim()
        
        // Separar medida e índice si vienen juntos (ej: "205/55R16-91H")
        let medidaFinal = medida
        let indice = ''
        
        if (medida.includes('-')) {
          const partes = medida.split('-')
          medidaFinal = partes[0].trim()
          indice = partes[1]?.trim() || ''
        }
        
        const descripcionLarga = (r['descripcion_larga'] || r['descripcion_larga'] || r['DESCRIPCION LARGA'] || '').trim()
        const stock = (r['stock'] || r['STOCK'] || '').trim()
        
        // Helper para limpiar precios: quita "$" y espacios
        // En formato argentino: "$ 98.785" significa 98785 (el punto es separador de miles)
        // Las comas SI son decimales
        const limpiarPrecio = (valor: string | undefined): number | null => {
          if (!valor) return null
          // Quitar $ y espacios
          let limpio = String(valor).replace(/[$\s]/g, '').trim()
          // Quitar puntos (separadores de miles en formato argentino)
          limpio = limpio.replace(/\./g, '')
          // Reemplazar coma por punto (decimal en formato argentino)
          limpio = limpio.replace(/,/g, '.')
          const numero = parseFloat(limpio)
          return isNaN(numero) ? null : numero
        }

        const costo = limpiarPrecio(r['costo'] || r['COSTO'])
        const activo = r['activo'] ? (r['activo'].toLowerCase() === 'true' || r['activo'] === '1') : true

        // Read price fields directly from CSV (no automatic calculation)
        const cuota3 = limpiarPrecio(r['3_cuotas'] || r['cuota_3'] || r['3 CUOTAS'] || r['3 cuotas'])
        const cuota6 = limpiarPrecio(r['6_cuotas'] || r['cuota_6'] || r['6 CUOTAS'] || r['6 cuotas'])
        const cuota12 = limpiarPrecio(r['12_cuotas'] || r['cuota_12'] || r['12 CUOTAS'] || r['12 cuotas'])
        const efectivoBsas = limpiarPrecio(r['efectivo_bsas'] || r['efectivo_bsas_sin_iva'] || r['EFECTIVO BSAS'])
        const efectivoInt = limpiarPrecio(r['efectivo_int'] || r['efectivo_int_sin_iva'] || r['EFECTIVO INT'])
        const mayoristaFact = limpiarPrecio(r['fact_mayorista'] || r['mayorista_fact'] || r['FACT MAYORISTA'])
        const mayoristaSinFact = limpiarPrecio(r['sin_fact_mayor'] || r['mayorista_sin_fact'] || r['SIN FACT MAYOR'])

        // Validaciones con fallbacks inteligentes
        if (!codigo || !marca || !medidaFinal) {
          results.errors.push({ 
            row: rowIndex, 
            error: `SKU: ${codigo || '(sin sku)'} - Faltan campos OBLIGATORIOS: sku, marca, medida` 
          })
          continue
        }

        // Si no hay FAMILIA pero hay DISEÑO, usar DISEÑO como FAMILIA
        let familiaFinal = familia
        if (!familia && diseno) {
          familiaFinal = diseno
          appendLog(`[WARN] Row ${rowIndex} SKU ${codigo}: FAMILIA vacía, usando DISEÑO (${diseno}) como FAMILIA`)
        } else if (!familia && !diseno) {
          results.errors.push({ 
            row: rowIndex, 
            error: `SKU: ${codigo} - Falta FAMILIA (y tampoco hay DISEÑO para usar como fallback)` 
          })
          continue
        }

        // Generar descripcion_larga si no viene en el CSV
        let descripcion_larga = descripcionLarga
        if (!descripcion_larga) {
          const descripcion_larga_parts = [medidaFinal, indice, diseno, marca].filter(Boolean)
          descripcion_larga = descripcion_larga_parts.join(' ')
        }

        if (target === 'productos') {
          // upsert by codigo (tabla legacy)
          const result = await sql`
            INSERT INTO productos (codigo, marca, familia, diseno, medida, costo, stock, descripcion_larga, activo, created_at, updated_at)
            VALUES (${codigo}, ${marca}, ${familiaFinal}, ${diseno}, ${medida}, ${costo}, ${stock}, ${descripcion_larga}, ${activo}, now(), now())
            ON CONFLICT (codigo) DO UPDATE
            SET marca = EXCLUDED.marca, familia = EXCLUDED.familia, diseno = EXCLUDED.diseno, medida = EXCLUDED.medida,
                costo = EXCLUDED.costo, stock = EXCLUDED.stock, descripcion_larga = EXCLUDED.descripcion_larga, activo = EXCLUDED.activo, updated_at = now()
            RETURNING (xmax = 0) as inserted
          `
          // xmax = 0 significa que fue INSERT, xmax > 0 significa UPDATE
          const wasInserted = result[0]?.inserted
          if (wasInserted) {
            results.ok++
          } else {
            results.updated++
          }
        } else {
          // upsert by sku (tabla products - nueva estructura)
          const result = await sql`
            INSERT INTO products (
              sku, marca, familia, diseno, medida, indice, costo, 
              cuota_3, cuota_6, cuota_12,
              efectivo_bsas_sin_iva, efectivo_int_sin_iva, 
              mayorista_fact, mayorista_sin_fact, 
              descripcion_larga, stock, moneda, created_at, updated_at
            )
            VALUES (
              ${codigo}, ${marca}, ${familiaFinal}, ${diseno}, ${medidaFinal}, ${indice}, ${costo}, 
              ${cuota3}, ${cuota6}, ${cuota12},
              ${efectivoBsas}, ${efectivoInt}, 
              ${mayoristaFact}, ${mayoristaSinFact}, 
              ${descripcion_larga}, ${stock}, 'ARS', now(), now()
            )
            ON CONFLICT (sku) DO UPDATE SET
              marca = EXCLUDED.marca, 
              familia = EXCLUDED.familia, 
              diseno = EXCLUDED.diseno, 
              medida = EXCLUDED.medida,
              indice = EXCLUDED.indice,
              costo = EXCLUDED.costo, 
              cuota_3 = EXCLUDED.cuota_3, 
              cuota_6 = EXCLUDED.cuota_6, 
              cuota_12 = EXCLUDED.cuota_12,
              efectivo_bsas_sin_iva = EXCLUDED.efectivo_bsas_sin_iva, 
              efectivo_int_sin_iva = EXCLUDED.efectivo_int_sin_iva,
              mayorista_fact = EXCLUDED.mayorista_fact, 
              mayorista_sin_fact = EXCLUDED.mayorista_sin_fact, 
              descripcion_larga = EXCLUDED.descripcion_larga, 
              stock = EXCLUDED.stock, 
              updated_at = now()
            RETURNING (xmax = 0) as inserted
          `
          // xmax = 0 significa INSERT nuevo, xmax > 0 significa UPDATE de existente
          const wasInserted = result[0]?.inserted
          if (wasInserted) {
            results.ok++
          } else {
            results.updated++
          }
        }

      } catch (e: any) {
        const errorMsg = String(e?.message || e)
        appendLog(`[ERROR] CSV import row ${rowIndex} (SKU: ${codigo}) failed: ${errorMsg}`)
        results.errors.push({ 
          row: rowIndex, 
          error: `SKU: ${codigo} - ${errorMsg}` 
        })
      }
    }

    const summary = {
      total: results.ok + results.updated + results.errors.length,
      exitosos: results.ok,
      actualizados: results.updated,
      errores: results.errors.length,
      detalleErrores: results.errors
    }

    appendLog(`[INFO] CSV import summary: ${JSON.stringify(summary)}`)
    return NextResponse.json({ summary })
  } catch (error: any) {
    appendLog(`[ERROR] CSV import fatal: ${error?.message || error}`)
    const isDev = process.env.NODE_ENV !== 'production'
    const msg = isDev && error?.message ? String(error.message) : 'Error interno del servidor'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
