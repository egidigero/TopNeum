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

// Parser que mantiene los headers originales (sin lowercase ni replace)
function parseCSVWithOriginalHeaders(text: string) {
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

  if (parsed.length === 0) return { headers: [], rows: [] }
  
  const headers = parsed[0] // Mantener headers originales
  const dataRows: Record<string, string>[] = []
  
  for (let i = 1; i < parsed.length; i++) {
    const row = parsed[i]
    if (row.length === 1 && row[0] === '') continue // skip empty
    const obj: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] ?? ''
    }
    dataRows.push(obj)
  }
  
  return { headers, rows: dataRows }
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
    let mapping: Record<string, string | null> = {}
    
    if (contentType.includes('text/csv') || contentType.includes('application/csv')) {
      text = await request.text()
    } else if (contentType.includes('application/json')) {
      // allow JSON with { csv: "...", mapping: {...} }
      const body = await request.json()
      text = body.csv || ''
      mapping = body.mapping || {}
    } else {
      // Accept raw body as text
      text = await request.text()
    }

    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'Empty CSV body' }, { status: 400 })
    }

    // Parse CSV primero para obtener las filas con headers originales
    const parsedData = parseCSVWithOriginalHeaders(text)
    appendLog(`[INFO] Import CSV rows parsed: ${parsedData.rows.length}`)
    appendLog(`[INFO] CSV headers detected (${parsedData.headers.length}): ${parsedData.headers.join(', ')}`)
    
    if (Object.keys(mapping).length > 0) {
      appendLog(`[INFO] Using custom mapping: ${JSON.stringify(mapping)}`)
    }

    // expected headers (lowercased): sku,codigo,marca,familia,modelo,diseno,medida,costo,stock,precio_lista_base,activo
    // We'll accept either 'sku' or 'codigo' for the product code.
    const results: { ok: number; updated: number; errors: Array<{ row: number; error: string }> } = { ok: 0, updated: 0, errors: [] }

    // Detect target table (prefer products)
    const exists = await sql`SELECT to_regclass('public.productos') AS tbl`
    const target = exists[0]?.tbl ? 'productos' : 'products'
    appendLog(`[INFO] CSV import target table: ${target}`)

    // Helper para obtener valor usando el mapping
    const getMappedValue = (r: Record<string, string>, expectedField: string): string => {
      // Si hay mapping y el campo está mapeado, usar esa columna
      if (mapping[expectedField]) {
        return (r[mapping[expectedField]!] || '').trim()
      }
      
      // Fallback: buscar por varios alias del campo
      const aliases: Record<string, string[]> = {
        'SKU': ['sku', 'SKU', 'codigo', 'CODIGO'],
        'MARCA': ['marca', 'MARCA', 'brand'],
        'FAMILIA': ['familia', 'FAMILIA', 'family'],
        'DISEÑO': ['diseño', 'diseno', 'DISEÑO', 'DISENO', 'design'],
        'MEDIDA': ['medida', 'MEDIDA', 'size'],
        'INDICE': ['indice', 'INDICE', 'Indice', 'indice_de_carga', 'Indice de carga', 'index'],
        'DESCRIPCION LARGA': ['descripcion_larga', 'DESCRIPCION LARGA', 'descripcion', 'description'],
        'COSTO': ['costo', 'COSTO', 'cost'],
        '3 CUOTAS': ['3_cuotas', '3 CUOTAS', 'cuota_3'],
        '6 CUOTAS': ['6_cuotas', '6 CUOTAS', 'cuota_6'],
        '12 CUOTAS': ['12_cuotas', '12 CUOTAS', 'cuota_12'],
        'EFECTIVO BSAS': ['efectivo_bsas', 'EFECTIVO BSAS', 'efectivo_bsas_sin_iva'],
        'EFECTIVO INT': ['efectivo_int', 'EFECTIVO INT', 'efectivo_int_sin_iva'],
        'FACT MAYORISTA': ['fact_mayorista', 'FACT MAYORISTA', 'mayorista_fact'],
        'SIN FACT MAYOR': ['sin_fact_mayor', 'SIN FACT MAYOR', 'mayorista_sin_fact'],
        'STOCK': ['stock', 'STOCK'],
      }
      
      const fieldAliases = aliases[expectedField] || []
      for (const alias of fieldAliases) {
        if (r[alias] !== undefined) {
          return (r[alias] || '').trim()
        }
      }
      
      return ''
    }

    let rowIndex = 0
    for (const r of parsedData.rows) {
      rowIndex++
      let codigo = ''
      try {
        codigo = getMappedValue(r, 'SKU')
        const marca = getMappedValue(r, 'MARCA')
        const familia = getMappedValue(r, 'FAMILIA')
        const diseno = getMappedValue(r, 'DISEÑO')
        const medida = getMappedValue(r, 'MEDIDA')
        const indice = getMappedValue(r, 'INDICE')
        
        const descripcionLarga = getMappedValue(r, 'DESCRIPCION LARGA')
        const stock = getMappedValue(r, 'STOCK')
        
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

        const costo = limpiarPrecio(getMappedValue(r, 'COSTO'))
        const activo = r['activo'] ? (r['activo'].toLowerCase() === 'true' || r['activo'] === '1') : true

        // Read price fields directly from CSV using mapping
        const cuota3 = limpiarPrecio(getMappedValue(r, '3 CUOTAS'))
        const cuota6 = limpiarPrecio(getMappedValue(r, '6 CUOTAS'))
        const cuota12 = limpiarPrecio(getMappedValue(r, '12 CUOTAS'))
        const efectivoBsas = limpiarPrecio(getMappedValue(r, 'EFECTIVO BSAS'))
        const efectivoInt = limpiarPrecio(getMappedValue(r, 'EFECTIVO INT'))
        const mayoristaFact = limpiarPrecio(getMappedValue(r, 'FACT MAYORISTA'))
        const mayoristaSinFact = limpiarPrecio(getMappedValue(r, 'SIN FACT MAYOR'))

        // Validaciones con fallbacks inteligentes
        if (!codigo || !marca || !medida) {
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
          const descripcion_larga_parts = [medida, indice, diseno, marca].filter(Boolean)
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
              ${codigo}, ${marca}, ${familiaFinal}, ${diseno}, ${medida}, ${indice}, ${costo}, 
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
