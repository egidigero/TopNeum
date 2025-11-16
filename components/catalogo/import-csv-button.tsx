"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"

const EXPECTED_FIELDS = [
  "SKU",
  "MARCA",
  "FAMILIA",
  "DISEÑO",
  "MEDIDA",
  "INDICE",
  "DESCRIPCION LARGA",
  "COSTO",
  "3 CUOTAS",
  "6 CUOTAS",
  "12 CUOTAS",
  "EFECTIVO BSAS",
  "EFECTIVO INT",
  "FACT MAYORISTA",
  "SIN FACT MAYOR",
  "STOCK",
]

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
  const headers = parsed[0].map(h => h.trim())
  const rowsOut = parsed.slice(1).map(r => r)
  return { headers, rows: rowsOut, delimiter }
}

export function ImportCsvButton({ userRole }: { userRole?: string | null }) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [rawText, setRawText] = React.useState<string | null>(null)
  const [headers, setHeaders] = React.useState<string[]>([])
  const [rows, setRows] = React.useState<string[][]>([])
  const [mapping, setMapping] = React.useState<Record<string, string | null>>({})
  const [delimiter, setDelimiter] = React.useState<string>(',')
  const [resultDialogOpen, setResultDialogOpen] = React.useState(false)
  const [importResult, setImportResult] = React.useState<{
    success: boolean
    exitosos: number
    actualizados: number
    errores: number
    total: number
    detalleErrores: any[]
  } | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const handleClick = () => {
    // Open modal first to show example
    setOpen(true)
  }

  const handleSelectFile = () => {
    inputRef.current?.click()
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const text = await file.text()
      const parsed = parseCSV(text)
      setRawText(text)
      setHeaders(parsed.headers)
      setRows(parsed.rows.slice(0, 10))
      setDelimiter(parsed.delimiter || ',')

      // build default mapping heuristics
      const map: Record<string, string | null> = {}
      const lowerHeaders = parsed.headers.map(h => h.toLowerCase())
      
      for (const f of EXPECTED_FIELDS) {
        const lowerField = f.toLowerCase()
        
        // 1. Buscar coincidencia exacta (case insensitive)
        const exactIndex = lowerHeaders.indexOf(lowerField)
        if (exactIndex !== -1) {
          map[f] = parsed.headers[exactIndex]
          continue
        }
        
        // 2. Buscar por alias/variantes conocidas
        const aliases: Record<string, string[]> = {
          'SKU': ['codigo', 'sku', 'code'],
          'MARCA': ['marca', 'brand'],
          'FAMILIA': ['familia', 'family', 'categoria'],
          'DISEÑO': ['diseño', 'diseno', 'diseï¿½o', 'design', 'diseno_linea'],
          'MEDIDA': ['medida', 'size', 'dimension'],
          'INDICE': ['indice', 'indice de carga', 'index', 'load_index'],
          'DESCRIPCION LARGA': ['descripcion_larga', 'descripcion larga', 'descripcion', 'description'],
          'COSTO': ['costo', 'cost', 'precio_costo'],
          '3 CUOTAS': ['3_cuotas', '3 cuotas', 'cuota_3', 'cuota3'],
          '6 CUOTAS': ['6_cuotas', '6 cuotas', 'cuota_6', 'cuota6'],
          '12 CUOTAS': ['12_cuotas', '12 cuotas', 'cuota_12', 'cuota12'],
          'EFECTIVO BSAS': ['efectivo_bsas', 'efectivo bsas', 'efectivo_bsas_sin_iva'],
          'EFECTIVO INT': ['efectivo_int', 'efectivo int', 'efectivo_int_sin_iva'],
          'FACT MAYORISTA': ['fact_mayorista', 'fact mayorista', 'mayorista_fact', 'mayorista_con_factura'],
          'SIN FACT MAYOR': ['sin_fact_mayor', 'sin fact mayor', 'mayorista_sin_fact', 'mayorista_sin_factura'],
          'STOCK': ['stock', 'cantidad', 'disponible'],
        }
        
        const fieldAliases = aliases[f] || [lowerField]
        const aliasMatch = lowerHeaders.findIndex(h => 
          fieldAliases.some(alias => h === alias || h.includes(alias))
        )
        
        if (aliasMatch !== -1) {
          map[f] = parsed.headers[aliasMatch]
          continue
        }
        
        // 3. Si no encuentra nada, dejarlo null
        map[f] = null
      }
      setMapping(map)
      // Don't auto-open modal here anymore since we open it on button click
    } catch (err: any) {
      toast({ title: 'Failed to read CSV', description: String(err?.message || err) })
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleMappingChange = (field: string, header: string | null) => {
    setMapping(prev => ({ ...prev, [field]: header }))
  }

  const handleConfirm = async () => {
    if (!rawText) return
    setLoading(true)
    try {
      // send JSON with csv so server can accept mapping if needed later
      const res = await fetch('/api/productos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: rawText, mapping }),
      })
      const data = await res.json()
      
      // Cerrar modal de importación
      setOpen(false)
      
      if (!res.ok) {
        // Mostrar error en modal de resultado
        setImportResult({
          success: false,
          exitosos: 0,
          actualizados: 0,
          errores: 1,
          total: 0,
          detalleErrores: [{ error: data?.error || 'Error importing CSV' }]
        })
        setResultDialogOpen(true)
      } else {
        const summary = data?.summary
        if (summary) {
          const { total, exitosos, actualizados, errores, detalleErrores } = summary
          
          // Mostrar resultado en modal
          setImportResult({
            success: errores === 0,
            exitosos,
            actualizados: actualizados || 0,
            errores,
            total,
            detalleErrores: detalleErrores || []
          })
          setResultDialogOpen(true)
          
          // Refrescar si hubo éxitos
          if (exitosos > 0 || (actualizados && actualizados > 0)) {
            router.refresh()
          }
        } else {
          // Fallback por si no hay summary
          setImportResult({
            success: true,
            exitosos: 0,
            actualizados: 0,
            errores: 0,
            total: 0,
            detalleErrores: []
          })
          setResultDialogOpen(true)
          router.refresh()
        }
      }
    } catch (err: any) {
      setOpen(false)
      setImportResult({
        success: false,
        exitosos: 0,
        actualizados: 0,
        errores: 1,
        total: 0,
        detalleErrores: [{ error: err?.message || 'No se pudo conectar con el servidor' }]
      })
      setResultDialogOpen(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFile}
        className="hidden"
      />

      <Button variant="outline" size="sm" onClick={handleClick} disabled={loading} title="Importar CSV">
        <Upload className="mr-2 h-4 w-4" />
        Importar CSV
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-white border-slate-200">
          <DialogTitle className="text-slate-900">Importar CSV — Previsualizar y mapear columnas</DialogTitle>
          <div className="mt-4">
            <div className="mb-4 p-3 bg-slate-50 rounded border border-slate-200">
              <p className="text-sm font-medium mb-2 text-slate-900">📋 Formato CSV esperado:</p>
              
              {/* Encabezados */}
              <div className="mb-3">
                <p className="text-xs font-medium text-green-700 mb-1">Encabezados (primera línea):</p>
                <div className="bg-white p-2 rounded overflow-x-auto border border-slate-200">
                  <div className="flex gap-1 flex-wrap text-[10px] font-mono">
                    {EXPECTED_FIELDS.map((field, i) => (
                      <span key={field} className="bg-slate-100 px-2 py-1 rounded text-slate-700 whitespace-nowrap border border-slate-300">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ejemplo de datos */}
              <div className="mb-3">
                <p className="text-xs font-medium text-blue-700 mb-1">Ejemplo de fila 1:</p>
                <div className="bg-white p-2 rounded overflow-x-auto border border-slate-200">
                  <table className="text-[10px] font-mono">
                    <tbody>
                      <tr>
                        <td className="text-slate-700 font-medium pr-2">SKU:</td>
                        <td className="text-slate-600">001-100-R2420</td>
                      </tr>
                      <tr>
                        <td className="text-slate-700 font-medium pr-2">MARCA:</td>
                        <td className="text-slate-600">Yokohama</td>
                      </tr>
                      <tr>
                        <td className="text-slate-700 font-medium pr-2">FAMILIA:</td>
                        <td className="text-slate-600">BLUEARTH</td>
                      </tr>
                      <tr>
                        <td className="text-slate-700 font-medium pr-2">DISEÑO:</td>
                        <td className="text-slate-600">ES32</td>
                      </tr>
                      <tr>
                        <td className="text-slate-700 font-medium pr-2">MEDIDA:</td>
                        <td className="text-slate-600">175/70R13</td>
                      </tr>
                      <tr>
                        <td className="text-slate-700 font-medium pr-2">INDICE:</td>
                        <td className="text-slate-600">84H</td>
                      </tr>
                      <tr>
                        <td className="text-slate-700 font-medium pr-2">COSTO:</td>
                        <td className="text-slate-600">$ 98.785</td>
                      </tr>
                      <tr>
                        <td className="text-slate-700 font-medium pr-2">STOCK:</td>
                        <td className="text-slate-600">4</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notas importantes */}
              <div className="text-xs space-y-1 text-slate-600">
                <p><strong className="text-slate-900">✓ Campos requeridos:</strong> SKU, MARCA, FAMILIA, MEDIDA, COSTO, precios (3/6/12 CUOTAS, EFECTIVO BSAS/INT, MAYORISTA)</p>
                <p><strong className="text-slate-900">○ Campos opcionales:</strong> DISEÑO, DESCRIPCION LARGA, STOCK</p>
                <p><strong className="text-slate-900">🔢 STOCK:</strong> número (4, 37), "OK", o vacío</p>
                <p><strong className="text-slate-900">💲 Precios:</strong> pueden incluir $, espacios, comas (ej: $ 98.785)</p>
                <p><strong className="text-slate-900">📄 Formato:</strong> el sistema detecta automáticamente si usas coma (,) o punto y coma (;) como separador</p>
              </div>

              {!rawText && (
                <Button onClick={handleSelectFile} className="mt-3 w-full bg-blue-600 hover:bg-blue-700">
                  <Upload className="mr-2 h-4 w-4" />
                  Seleccionar archivo CSV
                </Button>
              )}
            </div>

            {rawText && (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-900">Archivo cargado:</p>
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                      Delimitador: {delimiter === ',' ? 'Coma (,)' : 'Punto y coma (;)'} | {headers.length} columnas | {rows.length} filas
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-600 mb-2">Encabezados detectados:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {headers.map(h => (
                      <span key={h} className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-mono">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

            <div className="mt-6 space-y-6">
              {/* Mapeo de columnas - ARRIBA */}
              <div className="border border-slate-300 rounded-lg p-4 bg-slate-50">
                <h4 className="font-semibold text-base mb-2 text-slate-900 flex items-center gap-2">
                  <span className="text-lg">🔗</span>
                  Mapeo de columnas
                </h4>
                <p className="text-sm text-slate-600 mb-4">Selecciona qué columna del CSV corresponde a cada campo de la base de datos.</p>
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                  {EXPECTED_FIELDS.map(field => (
                    <div key={field} className="flex items-center gap-3 bg-white p-2.5 rounded border border-slate-200 hover:border-blue-300 transition-colors">
                      <label className="w-40 text-sm font-semibold text-slate-700 flex-shrink-0">{field}</label>
                      <select
                        value={mapping[field] ?? ''}
                        onChange={e => handleMappingChange(field, e.target.value || null)}
                        className="flex-1 bg-white text-slate-900 rounded border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">(no provisto)</option>
                        {headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vista previa - ABAJO */}
              <div className="border border-slate-300 rounded-lg p-4 bg-white">
                <h4 className="font-semibold text-base mb-2 text-slate-900 flex items-center gap-2">
                  <span className="text-lg">👁️</span>
                  Vista previa de datos (primeras 5 filas)
                </h4>
                <div className="overflow-auto border border-slate-200 rounded max-h-[300px] bg-white">
                  <table className="w-full text-[10px] font-mono">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr>
                        {headers.slice(0, 5).map(h => (
                          <th key={h} className="px-2 py-1.5 text-left text-slate-700 border-b border-slate-200 font-medium">{h}</th>
                        ))}
                        {headers.length > 5 && (
                          <th className="px-2 py-1.5 text-slate-500">+{headers.length - 5} más</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((r, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          {headers.slice(0, 5).map((_, j) => (
                            <td key={j} className="px-2 py-1.5 text-slate-700 border-b border-slate-100">
                              {r[j]?.length > 20 ? r[j].substring(0, 20) + '...' : r[j] ?? '-'}
                            </td>
                          ))}
                          {headers.length > 5 && (
                            <td className="px-2 py-1.5 text-slate-400 border-b border-slate-100">...</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Mostrando {Math.min(5, rows.length)} de {rows.length} filas. Primeras 5 columnas de {headers.length} totales.
                </p>
              </div>
            </div>
              </>
            )}
          </div>
          <DialogFooter>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} className="border-slate-300 text-slate-700">Cancelar</Button>
              {rawText && (
                <Button onClick={handleConfirm} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                  {loading ? 'Importando...' : 'Confirmar e importar'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de resultado de importación */}
      <AlertDialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <AlertDialogContent className="bg-white border-slate-200 max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              {importResult?.success ? (
                <span className="text-green-600">✅ Importación Exitosa</span>
              ) : (importResult?.exitosos ?? 0) > 0 ? (
                <span className="text-yellow-600">⚠️ Importación Parcial</span>
              ) : (
                <span className="text-red-600">❌ Importación Fallida</span>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-700 space-y-4">
              {importResult && (
                <>
                  <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900">{importResult.total}</div>
                      <div className="text-sm text-slate-600">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{importResult.exitosos}</div>
                      <div className="text-sm text-slate-600">Nuevos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{importResult.actualizados || 0}</div>
                      <div className="text-sm text-slate-600">Actualizados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{importResult.errores}</div>
                      <div className="text-sm text-slate-600">Errores</div>
                    </div>
                  </div>

                  {importResult.errores > 0 && importResult.detalleErrores.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-semibold text-slate-900">Detalles de errores:</div>
                      <div className="max-h-60 overflow-y-auto bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-200">
                        {importResult.detalleErrores.slice(0, 10).map((err: any, idx: number) => (
                          <div key={idx} className="text-sm text-slate-700 border-l-2 border-red-500 pl-3 py-1">
                            {err.error}
                          </div>
                        ))}
                        {importResult.detalleErrores.length > 10 && (
                          <div className="text-sm text-slate-500 italic pt-2">
                            ... y {importResult.detalleErrores.length - 10} errores más
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {importResult.success && (
                    <div className="text-center text-slate-700 py-4">
                      {importResult.exitosos > 0 && importResult.actualizados > 0 && (
                        <p>Se importaron <strong>{importResult.exitosos} productos nuevos</strong> y se actualizaron <strong>{importResult.actualizados} existentes</strong></p>
                      )}
                      {importResult.exitosos > 0 && !importResult.actualizados && (
                        <p>Se importaron <strong>{importResult.exitosos} productos nuevos</strong> correctamente</p>
                      )}
                      {!importResult.exitosos && importResult.actualizados > 0 && (
                        <p>Se actualizaron <strong>{importResult.actualizados} productos existentes</strong></p>
                      )}
                    </div>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setResultDialogOpen(false)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Cerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ImportCsvButton
